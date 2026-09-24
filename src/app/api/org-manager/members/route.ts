import { NextResponse, after } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  requireSignedIn, isManagerOf, logManagerAction, recentAddAttempts,
  normalizeEmail, ADD_ATTEMPTS_PER_HOUR,
} from '@/lib/org-manager';
import { notifyOrgManagerAction } from '@/lib/slack';

// 団体長による所属の追加・削除
//   POST  : メールアドレスを入力して、自分の団体に所属を追加する   body { organization_id, email }
//   DELETE: 自分の団体から一般メンバーを外す   ?organization_id=...&profile_id=...
//
// 返すのは「追加した / 既に所属している / そのアドレスのアカウントは無い」だけ。
// 表示名・学部など、アカウントの中身は一切返さない（2026-09 会議の指示）。
//
// 追加そのものは団体長本人のセッションで行う。DB の権限（v20）が
// 「団体長が、一般メンバーとして」だけを許すので、API を通さずに叩かれても
// 団体長に昇格させたり、他の団体に入れたりはできない。

export async function POST(request: Request) {
  try {
    const auth = await requireSignedIn();
    if (auth.error) return auth.error;

    const body = await request.json();
    const orgId = typeof body.organization_id === 'string' ? body.organization_id : '';
    const email = normalizeEmail(body.email);
    if (!orgId) return NextResponse.json({ error: '団体が指定されていません。' }, { status: 400 });
    if (!email) return NextResponse.json({ error: 'メールアドレスの形式が正しくありません。' }, { status: 400 });

    if (!(await isManagerOf(auth.supabase, auth.userId, orgId))) {
      return NextResponse.json({ error: 'この団体の団体長ではありません。' }, { status: 403 });
    }

    // 回数の上限。見つからなかった試行も数える（総当たりでアドレスを探られないように）
    if ((await recentAddAttempts(auth.userId)) >= ADD_ATTEMPTS_PER_HOUR) {
      return NextResponse.json(
        { error: `追加の操作が多すぎます。1時間あたり${ADD_ATTEMPTS_PER_HOUR}回までです。しばらくしてからお試しください。` },
        { status: 429 }
      );
    }

    // メールアドレスから利用者を探す。関数は service_role からしか呼べない（v20）
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'サーバーの設定が不足しているため、追加できません。' }, { status: 500 });
    }
    const { data: profileId, error: lookupError } = await admin.rpc('profile_id_by_email', { p_email: email });
    if (lookupError) {
      console.error('OrgManager: lookup failed', lookupError);
      return NextResponse.json({ error: '確認に失敗しました。' }, { status: 500 });
    }

    if (!profileId) {
      await logManagerAction({ actorId: auth.userId, organizationId: orgId, action: 'add_member_not_found', targetEmail: email });
      return NextResponse.json({
        result: 'not_found',
        message: 'このメールアドレスのアカウントは見つかりませんでした。先にアプリへの登録（ログイン）をしてもらってください。',
      });
    }

    const { count: already } = await auth.supabase
      .from('profile_organizations')
      .select('profile_id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('profile_id', profileId);
    if ((already ?? 0) > 0) {
      await logManagerAction({ actorId: auth.userId, organizationId: orgId, action: 'add_member_already', targetEmail: email, targetProfileId: profileId });
      return NextResponse.json({ result: 'already', message: 'このアカウントはすでに団体に所属しています。' });
    }

    const { error: insertError } = await auth.supabase
      .from('profile_organizations')
      .insert({ profile_id: profileId, organization_id: orgId, role: 'member', granted_by: auth.userId });
    if (insertError) {
      console.error('OrgManager: insert failed', insertError);
      return NextResponse.json({ error: '追加に失敗しました。' }, { status: 500 });
    }

    await logManagerAction({ actorId: auth.userId, organizationId: orgId, action: 'add_member', targetEmail: email, targetProfileId: profileId });
    after(() => notifyOrgManagerAction({ actorId: auth.userId, organizationId: orgId, action: 'add', targetEmail: email }));

    return NextResponse.json({ result: 'added', message: '団体に追加しました。' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireSignedIn();
    if (auth.error) return auth.error;

    const url = new URL(request.url);
    const orgId = url.searchParams.get('organization_id') ?? '';
    const profileId = url.searchParams.get('profile_id') ?? '';
    if (!orgId || !profileId) {
      return NextResponse.json({ error: '対象が指定されていません。' }, { status: 400 });
    }
    if (!(await isManagerOf(auth.supabase, auth.userId, orgId))) {
      return NextResponse.json({ error: 'この団体の団体長ではありません。' }, { status: 403 });
    }

    // 団体長は外せない（DB の権限でも拒否される）。運営に依頼してもらう
    const { data: target } = await auth.supabase
      .from('profile_organizations')
      .select('role')
      .eq('organization_id', orgId)
      .eq('profile_id', profileId)
      .maybeSingle();
    if (!target) return NextResponse.json({ error: 'この団体のメンバーではありません。' }, { status: 404 });
    if (target.role === 'manager') {
      return NextResponse.json({ error: '団体長は外せません。変更が必要な場合は運営に連絡してください。' }, { status: 403 });
    }

    const { error } = await auth.supabase
      .from('profile_organizations')
      .delete()
      .eq('organization_id', orgId)
      .eq('profile_id', profileId)
      .eq('role', 'member');
    if (error) {
      console.error('OrgManager: delete failed', error);
      return NextResponse.json({ error: '外すのに失敗しました。' }, { status: 500 });
    }

    const admin = createAdminClient();

    // 団体のクエストのトークに運営メンバーとして入っていたら、そこからも外す。
    // 外しておかないと、団体の所属が無くなった後は団体長がトークから外せなくなる
    // （トークの人員を操作できるのは「同じ団体の所属者」に対してだけのため）。
    // 掲示した本人と、承認済みの応募者（学生）としての参加は残す。
    if (admin) {
      const { data: orgQuests } = await admin.from('quests').select('id, creator_id').eq('organization_id', orgId);
      const questIds = (orgQuests ?? []).filter(q => q.creator_id !== profileId).map(q => q.id);
      if (questIds.length > 0) {
        const [{ data: rooms }, { data: accepted }] = await Promise.all([
          admin.from('talk_rooms').select('id, quest_id').in('quest_id', questIds),
          admin.from('quest_applications').select('quest_id').in('quest_id', questIds).eq('applicant_id', profileId).eq('status', 'accepted'),
        ]);
        const asApplicant = new Set((accepted ?? []).map(a => a.quest_id));
        const roomIds = (rooms ?? []).filter(r => !asApplicant.has(r.quest_id)).map(r => r.id);
        if (roomIds.length > 0) {
          await admin.from('talk_members').delete().in('room_id', roomIds).eq('profile_id', profileId);
        }
      }
    }

    // 記録用にメールアドレスを残す（サーバー権限で読む）
    const { data: p } = admin ? await admin.from('profiles').select('email').eq('id', profileId).maybeSingle() : { data: null };
    await logManagerAction({ actorId: auth.userId, organizationId: orgId, action: 'remove_member', targetEmail: p?.email ?? null, targetProfileId: profileId });
    after(() => notifyOrgManagerAction({ actorId: auth.userId, organizationId: orgId, action: 'remove', targetEmail: p?.email ?? null }));

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

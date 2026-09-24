import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { requireSignedIn, isManagerOf, logManagerAction } from '@/lib/org-manager';

// トークの人員（団体長のみ）
//   GET   : 追加できる人（同じ団体のメンバー）と、今トークにいるかどうか
//   POST  : 団体のメンバーをトークに追加   body { profile_id }
//   DELETE: トークから外す   ?profile_id=...
//
// 団体単位の運用になったので、掲示した団体の団体長が、そのクエストの
// トークに入れる人員を決められるようにする（2026-09 追加）。
// 実際の可否はDB（v20 の can_manage_talk_staff）が判定する:
//   - 対象は同じ団体の所属者だけ
//   - 掲示した本人と、承認済みの応募者（学生）は外せない
// 候補の一覧に出すのはメールアドレスだけ（表示名は出さない。団体長の管理画面と同じ方針）。

async function loadContext(roomId: string) {
  const auth = await requireSignedIn();
  if (auth.error) return { error: auth.error };

  const admin = createAdminClient();
  if (!admin) {
    return { error: NextResponse.json({ error: 'サーバーの設定が不足しています。' }, { status: 500 }) };
  }

  const { data: room } = await admin
    .from('talk_rooms')
    .select('id, quest:quest_id (id, creator_id, organization_id)')
    .eq('id', roomId)
    .maybeSingle();
  const quest = (room as any)?.quest as { id: string; creator_id: string; organization_id: string | null } | undefined;
  if (!room || !quest) {
    return { error: NextResponse.json({ error: 'トークルームが見つかりません。' }, { status: 404 }) };
  }
  if (!quest.organization_id || !(await isManagerOf(auth.supabase, auth.userId, quest.organization_id))) {
    return { error: NextResponse.json({ error: 'このトークの人員を変更できるのは、掲示した団体の団体長だけです。' }, { status: 403 }) };
  }
  return { auth, admin, quest, orgId: quest.organization_id };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await loadContext(id);
    if ('error' in ctx && ctx.error) return ctx.error;
    const { admin, quest, orgId } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

    const [{ data: orgMembers }, { data: roomMembers }, { data: accepted }] = await Promise.all([
      admin.from('profile_organizations').select('profile_id, role, profile:profile_id (email)').eq('organization_id', orgId),
      admin.from('talk_members').select('profile_id').eq('room_id', id),
      admin.from('quest_applications').select('applicant_id').eq('quest_id', quest.id).eq('status', 'accepted'),
    ]);
    const inRoom = new Set((roomMembers ?? []).map(m => m.profile_id));
    const acceptedIds = new Set((accepted ?? []).map(a => a.applicant_id));

    return NextResponse.json({
      can_manage: true,
      candidates: (orgMembers ?? []).map((m: any) => ({
        profile_id: m.profile_id,
        email: m.profile?.email ?? null,
        role: m.role,
        in_room: inRoom.has(m.profile_id),
        // 掲示した本人と、学生として参加している人は外せない
        locked: m.profile_id === quest.creator_id || acceptedIds.has(m.profile_id),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await loadContext(id);
    if ('error' in ctx && ctx.error) return ctx.error;
    const { auth, orgId } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

    const { profile_id } = await request.json();
    if (!profile_id) return NextResponse.json({ error: '対象が指定されていません。' }, { status: 400 });

    // 本人のセッションで追加する。同じ団体の所属者かどうかはDB側が判定する
    const { error } = await auth.supabase
      .from('talk_members')
      .insert({ room_id: id, profile_id });
    if (error) {
      if (error.code === '23505') return NextResponse.json({ ok: true }); // すでに参加している
      console.error('TalkStaff: insert failed', error);
      return NextResponse.json({ error: 'この人は追加できません（同じ団体のメンバーだけ追加できます）。' }, { status: 403 });
    }
    await logManagerAction({ actorId: auth.userId, organizationId: orgId, action: 'add_talk_staff', targetProfileId: profile_id });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await loadContext(id);
    if ('error' in ctx && ctx.error) return ctx.error;
    const { auth, orgId } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

    const profileId = new URL(request.url).searchParams.get('profile_id');
    if (!profileId) return NextResponse.json({ error: '対象が指定されていません。' }, { status: 400 });

    const { data, error } = await auth.supabase
      .from('talk_members')
      .delete()
      .eq('room_id', id)
      .eq('profile_id', profileId)
      .select('profile_id');
    if (error) {
      console.error('TalkStaff: delete failed', error);
      return NextResponse.json({ error: '外すのに失敗しました。' }, { status: 500 });
    }
    // RLS で弾かれた場合はエラーにならず0件になる（掲示した本人・学生など）
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'この人はトークから外せません（掲示した本人と、応募した学生は外せません）。' }, { status: 403 });
    }
    await logManagerAction({ actorId: auth.userId, organizationId: orgId, action: 'remove_talk_staff', targetProfileId: profileId });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

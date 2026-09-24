import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { notifyOrgRequest } from '@/lib/slack';

// 1人が同時に出せる審査待ちの所属申請の件数。
// 既存団体への重複申請は DB の部分ユニークインデックスで防いでいるが、
// 「一覧にない団体名」での申請には制約がかからず、何件でも出せてしまう。
// 運営の審査待ち行列と Slack 通知が一人で溢れるのを防ぐ。
const MAX_PENDING_REQUESTS = 3;

// 所属団体の申請
//   GET : 運営 = 全件（既定は審査待ち）、一般 = 自分の申請のみ
//   POST: 自分の所属を申請する（メッセージ付き）
//
// status は必ずサーバ側で 'pending' に固定する。
// RLS 側でも insert は「本人 かつ status='pending'」に限定しているので二重で守る。
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isAdmin = profile?.role === 'admin';

    const status = new URL(request.url).searchParams.get('status') ?? 'pending';

    let query = supabase
      .from('organization_requests')
      .select(`
        id, organization_id, requested_name, message, status, review_note,
        created_at, reviewed_at,
        organization:organization_id (id, name),
        applicant:profile_id (id, display_name)
      `)
      .order('created_at', { ascending: false });

    // 一般ユーザーは自分の申請のみ。RLS でも守られているが明示しておく。
    if (!isAdmin) query = query.eq('profile_id', user.id);
    if (status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching organization requests:', error);
      return NextResponse.json({ error: '所属申請の取得に失敗しました。' }, { status: 500 });
    }

    // 申請者のメールアドレスは運営の画面にだけ出す。
    // 一般の権限では他人のメール列を読めない（v22）ので、運営のときだけサーバー権限で付ける。
    let rows: any[] = data ?? [];
    if (isAdmin && rows.length > 0) {
      const admin = createAdminClient();
      if (admin) {
        const ids = [...new Set(rows.map(r => r.applicant?.id).filter(Boolean))];
        const { data: emails } = await admin.from('profiles').select('id, email').in('id', ids);
        const byId = new Map((emails ?? []).map((e: any) => [e.id, e.email]));
        rows = rows.map(r => r.applicant ? { ...r, applicant: { ...r.applicant, email: byId.get(r.applicant.id) ?? null } } : r);
      }
    }

    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const organizationId: string | null = body.organization_id || null;
    const requestedName: string = (body.requested_name ?? '').trim();
    const message: string = (body.message ?? '').trim();

    if (!organizationId && !requestedName) {
      return NextResponse.json({ error: '所属する団体を選ぶか、団体名を入力してください。' }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json(
        { error: '運営が確認できるよう、所属が分かる情報（役職・所属歴など）を入力してください。' },
        { status: 400 }
      );
    }

    const { count: pendingCount } = await supabase
      .from('organization_requests')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .eq('status', 'pending');
    if ((pendingCount ?? 0) >= MAX_PENDING_REQUESTS) {
      return NextResponse.json(
        { error: `審査待ちの所属申請が${MAX_PENDING_REQUESTS}件あります。運営の確認をお待ちください。` },
        { status: 400 }
      );
    }

    // 既存団体への申請なら、すでに所属していないかを確認する
    if (organizationId) {
      const { count: alreadyMember } = await supabase
        .from('profile_organizations')
        .select('profile_id', { count: 'exact', head: true })
        .eq('profile_id', user.id)
        .eq('organization_id', organizationId);
      if ((alreadyMember ?? 0) > 0) {
        return NextResponse.json({ error: 'すでにこの団体に所属しています。' }, { status: 400 });
      }
    }

    const { data: created, error } = await supabase
      .from('organization_requests')
      .insert({
        profile_id: user.id,
        organization_id: organizationId,
        requested_name: organizationId ? null : requestedName,
        message,
        status: 'pending',
      })
      .select('id, organization_id, requested_name, message, status, created_at')
      .single();

    if (error) {
      // 審査待ちの申請を重複して出した場合（部分ユニークインデックス）
      if (error.code === '23505') {
        return NextResponse.json({ error: 'この団体への申請はすでに審査待ちです。' }, { status: 409 });
      }
      console.error('Error creating organization request:', error);
      return NextResponse.json({ error: '所属申請の送信に失敗しました。' }, { status: 500 });
    }

    // 運営Slackへ即時通知（レスポンス送出後に実行）
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
    after(async () => {
      // 既存団体への申請なら団体名を引く。新規団体名の申請ならそのまま使う。
      let orgName = requestedName || null;
      if (organizationId) {
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', organizationId)
          .maybeSingle();
        orgName = org?.name ?? null;
      }
      await notifyOrgRequest({
        organizationName: orgName,
        isNewOrg: !organizationId,
        message,
        profileId: user.id,
        applicantEmail: user.email ?? null,
        siteUrl,
      });
    });

    return NextResponse.json(created);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

// 自分のプロフィールを取得
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [profileRes, purposesRes, interestsRes] = await Promise.all([
    // 自分の行でも、メールアドレス・LINE関連の列は本人のセッションでは読めない（v22）。
    // 認証済みの本人の ID に限って、サーバー権限で全列を読む。
    (createAdminClient() ?? supabase).from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('profile_purposes').select('purpose_id').eq('profile_id', user.id),
    supabase.from('profile_interests').select('interest_id').eq('profile_id', user.id),
  ]);

  const { data, error } = profileRes;
  if (error && error.code !== 'PGRST116') {
    console.error('Fetch profile error:', error);
    return NextResponse.json({ error: 'DBエラー' }, { status: 500 });
  }

  return NextResponse.json({
    ...(data || { id: user.id, tags: [], display_name: user.email?.split('@')[0] }),
    purpose_ids: (purposesRes.data ?? []).map(r => r.purpose_id),
    interest_ids: (interestsRes.data ?? []).map(r => r.interest_id),
  });
}

// 保存後に返す列。select() だと全列を返そうとして、v22 以降は権限エラーになる
const RETURN_COLUMNS = 'id, display_name, tags, qualifications, bio, onboarded_at';

// プロフィールを更新
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { display_name, tags, qualifications, bio, line_notify, talk_mail_notify, onboarded, purpose_ids, interest_ids } = body;

  const patch: Record<string, unknown> = {};
  if (display_name !== undefined) patch.display_name = display_name;
  if (tags !== undefined) patch.tags = tags;
  if (qualifications !== undefined) patch.qualifications = qualifications;
  if (bio !== undefined) patch.bio = bio;
  if (line_notify !== undefined) patch.line_notify = line_notify;
  if (talk_mail_notify !== undefined) patch.talk_mail_notify = talk_mail_notify;
  if (onboarded === true) patch.onboarded_at = new Date().toISOString();

  // upsert にしないこと（email も書かないこと）。
  //   以前は email を含む upsert（INSERT ... ON CONFLICT DO UPDATE）だった。v22 で
  //   profiles の読み取り権限を列ごとに絞ってから、PostgreSQL は「衝突時に email を
  //   書き換える」のに email の読み取り権限を求めるため、保存がすべて
  //   permission denied になり、新規登録の初期設定が完了できなくなっていた。
  //   プロフィールの行は新規登録時にトリガー（handle_new_user）が作るので、更新だけでよい。
  const first = Object.keys(patch).length > 0
    ? await supabase.from('profiles').update(patch).eq('id', user.id).select(RETURN_COLUMNS).maybeSingle()
    : await supabase.from('profiles').select(RETURN_COLUMNS).eq('id', user.id).maybeSingle();
  let data = first.data;
  let error = first.error;

  // 行が無いとき（トリガーより前に作られたアカウントなど）だけ、行を作る。
  // 衝突時の書き換えを伴わない INSERT なので、上の権限の問題は起きない
  if (!error && !data) {
    const created = await supabase
      .from('profiles')
      .insert({ id: user.id, email: user.email, ...patch })
      .select(RETURN_COLUMNS)
      .single();
    data = created.data;
    error = created.error;
  }

  if (error) {
    console.error('Upsert profile error:', error);
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 });
  }

  // 利用目的・興味分野は洗い替え（マスタが増減しても選択IDだけを持つ）
  if (Array.isArray(purpose_ids)) {
    await supabase.from('profile_purposes').delete().eq('profile_id', user.id);
    if (purpose_ids.length > 0) {
      const { error: pErr } = await supabase.from('profile_purposes')
        .insert(purpose_ids.map((pid: string) => ({ profile_id: user.id, purpose_id: pid })));
      if (pErr) console.error('Upsert purposes error:', pErr);
    }
  }
  if (Array.isArray(interest_ids)) {
    await supabase.from('profile_interests').delete().eq('profile_id', user.id);
    if (interest_ids.length > 0) {
      const { error: iErr } = await supabase.from('profile_interests')
        .insert(interest_ids.map((iid: string) => ({ profile_id: user.id, interest_id: iid })));
      if (iErr) console.error('Upsert interests error:', iErr);
    }
  }

  return NextResponse.json({ success: true, data });
}

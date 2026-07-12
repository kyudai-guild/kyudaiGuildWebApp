import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// 自分のプロフィールを取得
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [profileRes, purposesRes, interestsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
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

// プロフィールを更新（Upsert）
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { display_name, tags, qualifications, bio, line_notify, onboarded, purpose_ids, interest_ids } = body;

  const upsertData: Record<string, unknown> = {
    id: user.id,
    email: user.email,
  };

  if (display_name !== undefined) upsertData.display_name = display_name;
  if (tags !== undefined) upsertData.tags = tags;
  if (qualifications !== undefined) upsertData.qualifications = qualifications;
  if (bio !== undefined) upsertData.bio = bio;
  if (line_notify !== undefined) upsertData.line_notify = line_notify;
  if (onboarded === true) upsertData.onboarded_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .upsert(upsertData)
    .select()
    .single();

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

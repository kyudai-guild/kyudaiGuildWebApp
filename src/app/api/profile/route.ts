import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// 自分のプロフィールを取得
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Fetch profile error:', error);
    return NextResponse.json({ error: 'DBエラー' }, { status: 500 });
  }

  return NextResponse.json(data || { id: user.id, tags: [], display_name: user.email?.split('@')[0] });
}

// プロフィールを更新（Upsert）
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { display_name, tags, last_check_in_date, monthly_checkin_count, checkin_month } = body;

  const upsertData: Record<string, unknown> = {
    id: user.id,
    email: user.email,
  };
  
  if (display_name !== undefined) upsertData.display_name = display_name;
  if (tags !== undefined) upsertData.tags = tags;

  // 以前の last_check_in_date などのフィールドは、profiles テーブルに含まれていなければスキップする。
  // 必要であれば profiles テーブルのスキーマを修正して追加する。今回はtagsとdisplay_nameを更新。

  const { data, error } = await supabase
    .from('profiles')
    .upsert(upsertData)
    .select()
    .single();

  if (error) {
    console.error('Upsert profile error:', error);
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

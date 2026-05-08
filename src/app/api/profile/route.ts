import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';

// 自分のプロフィールを取得
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const discordId = (session.user as any).id;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('member_profiles')
    .select('*')
    .eq('discord_id', discordId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 はデータなし（正常系）
    console.error('Fetch profile error:', error);
    return NextResponse.json({ error: 'DBエラー' }, { status: 500 });
  }

  return NextResponse.json(data || { discord_id: discordId, tags: [] });
}

// プロフィールを更新（Upsert）
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const discordId = (session.user as any).id;
  const body = await req.json();
  const { display_name, tags, avatar_url, last_check_in_date, monthly_checkin_count, checkin_month } = body;

  const supabase = createAdminClient();

  const upsertData: Record<string, unknown> = {
    discord_id: discordId,
    display_name: display_name || session.user.name,
    tags: tags || [],
    avatar_url: avatar_url || session.user.image,
    updated_at: new Date().toISOString(),
  };
  if (last_check_in_date !== undefined) upsertData.last_check_in_date = last_check_in_date;
  if (monthly_checkin_count !== undefined) upsertData.monthly_checkin_count = monthly_checkin_count;
  if (checkin_month !== undefined) upsertData.checkin_month = checkin_month;

  const { data, error } = await supabase
    .from('member_profiles')
    .upsert(upsertData)
    .select()
    .single();

  if (error) {
    console.error('Upsert profile error:', error);
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('member_profiles')
    .select('discord_id, display_name, avatar_url, monthly_checkin_count')
    .eq('checkin_month', currentMonth)
    .gt('monthly_checkin_count', 0)
    .order('monthly_checkin_count', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Fetch leaderboard error:', error);
    return NextResponse.json({ error: 'ランキングの取得に失敗しました' }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

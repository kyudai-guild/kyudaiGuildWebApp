import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
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
      // monthly_checkin_count / checkin_month カラムが未マイグレーションの場合などは
      // フロントに 500 を返すと UI 全体の体験が悪くなるため、空配列で縮退表示する
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('Leaderboard handler unexpected error:', err);
    return NextResponse.json([], { status: 200 });
  }
}

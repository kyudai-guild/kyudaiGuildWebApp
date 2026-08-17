import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * 日次ダイジェストの実行履歴（管理者のみ）。
 * cron が実際に動いたかをブラウザから確認できる。
 * Vercelのログは保持期間が短いので、こちらはDBに残った記録を読む。
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 });
  }

  const { data: runs, error } = await supabase
    .from('notification_logs')
    .select('ran_at, source, ok, reason, quests, recipients, sent')
    .order('ran_at', { ascending: false })
    .limit(30);
  if (error) {
    console.error('Failed to fetch notification logs:', error);
    return NextResponse.json(
      { error: '実行履歴の取得に失敗しました。migration v9 を実行済みか確認してください。' },
      { status: 500 }
    );
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const sentThisMonth = (runs ?? [])
    .filter(r => new Date(r.ran_at) >= monthStart)
    .reduce((sum, r) => sum + (r.sent ?? 0), 0);

  return NextResponse.json({
    last_run: runs?.[0] ?? null,
    sent_this_month: sentThisMonth, // 直近30件の範囲での集計
    free_tier_limit: 200,
    runs: runs ?? [],
  });
}

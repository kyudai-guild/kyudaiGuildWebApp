import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { sendDailyDigest } from '@/lib/quest-notify';

/**
 * 1日1回のLINEダイジェスト配信。
 * Vercel Cron から `vercel.json` の設定で呼ばれる（毎日 00:00 UTC = 9時台の日本時間）。
 *
 * 認証は2通り:
 *   1. Vercel Cron … `Authorization: Bearer ${CRON_SECRET}`（Vercelが自動で付与）
 *   2. 管理者 …… ログイン中のadminがブラウザで開く（動作確認・手動配信用）
 *
 * 送信済みクエストには line_notified_at が入るので、複数回実行しても二重送信にならない。
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const isCron = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
  let authorized = isCron;

  if (!authorized) {
    // 管理者による手動実行を許可（テスト用）
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles').select('role').eq('id', user.id).single();
        authorized = profile?.role === 'admin';
      }
    } catch {
      /* 未ログインなら未認可のまま */
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const source = isCron ? 'cron' : 'manual';
  const result = await sendDailyDigest(siteUrl, source);
  console.log(`LINE digest (${source}):`, result, {
    userAgent: request.headers.get('user-agent'),
    schedule: request.headers.get('x-vercel-cron-schedule'),
  });
  return NextResponse.json({ ...result, source });
}

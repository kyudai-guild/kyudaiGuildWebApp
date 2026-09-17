import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { sendDailyDigest } from '@/lib/quest-notify';
import { sendTalkDigest } from '@/lib/talk-mail';

/**
 * 1日1回のダイジェスト配信（LINE + トークの未読メール）。
 * Vercel Cron から `vercel.json` の設定で呼ばれる（毎日 00:00 UTC = 9時台の日本時間）。
 *
 * 認証は2通り:
 *   1. Vercel Cron … `Authorization: Bearer ${CRON_SECRET}`（Vercelが自動で付与）
 *   2. 管理者 …… ログイン中のadminがブラウザで開く（動作確認・手動配信用）
 *
 * 送信済みクエストには line_notified_at が入るので、複数回実行しても二重送信にならない。
 *
 * ⚠️ トークの未読メールも**この1本に相乗り**させている。
 *    Vercel の Hobby プランは cron を1日1本しか登録できないため、
 *    `/api/cron/talk-digest` のような別ルートを足せない。
 *    プランを上げて分離する場合は vercel.json にもう1本追加すればよい。
 *    パスが line-digest のままなのは、動作確認済みの CRON_SECRET の経路を
 *    壊さないため（名前と実態がずれている点はこのコメントで補う）。
 */
// LINE配信とメール配信を1回の実行でまとめて行うため、既定の実行時間では足りない。
// Hobby プランの上限は60秒。受信者が増えて足りなくなったら、
// 1回あたりの送信数（quest-notify の MAX_RECIPIENTS / talk-mail の MAX_RECIPIENTS）を
// 下げるか、プランを上げて cron を分けること。
export const maxDuration = 60;

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
  // 片方が落ちてももう片方は配信する
  const [line, talk] = await Promise.all([
    sendDailyDigest(siteUrl, source).catch(err => {
      console.error('LINE digest failed:', err);
      return { ok: false, error: String(err?.message ?? err) };
    }),
    sendTalkDigest(siteUrl).catch(err => {
      console.error('Talk mail digest failed:', err);
      return { ok: false, error: String(err?.message ?? err) };
    }),
  ]);

  console.log(`Daily digest (${source}):`, { line, talk }, {
    userAgent: request.headers.get('user-agent'),
    schedule: request.headers.get('x-vercel-cron-schedule'),
  });
  // 既存の確認手順が LINE 側のフィールドを直接見ているので、そこは形を変えない
  return NextResponse.json({ ...line, talk_mail: talk, source });
}

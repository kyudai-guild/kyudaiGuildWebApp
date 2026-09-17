import { createAdminClient } from '@/lib/supabase-admin';
import { sendMail, escapeHtml, isMailConfigured } from '@/lib/mail';

/**
 * 「未読のメッセージがあります」を1日1回まとめて送る。
 *
 * 内容を本文に含めないのは意図的:
 *   - トークの中身をメールに載せると、受信側のメールが漏れたときの被害が大きい
 *   - Resend の通数を抑えるため、1人につき1通にまとめる
 *
 * 二重送信の防止:
 *   talk_members.last_notified_at より新しい未読がある場合だけ送り、
 *   送ったら last_notified_at を更新する。これをしないと、
 *   相手が読まない限り毎日同じ通知が飛び続ける。
 */

const LOOKBACK_DAYS = 30;   // これより古いメッセージは未読でも蒸し返さない
const MAX_RECIPIENTS = 200; // 1回の実行で送る上限（暴走防止）

export type TalkDigestResult = {
  ok: boolean;
  candidates: number;
  sent: number;
  failed: number;
  skipped?: string;
};

export async function sendTalkDigest(siteUrl: string): Promise<TalkDigestResult> {
  if (!isMailConfigured()) {
    return { ok: false, candidates: 0, sent: 0, failed: 0, skipped: 'メール送信が未設定（RESEND_API_KEY / MAIL_FROM）' };
  }
  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, candidates: 0, sent: 0, failed: 0, skipped: 'SUPABASE_SERVICE_ROLE_KEY が未設定' };
  }

  // 未読の集計はDB側（talk_unread_digest / v16）で行う。
  // 以前は「全メンバー」と「直近30日の全メッセージ」を丸ごと取得して
  // JS で突き合わせていたため、メッセージが増えるほど転送量と
  // 実行時間が線形に増えていた。同じ計算はSQLの集計1回で終わる。
  // 「通知を希望している人だけ」「前回の通知より後に新着があるルームだけ」
  // の絞り込みも関数側でやっている。
  const { data: rows, error } = await admin.rpc('talk_unread_digest', { p_lookback_days: LOOKBACK_DAYS });

  if (error) {
    console.error('TalkDigest: rpc failed', error);
    return {
      ok: false, candidates: 0, sent: 0, failed: 0,
      skipped: 'talk_unread_digest の呼び出しに失敗（v16 未実行の可能性）',
    };
  }

  type DigestRow = { profile_id: string; rooms: number; unread: number; newest: string };
  const all: DigestRow[] = (rows ?? []) as DigestRow[];
  const candidates = all.length;
  if (candidates === 0) {
    return { ok: true, candidates: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const notifiedIds: string[] = [];

  // 1回の実行で送りすぎないよう頭打ちにする。新しい未読がある順に並んでいる。
  const targets = all.slice(0, MAX_RECIPIENTS);
  if (all.length > MAX_RECIPIENTS) {
    console.warn(`TalkDigest: ${all.length}人が対象だが ${MAX_RECIPIENTS}人で打ち切った`);
  }

  // 1人あたり「宛先の取得」と「送信」で2回の外部呼び出しが必要。
  // 直列にすると受信者数×2回ぶん待つことになり、上限200人では
  // 関数の実行時間(60秒)を超える。少しずつ並行して流す。
  const CONCURRENCY = 5;
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async row => {
      // 宛先は auth.users を正とする（profiles.email は本人が書き換えられるため）
      const { data: authUser } = await admin.auth.admin.getUserById(row.profile_id);
      const to = authUser?.user?.email;
      if (!to) return { id: row.profile_id, ok: false };
      const result = await sendMail({ to, ...buildDigest(row.unread, row.rooms, siteUrl) });
      if (!result.ok) console.error('TalkDigest: send failed', result.error);
      return { id: row.profile_id, ok: result.ok };
    }));
    for (const r of results) {
      if (r.ok) { sent++; notifiedIds.push(r.id); }
      else failed++;
    }
  }

  // 送れた人だけ通知済みにする。失敗した人は次回また対象になる。
  if (notifiedIds.length > 0) {
    const { error } = await admin
      .from('talk_members')
      .update({ last_notified_at: new Date().toISOString() })
      .in('profile_id', notifiedIds);
    if (error) console.error('TalkDigest: failed to mark notified', error);
  }

  return { ok: true, candidates, sent, failed };
}

function buildDigest(unread: number, rooms: number, siteUrl: string) {
  const where = rooms > 1 ? `${rooms}件のトーク` : 'トーク';
  const summary = `${where}に未読のメッセージが${unread}件あります。`;

  const html = `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>未読のメッセージがあります</title></head>
<body style="margin:0; padding:0; background-color:#ffffff;">
<div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(summary)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="left" style="padding:32px 24px; font-family:-apple-system, BlinkMacSystemFont, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif;">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:520px;">
        <tr>
          <td>
            <p style="margin:0 0 28px; font-size:15px; font-weight:bold; letter-spacing:0.04em; color:#0c3b2e;">九大ギルド</p>
            <p style="margin:0 0 20px; font-size:18px; font-weight:bold; line-height:1.6; color:#1f140f;">未読のメッセージがあります</p>
            <p style="margin:0 0 24px; font-size:15px; line-height:1.9; color:#6b5e54;">${escapeHtml(summary)}</p>
            <p style="margin:0 0 24px;">
              <a href="${siteUrl}/talks" target="_blank" style="color:#1a4a3a; font-weight:bold; text-decoration:underline;">トークを開く</a>
            </p>
            <p style="margin:0; font-size:12px; line-height:1.9; color:#9a8e84;">
              ※ このお知らせは1日1回、未読があるときだけお送りします。<br>
              ※ 通知が不要な場合は、プロフィール画面から止められます。
            </p>
            <p style="margin:28px 0 0; padding-top:16px; border-top:1px solid rgba(31,20,15,0.12); font-size:12px; line-height:1.8; color:#9a8e84;">
              九大ギルド 運営<br>
              <a href="${siteUrl}" target="_blank" style="color:#1a4a3a; text-decoration:none;">${siteUrl}</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const text = [
    summary,
    '',
    `トーク: ${siteUrl}/talks`,
    '',
    '※ このお知らせは1日1回、未読があるときだけお送りします。',
    '※ 通知が不要な場合は、プロフィール画面から止められます。',
    '',
    '九大ギルド 運営',
    siteUrl,
  ].join('\n');

  return { subject: '【九大ギルド】未読のメッセージがあります', html, text };
}

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

  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400_000).toISOString();

  // メンバーと、直近のメッセージをそれぞれ1回ずつ取ってJS側で突き合わせる。
  // メンバーごとにCOUNTを投げるとルーム数だけクエリが増えるため。
  const [membersRes, messagesRes] = await Promise.all([
    admin.from('talk_members').select('room_id, profile_id, joined_at, last_read_at, last_notified_at'),
    admin.from('talk_messages').select('room_id, sender_id, created_at').gt('created_at', since),
  ]);

  if (membersRes.error || messagesRes.error) {
    console.error('TalkDigest: query failed', membersRes.error || messagesRes.error);
    return { ok: false, candidates: 0, sent: 0, failed: 0, skipped: 'データ取得に失敗' };
  }

  const members = membersRes.data ?? [];
  const messages = messagesRes.data ?? [];
  if (members.length === 0 || messages.length === 0) {
    return { ok: true, candidates: 0, sent: 0, failed: 0 };
  }

  // room_id ごとにメッセージをまとめる
  const byRoom = new Map<string, { sender_id: string; created_at: string }[]>();
  for (const m of messages) {
    const list = byRoom.get(m.room_id) ?? [];
    list.push({ sender_id: m.sender_id, created_at: m.created_at });
    byRoom.set(m.room_id, list);
  }

  // profile_id ごとに未読を集計する
  type Pending = { rooms: number; unread: number; newest: string };
  const pending = new Map<string, Pending>();

  for (const member of members) {
    const roomMessages = byRoom.get(member.room_id);
    if (!roomMessages) continue;

    // 既読時刻が無い場合は参加時刻を既読とみなす
    const readAt = member.last_read_at ?? member.joined_at ?? since;
    const unread = roomMessages.filter(m => m.sender_id !== member.profile_id && m.created_at > readAt);
    if (unread.length === 0) continue;

    const newest = unread.reduce((a, b) => (a.created_at > b.created_at ? a : b)).created_at;
    // 前回の通知以降に新しい未読が無ければ、同じ内容なので送らない
    if (member.last_notified_at && newest <= member.last_notified_at) continue;

    const cur = pending.get(member.profile_id) ?? { rooms: 0, unread: 0, newest: '' };
    pending.set(member.profile_id, {
      rooms: cur.rooms + 1,
      unread: cur.unread + unread.length,
      newest: newest > cur.newest ? newest : cur.newest,
    });
  }

  const candidates = pending.size;
  if (candidates === 0) {
    return { ok: true, candidates: 0, sent: 0, failed: 0 };
  }

  // メール通知を希望している人だけに絞る
  const profileIds = [...pending.keys()].slice(0, MAX_RECIPIENTS);
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name, talk_mail_notify')
    .in('id', profileIds);

  let sent = 0;
  let failed = 0;
  const notifiedIds: string[] = [];

  for (const profile of profiles ?? []) {
    if (profile.talk_mail_notify === false) continue;
    const info = pending.get(profile.id);
    if (!info) continue;

    // 宛先は auth.users を正とする（profiles.email は本人が書き換えられるため）
    const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
    const to = authUser?.user?.email;
    if (!to) { failed++; continue; }

    const result = await sendMail({ to, ...buildDigest(info.unread, info.rooms, siteUrl) });
    if (result.ok) { sent++; notifiedIds.push(profile.id); }
    else { failed++; console.error('TalkDigest: send failed', result.error); }
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

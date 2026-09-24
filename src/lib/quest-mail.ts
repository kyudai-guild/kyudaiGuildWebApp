import { createAdminClient } from '@/lib/supabase-admin';
import { sendMail, escapeHtml, nl2br, type MailResult } from '@/lib/mail';

/**
 * クエスト審査結果のメール通知。
 *
 * 文面は docs/email-templates/confirm-signup.html と同じ作りに揃えている:
 *   - 幅の制御のみ table（Outlook は flex/grid を解釈しない）
 *   - CSS はすべてインライン（<style> を削除するクライアントがある）
 *   - 画像・Webフォントを使わない（表示崩れと迷惑メール判定を避ける）
 */

const BRAND = '#0c3b2e';
const TEXT = '#1f140f';
const MUTED = '#6b5e54';
const FAINT = '#9a8e84';
const LINE = 'rgba(31,20,15,0.12)';
const FONT = "-apple-system, BlinkMacSystemFont, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif";

type QuestForMail = {
  id: string;
  title: string;
  creator_id: string;
  effective_end_date?: string | null;
};

function layout(opts: { preview: string; heading: string; body: string; siteUrl: string }): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(opts.heading)}</title>
</head>
<body style="margin:0; padding:0; background-color:#ffffff;">
<div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(opts.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="left" style="padding:32px 24px; font-family:${FONT};">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:520px;">
        <tr>
          <td>
            <p style="margin:0 0 28px; font-size:15px; font-weight:bold; letter-spacing:0.04em; color:${BRAND};">九大ギルド</p>
            <p style="margin:0 0 20px; font-size:18px; font-weight:bold; line-height:1.6; color:${TEXT};">${escapeHtml(opts.heading)}</p>
${opts.body}
            <p style="margin:28px 0 0; padding-top:16px; border-top:1px solid ${LINE}; font-size:12px; line-height:1.8; color:${FAINT};">
              九大ギルド 運営<br>
              <a href="${opts.siteUrl}" target="_blank" style="color:#1a4a3a; text-decoration:none;">${opts.siteUrl}</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

const p = (content: string, margin = '0 0 12px') =>
  `            <p style="margin:${margin}; font-size:15px; line-height:1.9; color:${MUTED};">${content}</p>`;

function buildApproved(quest: QuestForMail, siteUrl: string) {
  const title = escapeHtml(quest.title);
  const until = quest.effective_end_date
    ? new Date(quest.effective_end_date).toLocaleDateString('ja-JP')
    : null;

  const body = [
    p(`クエスト「<span style="color:${TEXT}; font-weight:bold;">${title}</span>」の掲示が承認されました。`),
    p('掲示板に掲載されましたので、応募をお待ちください。'),
    until ? p(`掲示期限は <span style="color:${TEXT}; font-weight:bold;">${escapeHtml(until)}</span> までです。`, '0 0 24px') : p('', '0 0 12px'),
    `            <p style="margin:0 0 24px;">
              <a href="${siteUrl}/my-quests" target="_blank" style="color:#1a4a3a; font-weight:bold; text-decoration:underline;">マイクエストで状況を確認する</a>
            </p>`,
    `            <p style="margin:0; font-size:12px; line-height:1.9; color:${FAINT};">
              ※ 応募があるとサイト内の「マイクエスト」に件数が表示されます。<br>
              ※ 依頼が終わったら、マイクエストから「完了報告」をしてください。1団体あたり未完了のクエストは10件までです。
            </p>`,
  ].join('\n');

  const text = [
    `クエスト「${quest.title}」の掲示が承認されました。`,
    '',
    '掲示板に掲載されましたので、応募をお待ちください。',
    until ? `掲示期限は ${until} までです。` : '',
    '',
    `マイクエスト: ${siteUrl}/my-quests`,
    '',
    '※ 応募があるとサイト内の「マイクエスト」に件数が表示されます。',
    '※ 依頼が終わったら、マイクエストから「完了報告」をしてください。1団体あたり未完了のクエストは10件までです。',
    '',
    '九大ギルド 運営',
    siteUrl,
  ].filter(l => l !== '').join('\n');

  return {
    subject: `【九大ギルド】クエスト「${quest.title}」の掲示を承認しました`,
    html: layout({ preview: `「${quest.title}」が掲示板に掲載されました。`, heading: 'クエストの掲示を承認しました', body, siteUrl }),
    text,
  };
}

function buildRejected(quest: QuestForMail, reason: string, siteUrl: string) {
  const title = escapeHtml(quest.title);
  const reasonHtml = nl2br(escapeHtml(reason));

  const body = [
    p(`クエスト「<span style="color:${TEXT}; font-weight:bold;">${title}</span>」について、掲示を見送らせていただきました。`),
    p('理由は以下のとおりです。', '0 0 12px'),
    // 理由は枠で囲って本文と区別する（装飾は最小限）
    `            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px; width:100%;">
              <tr>
                <td style="background-color:#f5f3ef; border:1px solid ${LINE}; border-radius:8px; padding:16px 20px;
                           font-size:15px; line-height:1.9; color:${TEXT};">${reasonHtml}</td>
              </tr>
            </table>`,
    p('内容を修正のうえ、あらためて申請していただけます。', '0 0 24px'),
    `            <p style="margin:0 0 24px;">
              <a href="${siteUrl}/my-quests" target="_blank" style="color:#1a4a3a; font-weight:bold; text-decoration:underline;">マイクエストを開く</a>
            </p>`,
    `            <p style="margin:0; font-size:12px; line-height:1.9; color:${FAINT};">
              ※ 判断に心当たりがない場合や、内容についてご相談がある場合は運営までご連絡ください。
            </p>`,
  ].join('\n');

  const text = [
    `クエスト「${quest.title}」について、掲示を見送らせていただきました。`,
    '',
    '【理由】',
    reason,
    '',
    '内容を修正のうえ、あらためて申請していただけます。',
    `マイクエスト: ${siteUrl}/my-quests`,
    '',
    '※ 判断に心当たりがない場合は運営までご連絡ください。',
    '',
    '九大ギルド 運営',
    siteUrl,
  ].join('\n');

  return {
    subject: `【九大ギルド】クエスト「${quest.title}」の掲示を見送らせていただきました`,
    html: layout({ preview: `「${quest.title}」の掲示を見送らせていただきました。`, heading: 'クエストの掲示を見送らせていただきました', body, siteUrl }),
    text,
  };
}

/**
 * 掲示者のメールアドレスを引く。
 *
 * profiles.email ではなく auth.users を正とする。profiles.email は本人が
 * 書き換えられるため、それを宛先にすると「任意のアドレスへ運営名義のメールを
 * 送らせる」踏み台にできてしまう。
 */
async function resolveRecipient(creatorId: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) {
    console.warn('QuestMail: SUPABASE_SERVICE_ROLE_KEY が無いため宛先を確定できません');
    return null;
  }
  const { data, error } = await admin.auth.admin.getUserById(creatorId);
  if (error || !data?.user?.email) {
    console.error('QuestMail: failed to resolve recipient', error);
    return null;
  }
  return data.user.email;
}

function buildApplication(
  questTitle: string,
  applicantName: string,
  message: string | null,
  siteUrl: string
) {
  const title = escapeHtml(questTitle);
  const who = escapeHtml(applicantName);
  const msg = (message ?? '').trim();

  const body = [
    p(`クエスト「<span style="color:${TEXT}; font-weight:bold;">${title}</span>」に応募がありました。`),
    p(`応募者: <span style="color:${TEXT}; font-weight:bold;">${who}</span>`, '0 0 16px'),
    msg
      ? `            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px; width:100%;">
              <tr>
                <td style="background-color:#f5f3ef; border:1px solid ${LINE}; border-radius:8px; padding:16px 20px;
                           font-size:15px; line-height:1.9; color:${TEXT};">${nl2br(escapeHtml(msg))}</td>
              </tr>
            </table>`
      : p('（応募メッセージはありません）', '0 0 24px'),
    `            <p style="margin:0 0 24px;">
              <a href="${siteUrl}/my-quests" target="_blank" style="color:#1a4a3a; font-weight:bold; text-decoration:underline;">マイクエストで応募者を確認する</a>
            </p>`,
    `            <p style="margin:0; font-size:12px; line-height:1.9; color:${FAINT};">
              ※ 応募者のプロフィール（資格・自己PR・所属団体）を見てから判断できます。<br>
              ※ 承認するとマッチ成立となり、トーク画面で連絡を取れるようになります。
            </p>`,
  ].join('\n');

  const text = [
    `クエスト「${questTitle}」に応募がありました。`,
    '',
    `応募者: ${applicantName}`,
    msg ? `\n【応募メッセージ】\n${msg}` : '（応募メッセージはありません）',
    '',
    `マイクエスト: ${siteUrl}/my-quests`,
    '',
    '※ 承認するとマッチ成立となり、トーク画面で連絡を取れるようになります。',
    '',
    '九大ギルド 運営',
    siteUrl,
  ].join('\n');

  return {
    subject: `【九大ギルド】クエスト「${questTitle}」に応募がありました`,
    html: layout({ preview: `${applicantName}さんから応募が届いています。`, heading: 'クエストに応募がありました', body, siteUrl }),
    text,
  };
}

/** 応募があったことを掲示者にメールで知らせる。例外は投げず、結果を返す。 */
export async function sendApplicationMail(params: {
  questTitle: string;
  creatorId: string;
  applicantName: string;
  message: string | null;
  siteUrl: string;
}): Promise<MailResult> {
  const to = await resolveRecipient(params.creatorId);
  if (!to) {
    return { ok: false, error: '掲示者のメールアドレスを取得できませんでした。' };
  }
  const mail = buildApplication(params.questTitle, params.applicantName, params.message, params.siteUrl);
  return sendMail({ to, ...mail });
}

/** 審査結果を掲示者にメールで知らせる。例外は投げず、結果を返す。 */
export async function sendQuestReviewMail(
  quest: QuestForMail,
  action: 'approve' | 'reject',
  rejectionReason: string | null,
  siteUrl: string
): Promise<MailResult> {
  const to = await resolveRecipient(quest.creator_id);
  if (!to) {
    return { ok: false, error: '掲示者のメールアドレスを取得できませんでした。' };
  }

  const mail = action === 'approve'
    ? buildApproved(quest, siteUrl)
    : buildRejected(quest, rejectionReason ?? '（理由が記録されていません）', siteUrl);

  return sendMail({ to, ...mail });
}

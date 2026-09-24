import { createAdminClient } from '@/lib/supabase-admin';
import { isSlackNotificationEnabled } from '@/lib/app-settings';
import { fmtSessionsShort, type QuestSession } from '@/lib/quest-form';

/**
 * 運営Slackへの即時通知（Incoming Webhook）。
 *
 * ⚠️ この関数は**例外を投げない**。Slackが落ちていても、クエストの申請や
 * 所属申請そのものは成立させる。呼び出し側は next/server の after() で
 * レスポンス送出後に呼ぶこと（ユーザーを待たせないため）。
 *
 * ⚠️ 申請者の氏名・メールアドレス・申請メッセージがSlackに流れる。
 * 通知先は**プライベートチャンネル**にすること。
 */

const TIMEOUT_MS = 5_000;
const MESSAGE_MAX = 300;

export function isSlackConfigured(): boolean {
  return Boolean(process.env.SLACK_WEBHOOK_URL);
}

/**
 * 実際に送ってよいか。
 *   - Webhook が設定されているか（環境変数）
 *   - 運営が管理画面でONにしているか（v18 の app_settings）
 *
 * 動作確認でテスト用のクエストを出すときなど、管理画面のスイッチで
 * 一時的に止められる。設定が読めない場合はON扱いにするので、
 * 通知が黙って止まることはない。
 */
async function shouldNotify(): Promise<boolean> {
  if (!isSlackConfigured()) return false;
  return isSlackNotificationEnabled();
}

/** Slack の mrkdwn で特別扱いされる文字を無害化する */
function esc(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function truncate(value: string | null | undefined, max = MESSAGE_MAX): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  return v.length > max ? `${v.slice(0, max)}…` : v;
}

async function post(payload: Record<string, unknown>): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return; // 未設定なら黙ってスキップ（機能として任意）

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('Slack: webhook responded', res.status, body);
    }
  } catch (err) {
    console.error('Slack: request failed', err);
  }
}

/** profiles から表示名を引く。取れなければメールのローカル部で代用する。 */
async function resolveName(profileId: string, fallbackEmail: string | null): Promise<string> {
  const admin = createAdminClient();
  if (admin) {
    const { data } = await admin
      .from('profiles')
      .select('display_name')
      .eq('id', profileId)
      .maybeSingle();
    if (data?.display_name) return data.display_name;
  }
  return fallbackEmail?.split('@')[0] ?? '名称未設定';
}

function adminButton(siteUrl: string, text: string) {
  return {
    type: 'actions',
    elements: [{
      type: 'button',
      text: { type: 'plain_text', text, emoji: true },
      url: `${siteUrl}/admin`,
      style: 'primary',
    }],
  };
}

/* ── クエストの審査依頼 ─────────────────────────── */

export async function notifyQuestSubmitted(params: {
  title: string;
  description: string | null;
  questType: string;
  maxApplicants: number;
  organizationName: string | null;
  sessions: QuestSession[] | null;
  location: string | null;
  participationFee: string | null;
  creatorId: string;
  creatorEmail: string | null;
  siteUrl: string;
}): Promise<void> {
  if (!(await shouldNotify())) return;

  const name = await resolveName(params.creatorId, params.creatorEmail);
  const org = params.organizationName
    ? `:office: ${esc(params.organizationName)}`
    : ':bust_in_silhouette: *個人申請*';

  // 報酬は廃止。代わりに一日体験の判断材料になる日程・場所・参加費を出す
  const when = fmtSessionsShort(params.sessions);
  const meta = [
    `種別: ${esc(params.questType)}`,
    when ? `日程: ${esc(when)}` : null,
    params.location ? `場所: ${esc(params.location)}` : null,
    params.participationFee ? `参加費: ${esc(params.participationFee)}` : null,
    `定員: ${params.maxApplicants}人`,
  ].filter(Boolean).join('  ・  ');

  const blocks: Record<string, unknown>[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:scroll: *新しいクエストの審査依頼*\n*${esc(params.title)}*`,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*掲示者*\n${esc(name)}` },
        { type: 'mrkdwn', text: `*申請元*\n${org}` },
      ],
    },
  ];

  const desc = truncate(params.description);
  if (desc) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `>${esc(desc).replace(/\n/g, '\n>')}` } });
  }

  blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: meta }] });
  blocks.push(adminButton(params.siteUrl, 'クエストを審査する'));

  await post({
    text: `新しいクエストの審査依頼: ${params.title}`, // 通知バナー用のフォールバック
    blocks,
  });
}

/* ── 所属団体の申請 ─────────────────────────────── */

export async function notifyOrgRequest(params: {
  organizationName: string | null;
  isNewOrg: boolean;
  message: string | null;
  profileId: string;
  applicantEmail: string | null;
  siteUrl: string;
}): Promise<void> {
  if (!(await shouldNotify())) return;

  const name = await resolveName(params.profileId, params.applicantEmail);
  const orgLabel = params.organizationName ?? '（団体名なし）';

  const blocks: Record<string, unknown>[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:office: *所属団体の申請*\n*${esc(orgLabel)}*${params.isNewOrg ? '  `新規団体`' : ''}`,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*申請者*\n${esc(name)}` },
        { type: 'mrkdwn', text: `*メール*\n${esc(params.applicantEmail ?? '不明')}` },
      ],
    },
  ];

  const msg = truncate(params.message);
  if (msg) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `>${esc(msg).replace(/\n/g, '\n>')}` } });
  }

  if (params.isNewOrg) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: ':warning: 承認するとこの名前で団体が新規登録されます' }],
    });
  }

  blocks.push(adminButton(params.siteUrl, '所属申請を審査する'));

  await post({
    text: `所属団体の申請: ${orgLabel}`,
    blocks,
  });
}

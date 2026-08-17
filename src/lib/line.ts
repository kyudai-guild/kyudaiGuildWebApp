import crypto from 'crypto';

/**
 * LINE Login (OAuth 2.1 / OIDC) と Messaging API の薄いラッパー。
 * サーバー専用。クライアントコンポーネントから import しないこと
 * （チャネルシークレット・アクセストークンが漏れる）。
 *
 * 前提: LINEログインチャネルと Messaging API チャネルは **同一プロバイダー** に置く。
 * userId はプロバイダー単位で一意なので、別プロバイダーだとログインで得た userId に
 * プッシュ通知を送れない。
 */

const AUTHORIZE_URL = 'https://access.line.me/oauth2/v2.1/authorize';
const TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';
const VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify';
const FRIENDSHIP_URL = 'https://api.line.me/friendship/v1/status';
const MULTICAST_URL = 'https://api.line.me/v2/bot/message/multicast';
const PUSH_URL = 'https://api.line.me/v2/bot/message/push';

/** OAuth の state/nonce を一時保存する httpOnly Cookie 名 */
export const LINE_OAUTH_COOKIE = 'line_oauth';

export const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID ?? '';
const LINE_LOGIN_CHANNEL_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET ?? '';
const LINE_MESSAGING_CHANNEL_SECRET = process.env.LINE_MESSAGING_CHANNEL_SECRET ?? '';
const LINE_MESSAGING_ACCESS_TOKEN = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ?? '';

export const isLineLoginConfigured = () =>
  Boolean(LINE_LOGIN_CHANNEL_ID && LINE_LOGIN_CHANNEL_SECRET);
export const isLineMessagingConfigured = () =>
  Boolean(LINE_MESSAGING_ACCESS_TOKEN);
/** Webhookの署名検証に必要なシークレットが設定されているか */
export const isLineWebhookConfigured = () =>
  Boolean(LINE_MESSAGING_CHANNEL_SECRET);

/**
 * コールバックURLは LINE Developers に登録した文字列と完全一致が必要。
 * Vercel のプレビューURLはデプロイごとに変わるため、固定の URL を
 * NEXT_PUBLIC_SITE_URL に設定して常にそれを使う。未設定時のみリクエスト元にフォールバック。
 */
export function lineRedirectUri(requestOrigin: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || requestOrigin).replace(/\/$/, '');
  return `${base}/api/line/callback`;
}

export function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function buildAuthorizeUrl(opts: {
  redirectUri: string;
  state: string;
  nonce: string;
  /** 公式アカウントの友だち追加を促す。通知が目的なので既定で aggressive */
  botPrompt?: 'aggressive' | 'normal';
}) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: LINE_LOGIN_CHANNEL_ID,
    redirect_uri: opts.redirectUri,
    state: opts.state,
    scope: 'profile openid',
    nonce: opts.nonce,
    bot_prompt: opts.botPrompt ?? 'aggressive',
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export type LineTokenResponse = {
  access_token: string;
  id_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<LineTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: LINE_LOGIN_CHANNEL_ID,
      client_secret: LINE_LOGIN_CHANNEL_SECRET,
    }),
  });
  if (!res.ok) {
    throw new Error(`LINE token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export type LineIdTokenPayload = {
  iss: string;
  sub: string;          // LINE userId
  aud: string;
  exp: number;
  nonce?: string;
  name?: string;
  picture?: string;
};

/**
 * ID トークンの検証は LINE の verify エンドポイントに任せる
 * （署名検証・aud/exp・nonce 照合をまとめてやってくれる）。
 */
export async function verifyIdToken(idToken: string, nonce: string): Promise<LineIdTokenPayload> {
  const res = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: LINE_LOGIN_CHANNEL_ID,
      nonce,
    }),
  });
  if (!res.ok) {
    throw new Error(`LINE id_token verification failed: ${res.status} ${await res.text()}`);
  }
  const payload = (await res.json()) as LineIdTokenPayload;
  if (!payload.sub) throw new Error('LINE id_token has no sub');
  return payload;
}

/** 公式アカウントを友だち追加済みか（未連携チャネルでは失敗するので呼び出し側で握る） */
export async function fetchFriendshipStatus(accessToken: string): Promise<boolean> {
  const res = await fetch(FRIENDSHIP_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return false;
  const data = await res.json();
  return Boolean(data.friendFlag);
}

/** LINE の Flex Message 等をそのまま渡す */
export type LineMessage = Record<string, unknown>;

/**
 * 複数ユーザーへ一斉送信（1回あたり最大500件）。
 * 送信できなかった相手がいても例外にせず、結果を返す。
 */
export async function multicast(userIds: string[], messages: LineMessage[]) {
  if (!isLineMessagingConfigured() || userIds.length === 0) {
    return { sent: 0, skipped: userIds.length };
  }
  let sent = 0;
  for (let i = 0; i < userIds.length; i += 500) {
    const chunk = userIds.slice(i, i + 500);
    const res = await fetch(MULTICAST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_MESSAGING_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ to: chunk, messages }),
    });
    if (res.ok) {
      sent += chunk.length;
    } else {
      console.error('LINE multicast failed:', res.status, await res.text());
    }
  }
  return { sent, skipped: userIds.length - sent };
}

/** 単一ユーザーへ送信 */
export async function push(userId: string, messages: LineMessage[]) {
  if (!isLineMessagingConfigured()) return false;
  const res = await fetch(PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_MESSAGING_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to: userId, messages }),
  });
  if (!res.ok) {
    console.error('LINE push failed:', res.status, await res.text());
    return false;
  }
  return true;
}

/** Webhook の署名検証（x-line-signature） */
export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  if (!LINE_MESSAGING_CHANNEL_SECRET) {
    console.error('LINE webhook: LINE_MESSAGING_CHANNEL_SECRET is not set in this environment');
    return false;
  }
  if (!signature) {
    console.error('LINE webhook: x-line-signature header is missing');
    return false;
  }
  const expected = crypto
    .createHmac('sha256', LINE_MESSAGING_CHANNEL_SECRET)
    .update(rawBody)
    .digest('base64');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) {
    console.error(
      'LINE webhook: signature mismatch. ' +
      'LINE_MESSAGING_CHANNEL_SECRET が Messaging APIチャネルのものか確認してください' +
      '（LINEログインチャネルのシークレットではありません）'
    );
  }
  return ok;
}

/* ============================================================
   通知メッセージの組み立て
   ============================================================ */

const CATEGORY_BADGE: Record<string, { color: string; bg: string }> = {
  '業務委託': { color: '#d97706', bg: '#fffbeb' },
  '研究協力': { color: '#2563eb', bg: '#eff6ff' },
  '仲間探し': { color: '#059669', bg: '#ecfdf5' },
  'ボランティア募集': { color: '#e11d48', bg: '#fff1f2' },
  '雇用契約': { color: '#7c3aed', bg: '#f5f3ff' },
  'その他': { color: '#6b7280', bg: '#f9fafb' },
};

export type NotifiableQuestSummary = {
  title: string;
  quest_type: string;
  reward?: string | null;
  max_applicants?: number | null;
  effective_end_date?: string | null;
};

export function buildQuestMatchMessage(
  quest: NotifiableQuestSummary,
  matchReason: string,
  siteUrl: string
): LineMessage {
  const questUrl = `${siteUrl}/#quest-board`;
  const badge = CATEGORY_BADGE[quest.quest_type] ?? CATEGORY_BADGE['その他'];
  const rows: LineMessage[] = [];
  const row = (k: string, v: string) => ({
    type: 'box', layout: 'baseline', spacing: 'sm',
    contents: [
      { type: 'text', text: k, size: 'xs', color: '#9a8e84', flex: 2 },
      { type: 'text', text: v, size: 'sm', color: '#1f140f', weight: 'bold', flex: 5, wrap: true },
    ],
  });
  if (quest.reward) rows.push(row('報酬', quest.reward));
  if (quest.max_applicants) rows.push(row('募集', `${quest.max_applicants}名`));
  if (quest.effective_end_date) {
    const d = new Date(quest.effective_end_date);
    rows.push(row('掲載期限', `${d.getMonth() + 1}月${d.getDate()}日まで`));
  }

  return {
    type: 'flex',
    altText: `【九大ギルド】${quest.title}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#0c3b2e', paddingAll: '16px', spacing: 'xs',
        contents: [
          { type: 'text', text: 'QUEST MATCH', color: '#c8956c', size: 'xxs', weight: 'bold' },
          { type: 'text', text: 'あなたにぴったりのクエストが掲示されました', color: '#eae8e3', size: 'sm', weight: 'bold', wrap: true },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', paddingAll: '20px',
        contents: [
          {
            type: 'box', layout: 'horizontal',
            contents: [{
              type: 'box', layout: 'vertical', flex: 0, backgroundColor: badge.bg, cornerRadius: '999px',
              paddingTop: '2px', paddingBottom: '2px', paddingStart: '10px', paddingEnd: '10px',
              contents: [{ type: 'text', text: quest.quest_type, size: 'xxs', color: badge.color, weight: 'bold' }],
            }],
          },
          { type: 'text', text: quest.title, weight: 'bold', size: 'lg', color: '#1f140f', wrap: true },
          {
            type: 'box', layout: 'vertical', backgroundColor: '#f2f7f4', cornerRadius: '8px', paddingAll: '10px',
            contents: [{ type: 'text', text: `🎯 ${matchReason}`, size: 'xs', color: '#1a4a3a', wrap: true }],
          },
          ...(rows.length > 0 ? [{ type: 'separator', color: '#eae8e3' }, ...rows] : []),
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '16px',
        contents: [
          { type: 'button', style: 'primary', color: '#1a4a3a', height: 'sm',
            action: { type: 'uri', label: 'クエストを見る', uri: questUrl } },
          { type: 'button', style: 'link', height: 'sm',
            action: { type: 'uri', label: '通知条件を変更する', uri: `${siteUrl}/profile` } },
        ],
      },
    },
  };
}

/** カルーセルに載せる1件分のコンパクトなバブル */
function digestBubble(
  quest: NotifiableQuestSummary,
  matchReason: string,
  index: number,
  total: number,
  siteUrl: string
): LineMessage {
  const badge = CATEGORY_BADGE[quest.quest_type] ?? CATEGORY_BADGE['その他'];
  const rows: LineMessage[] = [];
  const row = (k: string, v: string) => ({
    type: 'box', layout: 'baseline', spacing: 'sm',
    contents: [
      { type: 'text', text: k, size: 'xxs', color: '#9a8e84', flex: 2 },
      { type: 'text', text: v, size: 'xs', color: '#1f140f', weight: 'bold', flex: 5, wrap: true },
    ],
  });
  if (quest.reward) rows.push(row('報酬', quest.reward));
  if (quest.effective_end_date) {
    const d = new Date(quest.effective_end_date);
    rows.push(row('期限', `${d.getMonth() + 1}月${d.getDate()}日まで`));
  }

  return {
    type: 'bubble', size: 'kilo',
    header: {
      type: 'box', layout: 'vertical', backgroundColor: '#0c3b2e', paddingAll: '12px',
      contents: [{
        type: 'text', text: `QUEST MATCH ${index}/${total}`,
        color: '#c8956c', size: 'xxs', weight: 'bold',
      }],
    },
    body: {
      type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '16px',
      contents: [
        {
          type: 'box', layout: 'horizontal',
          contents: [{
            type: 'box', layout: 'vertical', flex: 0, backgroundColor: badge.bg, cornerRadius: '999px',
            paddingTop: '2px', paddingBottom: '2px', paddingStart: '10px', paddingEnd: '10px',
            contents: [{ type: 'text', text: quest.quest_type, size: 'xxs', color: badge.color, weight: 'bold' }],
          }],
        },
        { type: 'text', text: quest.title, weight: 'bold', size: 'md', color: '#1f140f', wrap: true },
        { type: 'text', text: `🎯 ${matchReason}`, size: 'xxs', color: '#1a4a3a', wrap: true },
        ...(rows.length > 0 ? [{ type: 'separator', color: '#eae8e3' }, ...rows] : []),
      ],
    },
    footer: {
      type: 'box', layout: 'vertical', paddingAll: '12px',
      contents: [{
        type: 'button', style: 'primary', color: '#1a4a3a', height: 'sm',
        action: { type: 'uri', label: 'クエストを見る', uri: `${siteUrl}/#quest-board` },
      }],
    },
  };
}

/** カルーセルに載せられる上限（LINEの仕様は12件） */
export const DIGEST_MAX_BUBBLES = 10;

/**
 * 日次ダイジェスト用のメッセージ。
 * 1件だけなら詳細バブル、複数件なら横スワイプのカルーセルにまとめる。
 * どちらも「1ユーザーあたり1通」しか消費しない。
 */
export function buildQuestDigestMessage(
  items: { quest: NotifiableQuestSummary; matchReason: string }[],
  siteUrl: string
): LineMessage {
  const base = siteUrl.replace(/\/$/, '');
  if (items.length === 1) {
    return buildQuestMatchMessage(items[0].quest, items[0].matchReason, base);
  }
  const shown = items.slice(0, DIGEST_MAX_BUBBLES);
  return {
    type: 'flex',
    altText: `【九大ギルド】あなたにおすすめのクエストが${items.length}件あります`,
    contents: {
      type: 'carousel',
      contents: shown.map((it, i) =>
        digestBubble(it.quest, it.matchReason, i + 1, shown.length, base)
      ),
    },
  };
}

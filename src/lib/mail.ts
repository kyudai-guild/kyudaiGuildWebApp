/**
 * Resend の HTTP API でメールを送る。
 *
 * 登録確認メールは Supabase → カスタムSMTP(Resend) の経路で送られるが、
 * アプリ発の通知メールは Supabase Auth を経由しないので、ここから直接送る。
 * SMTP ではなく HTTP API を使うのは、サーバーレス環境で接続を張りっぱなしに
 * できないためと、依存パッケージを増やさないため。
 *
 * ⚠️ この関数は**例外を投げない**。メールが送れなかっただけで
 * クエストの審査そのものが失敗するのは本末転倒なので、呼び出し側は
 * 戻り値を見て「警告」として扱う（黙って握り潰さないこと）。
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const TIMEOUT_MS = 10_000;

export type MailResult = { ok: true; id?: string } | { ok: false; error: string };

export type MailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/** HTMLメールにユーザー入力を埋め込むときのエスケープ（React と違い自動処理されない） */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 改行を <br> にする（エスケープ後に呼ぶこと） */
export function nl2br(escaped: string): string {
  return escaped.replace(/\r?\n/g, '<br>');
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendMail(input: MailInput): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;

  if (!apiKey || !from) {
    console.warn('Mail: RESEND_API_KEY / MAIL_FROM が未設定のため送信をスキップしました');
    return { ok: false, error: 'メール送信が設定されていません（RESEND_API_KEY / MAIL_FROM）。' };
  }
  if (!input.to) {
    return { ok: false, error: '宛先のメールアドレスが取得できませんでした。' };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(process.env.MAIL_REPLY_TO ? { reply_to: process.env.MAIL_REPLY_TO } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      // 本文にAPIキーは含まれないのでそのままログに出してよい
      const body = await res.text().catch(() => '');
      console.error('Mail: Resend responded', res.status, body);
      return { ok: false, error: `メールの送信に失敗しました（Resend ${res.status}）。` };
    }

    const data = await res.json().catch(() => null);
    return { ok: true, id: data?.id };
  } catch (err: any) {
    console.error('Mail: request failed', err);
    const reason = err?.name === 'TimeoutError' ? 'タイムアウト' : 'ネットワークエラー';
    return { ok: false, error: `メールの送信に失敗しました（${reason}）。` };
  }
}

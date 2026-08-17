import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  verifyWebhookSignature, isLineWebhookConfigured, isLineMessagingConfigured, isLineLoginConfigured,
} from '@/lib/line';

/**
 * 設定状況の確認用（ブラウザで開ける）。
 * どの値も返さず、設定されているかどうかの真偽値だけを返す。
 * LINE の「検証」で 401 が出る時に、環境変数がこのデプロイに届いているかを切り分けられる。
 */
export async function GET() {
  // NEXT_PUBLIC_ の値はクライアントバンドルに埋め込まれる公開値なので、ここに出しても露出は増えない。
  // 秘密のキーは真偽値・長さ・JWTのロール名だけを返す（キー本体は返さない）。
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  // よくある事故: SUPABASE_SERVICE_ROLE_KEY に anon キーを貼ってしまう。
  // その場合 RLS が効いたままになり、LINEログイン時のプロフィール検索が0件になる。
  // legacy キーは JWT なので payload の role で判別できる。
  let svcKeyRole: string | null = null;
  if (svcKey) {
    try {
      svcKeyRole = JSON.parse(Buffer.from(svcKey.split('.')[1], 'base64').toString()).role ?? 'no-role-claim';
    } catch {
      svcKeyRole = 'not-a-jwt'; // 新形式（sb_secret_...）の可能性
    }
  }

  // 管理クライアントで実際に読めるかの実地テスト。
  // 正しい service_role なら連携済み件数が見える。anon を貼っていると RLS に阻まれ 0 になる。
  let lineLinkedProfiles: number | string = 'n/a';
  const admin = createAdminClient();
  if (admin) {
    const { count, error } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .not('line_user_id', 'is', null);
    lineLinkedProfiles = error ? `error: ${error.code}` : (count ?? 0);
  }

  return NextResponse.json({
    endpoint: 'line-webhook',
    messaging_channel_secret: isLineWebhookConfigured(),   // false なら 401 の原因はこれ
    messaging_access_token: isLineMessagingConfigured(),   // false なら通知が送れない
    login_channel: isLineLoginConfigured(),                // false なら連携・ログインが使えない
    service_role_key: Boolean(svcKey),
    service_role_key_role: svcKeyRole,                     // 'service_role' 以外なら貼り間違い
    line_linked_profiles_visible: lineLinkedProfiles,      // 連携済みがいるのに 0 なら RLS に阻まれている
    site_url: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    supabase_anon_key_length: anonKey.length,
  });
}

/**
 * LINE Messaging API の Webhook。
 * 友だち追加（follow）/ ブロック（unfollow）を profiles.line_friend に反映する。
 * ブロックされた相手にプッシュを送るとエラーになるため、送信対象の絞り込みに使う。
 *
 * LINE Developers の Webhook URL に設定する:
 *   https://<本番ドメイン>/api/line/webhook
 */
export async function POST(request: NextRequest) {
  // 署名検証のため生のボディが必要（JSONパース前に読む）
  const rawBody = await request.text();
  const signature = request.headers.get('x-line-signature');

  if (!verifyWebhookSignature(rawBody, signature)) {
    // 検証NGは無言で拒否（攻撃者に情報を与えない）
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let events: any[] = [];
  try {
    events = JSON.parse(rawBody).events ?? [];
  } catch {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  if (!admin) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not configured; skipping webhook processing');
    return NextResponse.json({ ok: true });
  }

  for (const event of events) {
    const lineUserId = event?.source?.userId;
    if (!lineUserId) continue;

    if (event.type === 'follow' || event.type === 'unfollow') {
      const { error } = await admin
        .from('profiles')
        .update({ line_friend: event.type === 'follow' })
        .eq('line_user_id', lineUserId);
      if (error) console.error('Error updating line_friend:', error);
    }
  }

  // LINE は 200 を返さないと再送してくるので、処理の成否によらず 200 を返す
  return NextResponse.json({ ok: true });
}

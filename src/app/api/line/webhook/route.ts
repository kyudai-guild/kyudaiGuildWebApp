import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { verifyWebhookSignature } from '@/lib/line';

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

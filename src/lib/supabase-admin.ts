import { createClient } from '@supabase/supabase-js';

/**
 * サービスロールキーを使う管理クライアント（RLSをバイパスする）。
 *
 * ⚠️ サーバー専用。クライアントコンポーネントから絶対に import しないこと。
 * 用途は次の2つに限定する:
 *   1. LINEログイン時のセッション発行（本人確認済みのLINEアカウントからのみ）
 *   2. 通知対象ユーザーの抽出（本人セッションが無いバックグラウンド処理）
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

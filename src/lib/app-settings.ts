import { createAdminClient } from '@/lib/supabase-admin';

/**
 * 運営が管理画面から切り替えられる設定（v18 の app_settings）。
 *
 * 読み出しは service_role で行う。設定そのものは運営しか見られない
 * ようにRLSを閉じているが、通知の送信は本人セッションの無い文脈
 * （after() やバッチ）から走るため。
 */

export const SETTING_KEYS = {
  slackNotifications: 'slack_notifications',
} as const;

/**
 * 設定を読む。**取得できないときは既定値を返す**。
 *
 * ここで既定値に倒すのが重要で、v18 未実行やDB障害のときに
 * 「通知が黙って止まる」のが一番まずい。読めなければ
 * 今までどおりの動作（通知する）を続ける。
 */
export async function getBoolSetting(key: string, fallback: boolean): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return fallback;

  const { data, error } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error(`AppSettings: failed to read "${key}"`, error);
    return fallback;
  }
  if (!data) return fallback;

  return typeof data.value === 'boolean' ? data.value : fallback;
}

/** Slack通知が有効か。既定は有効。 */
export function isSlackNotificationEnabled(): Promise<boolean> {
  return getBoolSetting(SETTING_KEYS.slackNotifications, true);
}

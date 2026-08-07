import { createAdminClient } from '@/lib/supabase-admin';
import { buildQuestMatchMessage, isLineMessagingConfigured, multicast } from '@/lib/line';

/** 1クエストあたりの最大通知件数（LINE無料枠の消費を抑えるための安全弁） */
const MAX_RECIPIENTS = 200;

type NotifiableQuest = {
  id: string;
  title: string;
  quest_type: string;
  description?: string | null;
  tags?: string[] | null;
  reward?: string | null;
  max_applicants?: number | null;
  effective_end_date?: string | null;
  creator_id?: string | null;
};

/**
 * クエストの内容と、ユーザーが登録した「興味のある分野」を突き合わせる。
 * 判定はラベル単位:
 *   - クエスト種別と完全一致（例: 「研究協力」）
 *   - タグと完全一致（例: 「プログラミング」）
 *   - タイトルに含まれる（例: 「Webサイト制作」を含むタイトル）
 * 説明文は誤検知が増えるため対象にしない。
 */
function matchesQuest(label: string, quest: NotifiableQuest) {
  if (quest.quest_type === label) return true;
  if ((quest.tags ?? []).some(t => t === label)) return true;
  if (quest.title.includes(label)) return true;
  return false;
}

/**
 * 承認されたクエストを、興味分野が一致する連携済みユーザーへLINE通知する。
 * 失敗しても審査処理は止めない（呼び出し側で握りつぶす前提）。
 */
export async function notifyMatchingUsers(quest: NotifiableQuest, siteUrl: string) {
  if (!isLineMessagingConfigured()) {
    return { sent: 0, reason: 'messaging-not-configured' as const };
  }
  const admin = createAdminClient();
  if (!admin) return { sent: 0, reason: 'admin-client-unavailable' as const };

  // 1. 有効な興味分野のうち、このクエストに合致するものを絞り込む
  const { data: options } = await admin
    .from('interest_options')
    .select('id, label')
    .eq('is_active', true);

  const matched = (options ?? []).filter(o => matchesQuest(o.label, quest));
  if (matched.length === 0) return { sent: 0, reason: 'no-matching-interest' as const };

  // 2. その分野を選んでいるユーザーを集める
  const { data: rows } = await admin
    .from('profile_interests')
    .select('profile_id')
    .in('interest_id', matched.map(o => o.id));

  const profileIds = [...new Set((rows ?? []).map(r => r.profile_id))]
    .filter(pid => pid !== quest.creator_id); // 依頼者本人には送らない
  if (profileIds.length === 0) return { sent: 0, reason: 'no-subscribers' as const };

  // 3. LINE連携済み・通知ON・友だち追加済みの人だけに絞る
  const { data: targets } = await admin
    .from('profiles')
    .select('line_user_id')
    .in('id', profileIds)
    .eq('line_notify', true)
    .eq('line_friend', true)
    .not('line_user_id', 'is', null)
    .limit(MAX_RECIPIENTS);

  const userIds = (targets ?? []).map(t => t.line_user_id).filter(Boolean) as string[];
  if (userIds.length === 0) return { sent: 0, reason: 'no-line-targets' as const };

  const reason = `興味分野「${matched[0].label}」にマッチ`;
  const message = buildQuestMatchMessage(quest, reason, siteUrl.replace(/\/$/, ''));
  const result = await multicast(userIds, [message]);

  return { sent: result.sent, reason: 'ok' as const };
}

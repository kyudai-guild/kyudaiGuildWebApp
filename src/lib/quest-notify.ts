import { createAdminClient } from '@/lib/supabase-admin';
import {
  buildQuestDigestMessage, isLineMessagingConfigured, push, DIGEST_MAX_BUBBLES,
} from '@/lib/line';

/** 1回のダイジェストで扱うクエストの上限 */
const MAX_QUESTS_PER_RUN = 50;
/** 1回のダイジェストで通知する人数の上限（無料枠を守るための安全弁） */
const MAX_RECIPIENTS = 200;
/** これより古い承認済みクエストはダイジェストに含めない（積み残しの一斉送信を防ぐ） */
const LOOKBACK_DAYS = 3;

type NotifiableQuest = {
  id: string;
  title: string;
  quest_type: string;
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

export type DigestResult = {
  ok: boolean;
  reason?: string;
  quests: number;     // ダイジェスト対象になったクエスト数
  recipients: number; // 通知対象となったユーザー数
  sent: number;       // 実際に送信できた通数（= 消費した通数）
};

/**
 * 1日1回のダイジェスト送信。
 *
 * 「1ユーザーにつき1通」だけ送るのがこの設計の要点。
 * 承認のたびに送ると『クエスト数 × 対象人数』の通数を消費してしまうため、
 * その日の新着をまとめてカルーセル1通にする（LINE無料枠は月200通）。
 *
 * 冪等性: 送信済みのクエストには line_notified_at を入れるので、
 * 同じ日に2回起動しても二重送信にならない。
 */
export async function sendDailyDigest(
  siteUrl: string,
  source: 'cron' | 'manual' = 'cron'
): Promise<DigestResult> {
  const result = await runDigest(siteUrl);
  await recordRun(source, result);
  return result;
}

/**
 * 実行結果をDBに残す。
 * Vercel の Hobby プランはログの保持期間が短いため、
 * 「cronが本当に動いたか」を後から確認できるようにする。
 */
async function recordRun(source: 'cron' | 'manual', result: DigestResult) {
  const admin = createAdminClient();
  if (!admin) return;
  const { error } = await admin.from('notification_logs').insert({
    source,
    ok: result.ok,
    reason: result.reason ?? null,
    quests: result.quests,
    recipients: result.recipients,
    sent: result.sent,
  });
  // ログの失敗で配信自体は止めない（テーブル未作成の環境も動くようにする）
  if (error) console.error('Digest: failed to write notification log', error);
}

async function runDigest(siteUrl: string): Promise<DigestResult> {
  const empty = { quests: 0, recipients: 0, sent: 0 };
  if (!isLineMessagingConfigured()) {
    return { ok: false, reason: 'messaging-not-configured', ...empty };
  }
  const admin = createAdminClient();
  if (!admin) return { ok: false, reason: 'admin-client-unavailable', ...empty };

  // 1. まだ通知していない、直近に承認されたクエスト
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: quests, error: questError } = await admin
    .from('quests')
    .select('id, title, quest_type, tags, reward, max_applicants, effective_end_date, creator_id')
    .eq('status', 'approved')
    .is('line_notified_at', null)
    .gte('reviewed_at', since)
    .order('reviewed_at', { ascending: true })
    .limit(MAX_QUESTS_PER_RUN);
  if (questError) {
    console.error('Digest: failed to fetch quests', questError);
    return { ok: false, reason: 'quest-fetch-failed', ...empty };
  }
  if (!quests || quests.length === 0) {
    return { ok: true, reason: 'no-new-quests', ...empty };
  }

  // 2. 有効な興味分野マスタと突き合わせる
  const { data: options } = await admin
    .from('interest_options')
    .select('id, label')
    .eq('is_active', true);

  const matchedQuests = quests
    .map(q => {
      const hits = (options ?? []).filter(o => matchesQuest(o.label, q));
      return { quest: q, interestIds: hits.map(o => o.id), label: hits[0]?.label ?? '' };
    })
    .filter(m => m.interestIds.length > 0);

  // 通知対象が無いクエストも「処理済み」にする（毎日再評価しないため）
  const markNotified = async () => {
    const { error } = await admin
      .from('quests')
      .update({ line_notified_at: new Date().toISOString() })
      .in('id', quests.map(q => q.id));
    if (error) console.error('Digest: failed to mark quests as notified', error);
  };

  if (matchedQuests.length === 0) {
    await markNotified();
    return { ok: true, reason: 'no-matching-interest', quests: quests.length, recipients: 0, sent: 0 };
  }

  // 3. 該当する興味分野を選んでいるユーザーを一括取得
  const allInterestIds = [...new Set(matchedQuests.flatMap(m => m.interestIds))];
  const { data: interestRows } = await admin
    .from('profile_interests')
    .select('profile_id, interest_id')
    .in('interest_id', allInterestIds);

  // 4. 通知を受け取れる状態のユーザーだけに絞る
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, line_user_id')
    .eq('line_notify', true)
    .eq('line_friend', true)
    .not('line_user_id', 'is', null)
    .limit(MAX_RECIPIENTS);

  const lineIdByProfile = new Map(
    (profiles ?? []).map(p => [p.id as string, p.line_user_id as string])
  );
  if (lineIdByProfile.size === 0) {
    await markNotified();
    return { ok: true, reason: 'no-line-targets', quests: quests.length, recipients: 0, sent: 0 };
  }

  // 5. ユーザーごとに「その人にマッチしたクエスト」を集める
  const interestsByProfile = new Map<string, Set<string>>();
  for (const row of interestRows ?? []) {
    if (!lineIdByProfile.has(row.profile_id)) continue;
    const set = interestsByProfile.get(row.profile_id) ?? new Set<string>();
    set.add(row.interest_id);
    interestsByProfile.set(row.profile_id, set);
  }

  const digestByProfile = new Map<string, { quest: NotifiableQuest; matchReason: string }[]>();
  for (const [profileId, interestIds] of interestsByProfile) {
    for (const m of matchedQuests) {
      if (m.quest.creator_id === profileId) continue; // 自分の依頼は通知しない
      if (!m.interestIds.some(id => interestIds.has(id))) continue;
      const list = digestByProfile.get(profileId) ?? [];
      list.push({ quest: m.quest, matchReason: `興味分野「${m.label}」にマッチ` });
      digestByProfile.set(profileId, list);
    }
  }

  // 6. 1人1通だけ送る
  let sent = 0;
  for (const [profileId, items] of digestByProfile) {
    const lineUserId = lineIdByProfile.get(profileId);
    if (!lineUserId || items.length === 0) continue;
    const message = buildQuestDigestMessage(
      items.slice(0, DIGEST_MAX_BUBBLES),
      siteUrl
    );
    const ok = await push(lineUserId, [message]);
    if (ok) sent++;
  }

  await markNotified();

  return {
    ok: true,
    quests: matchedQuests.length,
    recipients: digestByProfile.size,
    sent,
  };
}

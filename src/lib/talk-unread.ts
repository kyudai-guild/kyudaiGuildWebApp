import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 自分が参加しているトークの、ルームごとの未読メッセージ数。
 *
 * 未読の定義は未読メール（v16 の talk_unread_digest）と同じ:
 *   - 自分以外の発言
 *   - 既読時刻（last_read_at。無ければ参加した時刻）より後
 *
 * 本人のセッションで読む（RLS で自分の参加ルームのメッセージしか見えない）。
 * 一度に数えるのは新しい方から最大 MAX_ROWS 件。それを超える未読は数え切らないが、
 * バッジは「9+」で頭打ちなので表示は変わらない。
 */
const MAX_ROWS = 500;

export async function unreadByRoom(supabase: SupabaseClient, userId: string): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  const { data: mine, error } = await supabase
    .from('talk_members')
    .select('room_id, last_read_at, joined_at')
    .eq('profile_id', userId);
  if (error || !mine || mine.length === 0) return result;

  const readAt = new Map<string, string>();
  for (const m of mine) {
    const at = m.last_read_at ?? m.joined_at;
    if (at) readAt.set(m.room_id, at);
  }
  if (readAt.size === 0) return result;

  // 最も古い既読時刻より後のメッセージだけを取り、ルームごとに振り分ける
  const oldest = [...readAt.values()].sort()[0];
  const { data: messages } = await supabase
    .from('talk_messages')
    .select('room_id, created_at')
    .in('room_id', [...readAt.keys()])
    .neq('sender_id', userId)
    .gt('created_at', oldest)
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS);

  for (const msg of messages ?? []) {
    const at = readAt.get(msg.room_id);
    if (at && new Date(msg.created_at) > new Date(at)) {
      result.set(msg.room_id, (result.get(msg.room_id) ?? 0) + 1);
    }
  }
  return result;
}

/** 未読メッセージの合計 */
export function totalUnread(byRoom: Map<string, number>): number {
  let n = 0;
  for (const v of byRoom.values()) n += v;
  return n;
}

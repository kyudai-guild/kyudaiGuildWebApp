-- ============================================================
-- Migration v16: 未読ダイジェストの集計をSQL側に移す
-- 実行者: 人間（Supabase SQL Editor）
-- 前提: v15（talk_members.last_read_at / last_notified_at）実行後
--
-- 背景:
--   未読メールの対象者を求めるのに、アプリ側で
--   「全メンバー」と「直近30日の全メッセージ」を丸ごと取得して
--   JavaScript で突き合わせていた。メッセージが増えるほど
--   転送量と関数のメモリ・実行時間が線形に増える作りだった。
--   同じ計算はSQLの集計1回で終わるので、DB側に寄せる。
--
-- 返すもの: 通知すべき人だけ（1人1行）
--   profile_id / rooms（未読のあるルーム数）/ unread（未読の合計）/ newest（最新の未読時刻）
-- ============================================================

create or replace function public.talk_unread_digest(p_lookback_days int default 30)
returns table (
  profile_id uuid,
  rooms      bigint,
  unread     bigint,
  newest     timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  with per_room as (
    select
      tm.profile_id,
      tm.room_id,
      count(m.id)       as unread,
      max(m.created_at) as newest
    from talk_members tm
    join profiles p
      on p.id = tm.profile_id
     and p.talk_mail_notify          -- 通知を希望している人だけ
    join talk_messages m
      on  m.room_id    = tm.room_id
      and m.sender_id <> tm.profile_id                            -- 自分の発言は未読ではない
      and m.created_at > coalesce(tm.last_read_at, tm.joined_at)  -- 既読より後
      and m.created_at > now() - make_interval(days => p_lookback_days)
    group by tm.profile_id, tm.room_id, tm.last_notified_at
    -- 前回の通知より後に新しい未読が無いルームは対象外。
    -- これをしないと、相手が読まない限り毎日同じ通知が飛び続ける。
    having tm.last_notified_at is null
        or max(m.created_at) > tm.last_notified_at
  )
  select
    per_room.profile_id,
    count(*)::bigint      as rooms,
    sum(per_room.unread)::bigint as unread,
    max(per_room.newest)  as newest
  from per_room
  group by per_room.profile_id
  order by max(per_room.newest) desc;
$$;

-- ------------------------------------------------------------
-- 実行権限
--   security definer なので、呼べる人は RLS を越えて全員の未読を見られる。
--   一般ユーザーに開くと「誰がどれだけ未読を抱えているか」が漏れるため、
--   配信バッチ（service_role）だけに許可する。
-- ------------------------------------------------------------
revoke all on function public.talk_unread_digest(int) from public;
revoke all on function public.talk_unread_digest(int) from anon, authenticated;
grant execute on function public.talk_unread_digest(int) to service_role;

-- 集計を支える索引（v6 で作った idx_talk_messages_room と同じ並び）
create index if not exists idx_talk_messages_room on talk_messages (room_id, created_at);

-- ------------------------------------------------------------
-- 確認用
-- ------------------------------------------------------------
-- 関数ができているか
-- select proname, pronargs from pg_proc where proname = 'talk_unread_digest';

-- いま通知対象になる人（SQL Editor は service_role 相当なので実行できる）
-- select * from talk_unread_digest(30);

-- 一般ユーザーから呼べないこと（呼べてしまうなら revoke が効いていない）
-- select has_function_privilege('authenticated', 'public.talk_unread_digest(int)', 'execute');
--   → false が返れば正しい

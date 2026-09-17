-- ============================================================
-- Migration v15: トークの既読管理とメール通知設定
-- 実行者: 人間（Supabase SQL Editor）
-- 前提: v6/v6a（トークルーム）実行後
--
-- 背景:
--   「未読メッセージがあります」を1日1回メールで知らせたいが、
--   これまで既読を記録していなかったため未読を判定できなかった。
--
--   last_read_at     … 本人がその部屋を開いた時刻（アプリが更新する）
--   last_notified_at … 最後にメールで知らせた時刻。同じ未読で毎日
--                      メールが飛び続けるのを防ぐ（v8 の line_notified_at と同じ考え方）
-- ============================================================

alter table talk_members add column if not exists last_read_at     timestamptz;
alter table talk_members add column if not exists last_notified_at timestamptz;

-- ダイジェストは profile 単位でまとめるので、その方向の索引を足す
create index if not exists idx_talk_members_profile on talk_members (profile_id);

-- メール通知の希望（既定はON）。LINEの line_notify とは別に持つ。
alter table profiles add column if not exists talk_mail_notify boolean not null default true;

-- ------------------------------------------------------------
-- RLS: 本人が自分の既読時刻を更新できるようにする
--   talk_members には update ポリシーが無く、このままでは
--   last_read_at を本人が書けない（RLSはポリシーの無い操作を拒否する）。
-- ------------------------------------------------------------
drop policy if exists "talk_members_update" on talk_members;
create policy "talk_members_update" on talk_members for update
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ------------------------------------------------------------
-- ただし「所属そのもの」は書き換えさせない。
--   上のポリシーだけだと profile_id = auth.uid() を保ったまま
--   room_id を別の部屋に書き換えられてしまい、
--   他人のトークルームに自分を移せる（＝盗み見できる）。
--   列単位の制御は RLS の式では書けないので、v14 と同じくトリガーで守る。
-- ------------------------------------------------------------
create or replace function public.protect_talk_membership()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;  -- service_role / SQL Editor はそのまま
  end if;
  if new.room_id is distinct from old.room_id
  or new.profile_id is distinct from old.profile_id then
    raise exception 'トークルームの所属は変更できません。';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_talk_membership on talk_members;
create trigger protect_talk_membership
  before update on talk_members
  for each row execute function public.protect_talk_membership();

-- ------------------------------------------------------------
-- 既存メンバーの初期値
--   last_read_at が NULL の場合は joined_at を既読時刻とみなす（アプリ側も同じ扱い）。
--   運用開始前の古いメッセージで一斉にメールが飛ばないよう、
--   ここで「いま時点まで通知済み」にしておく。
-- ------------------------------------------------------------
update talk_members set last_notified_at = now() where last_notified_at is null;

-- ------------------------------------------------------------
-- 確認用
-- ------------------------------------------------------------
-- select
--   (select count(*) from information_schema.columns where table_name='talk_members' and column_name='last_read_at')     as last_read_at,
--   (select count(*) from information_schema.columns where table_name='talk_members' and column_name='last_notified_at') as last_notified_at,
--   (select count(*) from information_schema.columns where table_name='profiles'     and column_name='talk_mail_notify') as talk_mail_notify,
--   (select count(*) from pg_policies where tablename='talk_members' and policyname='talk_members_update')              as update_policy,
--   (select count(*) from pg_trigger  where tgname='protect_talk_membership')                                            as membership_guard;

-- 未読の様子を見る
-- select p.email, tm.room_id, tm.last_read_at, tm.last_notified_at,
--        (select count(*) from talk_messages m
--          where m.room_id = tm.room_id and m.sender_id <> tm.profile_id
--            and m.created_at > coalesce(tm.last_read_at, tm.joined_at)) as unread
-- from talk_members tm join profiles p on p.id = tm.profile_id
-- order by unread desc;

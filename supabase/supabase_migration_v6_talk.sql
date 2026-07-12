-- ============================================================
-- Migration v6: トークルーム（案2: feature/phase2-talk ブランチ用）
-- 実行者: 人間（Supabase SQL Editor）。v5 実行後に。
-- 案1（連絡先交換）だけを試す場合は実行不要。
-- 実行しても案1ブランチの動作には影響しない（加算のみ）。
-- ============================================================

create table if not exists talk_rooms (
  id         uuid primary key default gen_random_uuid(),
  quest_id   uuid not null unique references quests(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists talk_members (
  room_id    uuid not null references talk_rooms(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  joined_at  timestamptz default now(),
  primary key (room_id, profile_id)
);

create table if not exists talk_messages (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references talk_rooms(id) on delete cascade,
  sender_id  uuid not null references profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz default now()
);
create index if not exists idx_talk_messages_room on talk_messages (room_id, created_at);

-- ------------------------------------------------------------
-- RLS
-- talk_members のポリシーが talk_members 自身を参照すると無限再帰になるため、
-- security definer 関数でメンバー判定を行う（Supabase の定石）。
-- ------------------------------------------------------------
create or replace function public.is_talk_member(p_room uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from talk_members
    where room_id = p_room and profile_id = auth.uid()
  );
$$;

create or replace function public.is_guild_admin()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

alter table talk_rooms    enable row level security;
alter table talk_members  enable row level security;
alter table talk_messages enable row level security;

-- ルーム: メンバー or 管理者（運営が確認することがある旨はUIに明記済み）
drop policy if exists "talk_rooms_select" on talk_rooms;
create policy "talk_rooms_select" on talk_rooms for select
  using (is_talk_member(id) or is_guild_admin());
-- 作成はクエストの依頼者のみ（応募承認時にAPIが作成する）
drop policy if exists "talk_rooms_insert" on talk_rooms;
create policy "talk_rooms_insert" on talk_rooms for insert
  with check (exists (select 1 from quests where quests.id = quest_id and quests.creator_id = auth.uid()));

-- メンバー: 同室メンバー or 管理者が閲覧。追加はそのルームのクエスト依頼者のみ。
drop policy if exists "talk_members_select" on talk_members;
create policy "talk_members_select" on talk_members for select
  using (is_talk_member(room_id) or is_guild_admin());
drop policy if exists "talk_members_insert" on talk_members;
create policy "talk_members_insert" on talk_members for insert
  with check (exists (
    select 1 from talk_rooms r join quests q on q.id = r.quest_id
    where r.id = room_id and q.creator_id = auth.uid()
  ));

-- メッセージ: メンバー or 管理者が閲覧。送信は本人かつメンバーのみ。
drop policy if exists "talk_messages_select" on talk_messages;
create policy "talk_messages_select" on talk_messages for select
  using (is_talk_member(room_id) or is_guild_admin());
drop policy if exists "talk_messages_insert" on talk_messages;
create policy "talk_messages_insert" on talk_messages for insert
  with check (sender_id = auth.uid() and is_talk_member(room_id));

grant all privileges on table public.talk_rooms    to anon, authenticated, service_role;
grant all privileges on table public.talk_members  to anon, authenticated, service_role;
grant all privileges on table public.talk_messages to anon, authenticated, service_role;

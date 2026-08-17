-- ============================================================
-- Migration v6a: トークルームの診断と修復（案2ブランチ用）
-- 症状: マッチ成立したのに /talks が「まだトークルームがありません」
-- 実行者: 人間（Supabase SQL Editor）。v6 実行後に流す。何度実行しても安全。
-- ============================================================

-- ------------------------------------------------------------
-- 【1】診断: まずこの3つを実行して結果を確認する
-- ------------------------------------------------------------

-- 1-1. テーブルが存在するか（3行返らなければ v6 が未実行）
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('talk_rooms', 'talk_members', 'talk_messages');

-- 1-2. talk_rooms の閲覧ポリシーに「依頼者(creator_id)」が含まれているか
--      qual に creator_id が出てこなければ、古い版の v6 が適用されている
select policyname, qual from pg_policies where tablename = 'talk_rooms';

-- 1-3. 承認済み応募に対してルームができているか（room_id が null なら未作成）
select q.title, q.id as quest_id, a.applicant_id, a.status, r.id as room_id
from quest_applications a
join quests q on q.id = a.quest_id
left join talk_rooms r on r.quest_id = q.id
where a.status = 'accepted';

-- ------------------------------------------------------------
-- 【2】修復: 以下をまとめて実行する
-- ------------------------------------------------------------

-- 2-1. ポリシーを正しい版に貼り直す
--      ※ 依頼者は「メンバー登録される前」にルームを参照する必要があるため、
--        creator_id 条件が無いと INSERT 直後の RETURNING が RLS で弾かれ、
--        ルーム作成がまるごと失敗する（これが今回の症状の原因）。
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

drop policy if exists "talk_rooms_select" on talk_rooms;
create policy "talk_rooms_select" on talk_rooms for select
  using (
    is_talk_member(id) or is_guild_admin()
    or exists (select 1 from quests where quests.id = quest_id and quests.creator_id = auth.uid())
  );

drop policy if exists "talk_rooms_insert" on talk_rooms;
create policy "talk_rooms_insert" on talk_rooms for insert
  with check (exists (select 1 from quests where quests.id = quest_id and quests.creator_id = auth.uid()));

drop policy if exists "talk_members_select" on talk_members;
create policy "talk_members_select" on talk_members for select
  using (is_talk_member(room_id) or is_guild_admin());

drop policy if exists "talk_members_insert" on talk_members;
create policy "talk_members_insert" on talk_members for insert
  with check (exists (
    select 1 from talk_rooms r join quests q on q.id = r.quest_id
    where r.id = room_id and q.creator_id = auth.uid()
  ));

-- 2-2. すでに成立済みのマッチにルームを後追いで作る（バックフィル）
insert into talk_rooms (quest_id)
select distinct q.id
from quests q
join quest_applications a on a.quest_id = q.id and a.status = 'accepted'
where not exists (select 1 from talk_rooms r where r.quest_id = q.id);

-- 依頼者を参加させる
insert into talk_members (room_id, profile_id)
select r.id, q.creator_id
from talk_rooms r
join quests q on q.id = r.quest_id
on conflict (room_id, profile_id) do nothing;

-- 承認済み応募者を参加させる
insert into talk_members (room_id, profile_id)
select r.id, a.applicant_id
from talk_rooms r
join quest_applications a on a.quest_id = r.quest_id and a.status = 'accepted'
on conflict (room_id, profile_id) do nothing;

-- ------------------------------------------------------------
-- 【3】確認: 全ての承認済み応募にルームとメンバーが揃ったか
-- ------------------------------------------------------------
select q.title, r.id as room_id, count(m.profile_id) as members
from quest_applications a
join quests q on q.id = a.quest_id
left join talk_rooms r on r.quest_id = q.id
left join talk_members m on m.room_id = r.id
where a.status = 'accepted'
group by q.title, r.id;
-- members が 2 以上（依頼者+応募者）になっていれば成功。
-- この後アプリをリロードすると /talks にルームが表示される。

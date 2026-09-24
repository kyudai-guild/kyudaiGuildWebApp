-- ============================================================
-- Migration v20: 団体長（団体側での所属管理）とトークの人員管理
-- 実行者: 人間（Supabase SQL Editor）
-- 前提: v13・v14・v15・v19 実行後
--
-- 背景（2026-09 運営会議）:
--   - 所属団体の登録を、運営だけでなく団体側でも行えるようにする
--   - 担えるのは運営が指名した「団体長」だけ。メールアドレスを入力して所属を追加する
--   - 団体単位の運用になるので、団体長がクエストのトークに入れる人員を決められるようにする
--
-- セキュリティの考え方:
--   - 所属すると団体名義でクエストを出せる。追加できる人を団体長に絞る
--   - 団体長を作れるのは運営だけ（団体長が団体長を増やせると権限が際限なく広がる）
--   - すべてDBの権限で強制する。画面やAPIだけで守ると、公開鍵で直接DBを
--     叩かれたときに素通りされる（v14 で直した問題と同じ）
--
-- ⚠️ 反映の順番: v19 → v20 → v21 を実行してから、アプリを本番に反映（push）すること。
-- ============================================================

-- ------------------------------------------------------------
-- ① 所属に役割を持たせる
-- ------------------------------------------------------------
alter table profile_organizations add column if not exists role text not null default 'member';
alter table profile_organizations drop constraint if exists profile_organizations_role_check;
alter table profile_organizations add constraint profile_organizations_role_check
  check (role in ('member', 'manager'));

create index if not exists idx_profile_orgs_manager
  on profile_organizations (profile_id, organization_id) where role = 'manager';

-- 自分がその団体の団体長か。
-- profile_organizations のポリシーから profile_organizations を読むと無限再帰になるので
-- security definer 関数に逃がす（v6 の is_talk_member と同じ定石）。
create or replace function public.is_org_manager(p_org uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from profile_organizations
    where organization_id = p_org and profile_id = auth.uid() and role = 'manager'
  );
$$;

-- ------------------------------------------------------------
-- ② 所属の追加・削除・役割変更の権限
--   - 追加: 運営、または団体長が「一般メンバーとして」追加する場合のみ
--   - 削除: 運営、または団体長が「一般メンバー」を外す場合のみ（団体長は外せない）
--   - 役割の変更（団体長の指名・解除）: 運営のみ
-- ------------------------------------------------------------
drop policy if exists "profile_organizations_insert" on profile_organizations;
create policy "profile_organizations_insert" on profile_organizations for insert
  with check (
    is_guild_admin()
    or (is_org_manager(organization_id) and role = 'member')
  );

drop policy if exists "profile_organizations_delete" on profile_organizations;
create policy "profile_organizations_delete" on profile_organizations for delete
  using (
    is_guild_admin()
    or (is_org_manager(organization_id) and role = 'member')
  );

drop policy if exists "profile_organizations_update" on profile_organizations;
create policy "profile_organizations_update" on profile_organizations for update
  using (is_guild_admin()) with check (is_guild_admin());

-- ------------------------------------------------------------
-- ③ 団体情報の編集
--   団体長が編集できるのは「団体の紹介」と「問い合わせ先」だけ。
--   団体名・有効/無効・並び順は運営のみ。列単位の制御はRLSで書けないのでトリガーで守る。
-- ------------------------------------------------------------
drop policy if exists "organizations_update" on organizations;
create policy "organizations_update" on organizations for update
  using (is_guild_admin() or is_org_manager(id))
  with check (is_guild_admin() or is_org_manager(id));

create or replace function public.protect_organization_columns()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null or is_guild_admin() then
    return new;
  end if;
  if new.name is distinct from old.name
  or new.is_active is distinct from old.is_active
  or new.sort_order is distinct from old.sort_order then
    raise exception '団体長が変更できるのは、団体の紹介と問い合わせ先だけです。';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_organization_columns on organizations;
create trigger protect_organization_columns
  before update on organizations
  for each row execute function public.protect_organization_columns();

-- ------------------------------------------------------------
-- ④ 当日の受け入れ担当者（v19）を、その団体の団体長も見られるようにする
-- ------------------------------------------------------------
drop policy if exists "quest_private_details_select" on quest_private_details;
create policy "quest_private_details_select" on quest_private_details for select using (
  exists (select 1 from quests q where q.id = quest_id and q.creator_id = auth.uid())
  or exists (select 1 from quests q where q.id = quest_id and q.organization_id is not null and is_org_manager(q.organization_id))
  or is_guild_admin()
);

-- ------------------------------------------------------------
-- ⑤ メールアドレスから利用者を探す関数（団体長の「メールで追加」用）
--   サーバー（service_role）からだけ呼べる。一般ユーザーに開くと、
--   任意のアドレスが登録済みかどうかを調べ放題になるため。
--   返すのはIDだけで、表示名などは返さない。
-- ------------------------------------------------------------
create or replace function public.profile_id_by_email(p_email text)
returns uuid
language sql security definer stable
set search_path = public
as $$
  select id from profiles where lower(email) = lower(trim(p_email)) limit 1;
$$;

revoke all on function public.profile_id_by_email(text) from public;
revoke all on function public.profile_id_by_email(text) from anon, authenticated;
grant execute on function public.profile_id_by_email(text) to service_role;

-- ------------------------------------------------------------
-- ⑥ 団体長の操作記録
--   すべての追加・削除（見つからなかった試行も含む）を残す。
--   - 運営が事後に確認できるように
--   - 回数の上限（総当たりでアドレスを探られないように）の判定に使う
--   書き込みはサーバー（service_role）からのみ。閲覧は運営のみ。
-- ------------------------------------------------------------
create table if not exists org_manager_actions (
  id                uuid primary key default gen_random_uuid(),
  actor_id          uuid references profiles(id) on delete set null,
  organization_id   uuid references organizations(id) on delete cascade,
  action            text not null,   -- add_member / add_member_not_found / add_member_already / remove_member / add_talk_staff / remove_talk_staff
  target_email      text,
  target_profile_id uuid references profiles(id) on delete set null,
  created_at        timestamptz default now()
);

create index if not exists idx_org_manager_actions_actor on org_manager_actions (actor_id, created_at desc);

alter table org_manager_actions enable row level security;

drop policy if exists "org_manager_actions_select" on org_manager_actions;
create policy "org_manager_actions_select" on org_manager_actions for select using (is_guild_admin());
-- insert / update / delete のポリシーは作らない（service_role 以外は書けない）

grant all privileges on table public.org_manager_actions to service_role;
grant select on table public.org_manager_actions to authenticated;

-- ------------------------------------------------------------
-- ⑦ トークの人員
--   団体長は、自分の団体のクエストのトークに「同じ団体のメンバー」を追加・削除できる。
--   応募して承認された学生と、掲示した本人は外せない。
-- ------------------------------------------------------------
create or replace function public.can_manage_talk_staff(p_room uuid, p_profile uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1
    from talk_rooms r
    join quests q on q.id = r.quest_id
    where r.id = p_room
      and q.organization_id is not null
      and is_org_manager(q.organization_id)
      -- 対象は同じ団体の所属者だけ
      and exists (
        select 1 from profile_organizations po
        where po.organization_id = q.organization_id and po.profile_id = p_profile
      )
      -- 掲示した本人は外せない
      and p_profile <> q.creator_id
      -- 承認済みの応募者（学生）は外せない
      and not exists (
        select 1 from quest_applications a
        where a.quest_id = q.id and a.applicant_id = p_profile and a.status = 'accepted'
      )
  );
$$;

-- 自分が団体長を務める団体のクエストのトークか（部屋と人員の閲覧用）
create or replace function public.is_talk_org_manager(p_room uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from talk_rooms r join quests q on q.id = r.quest_id
    where r.id = p_room and q.organization_id is not null and is_org_manager(q.organization_id)
  );
$$;

drop policy if exists "talk_rooms_select" on talk_rooms;
create policy "talk_rooms_select" on talk_rooms for select
  using (
    is_talk_member(id) or is_guild_admin() or is_talk_org_manager(id)
    or exists (select 1 from quests where quests.id = quest_id and quests.creator_id = auth.uid())
  );

drop policy if exists "talk_members_select" on talk_members;
create policy "talk_members_select" on talk_members for select
  using (is_talk_member(room_id) or is_guild_admin() or is_talk_org_manager(room_id));

-- 追加できるのは:
--   - 掲示した本人が、自分自身と「承認済みの応募者」を入れる（マッチング成立時の処理）
--   - 団体長が、同じ団体のメンバーを入れる
--   - 運営
-- 以前は「掲示した本人なら誰でも入れられる」状態だった。
drop policy if exists "talk_members_insert" on talk_members;
create policy "talk_members_insert" on talk_members for insert
  with check (
    is_guild_admin()
    or exists (
      select 1 from talk_rooms r join quests q on q.id = r.quest_id
      where r.id = room_id and q.creator_id = auth.uid()
        and (
          profile_id = auth.uid()
          or exists (
            select 1 from quest_applications a
            where a.quest_id = q.id and a.applicant_id = profile_id and a.status = 'accepted'
          )
        )
    )
    or can_manage_talk_staff(room_id, profile_id)
  );

drop policy if exists "talk_members_delete" on talk_members;
create policy "talk_members_delete" on talk_members for delete
  using (is_guild_admin() or can_manage_talk_staff(room_id, profile_id));

-- ------------------------------------------------------------
-- 確認用
-- ------------------------------------------------------------
-- 団体長を指名する（管理画面の「団体長にする」と同じこと）
-- update profile_organizations set role = 'manager'
-- where organization_id = (select id from organizations where name = '団体名')
--   and profile_id = (select id from profiles where lower(email) = lower('someone@s.kyushu-u.ac.jp'));

-- 団体長の一覧
-- select o.name, p.email from profile_organizations po
-- join organizations o on o.id = po.organization_id
-- join profiles p on p.id = po.profile_id
-- where po.role = 'manager' order by o.name;

-- 団体長の操作記録
-- select a.created_at, p.email as actor, o.name, a.action, a.target_email
-- from org_manager_actions a
-- left join profiles p on p.id = a.actor_id
-- left join organizations o on o.id = a.organization_id
-- order by a.created_at desc limit 50;

-- 関数が一般ユーザーから呼べないこと（false が返れば正しい）
-- select has_function_privilege('authenticated', 'public.profile_id_by_email(text)', 'execute');

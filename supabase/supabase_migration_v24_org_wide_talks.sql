-- ============================================================
-- Migration v24: トークと応募の運用を「団体の所属者全員」に広げる（2026-09-27）
-- 前提: v20（団体長・トークの人員）実行後
--
-- 以前は団体長だけができたことを、掲示した団体の所属者なら誰でもできるようにする:
--   - 自分の団体のクエストのトークを、参加していなくても一覧で見て、自分で参加する
--   - トークに団体のメンバーを追加・削除する
-- あわせて、掲示した本人も「追加・削除できる人」に含める
-- （承認時の最初の参加者が「承認した人・団体長・学生」になり、掲示した本人が
--   最初から入っているとは限らなくなったため）。承認済みの学生は引き続き外せない。
--
-- 応募の承認・見送り・完了報告は、アプリ（API）が所属を確かめたうえでサーバー権限で行う。
-- ============================================================

-- 自分がその団体の所属者か（団体長・一般メンバーを問わない）
create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select p_org is not null and exists (
    select 1 from profile_organizations
    where organization_id = p_org and profile_id = auth.uid()
  );
$$;

-- トークの人員を変更できるか
--   - 操作する人: 掲示した団体の所属者（以前は団体長だけ）
--   - 対象: 同じ団体の所属者（掲示した本人も含む。以前は外せなかった）
--   - 承認済みの応募者（学生）は対象にしない（外せない）
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
      and is_org_member(q.organization_id)
      and exists (
        select 1 from profile_organizations po
        where po.organization_id = q.organization_id and po.profile_id = p_profile
      )
      and not exists (
        select 1 from quest_applications a
        where a.quest_id = q.id and a.applicant_id = p_profile and a.status = 'accepted'
      )
  );
$$;

-- 自分が所属する団体のクエストのトークか（部屋と人員の閲覧用。以前の is_talk_org_manager の置き換え）
create or replace function public.is_talk_org_member(p_room uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from talk_rooms r join quests q on q.id = r.quest_id
    where r.id = p_room and is_org_member(q.organization_id)
  );
$$;

drop policy if exists "talk_rooms_select" on talk_rooms;
create policy "talk_rooms_select" on talk_rooms for select
  using (
    is_talk_member(id) or is_guild_admin() or is_talk_org_member(id)
    or exists (select 1 from quests where quests.id = quest_id and quests.creator_id = auth.uid())
  );

drop policy if exists "talk_members_select" on talk_members;
create policy "talk_members_select" on talk_members for select
  using (is_talk_member(room_id) or is_guild_admin() or is_talk_org_member(room_id));

-- クエストの閲覧: 自分の団体の名義のクエストは、審査中・完了後も見られるようにする
-- （トーク画面でクエスト名を出すため。管理者の判定も profiles を直接読まない形にそろえる）
drop policy if exists "quests_select" on quests;
create policy "quests_select" on quests for select
  using (
    (status = 'approved' and auth.role() = 'authenticated')
    or creator_id = auth.uid()
    or is_guild_admin()
    or is_org_member(organization_id)
  );

-- ------------------------------------------------------------
-- 確認用
-- ------------------------------------------------------------
-- select proname from pg_proc where proname in ('is_org_member', 'is_talk_org_member');  → 2行
-- select policyname, qual from pg_policies where tablename in ('talk_rooms', 'talk_members', 'quests') and cmd = 'SELECT';

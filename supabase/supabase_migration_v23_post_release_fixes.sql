-- ============================================================
-- Migration v23: 2026-09 リリース後のセキュリティチェックで見つかった修正
-- 実行者: 人間（Supabase SQL Editor）
-- 前提: v19〜v22 実行後（v22 の前でも実行してよい）
-- ============================================================

-- ------------------------------------------------------------
-- ① 未ログインでイベントカレンダーが開けなくなる問題（v22 の副作用）
--   events_select は中で profiles を直接読んでいる。PostgreSQL はポリシー内の
--   テーブルも「閲覧している人の権限」で確かめるため、v22 で profiles の
--   閲覧権限を外した anon（未ログイン）は、イベントの取得ごと権限エラーになる。
--   security definer の is_guild_admin() 経由にして、profiles を直接読まないようにする。
-- ------------------------------------------------------------
drop policy if exists "events_select" on events;
create policy "events_select" on events for select using (
  status = 'approved'
  or organizer_id = auth.uid()
  or is_guild_admin()
);

-- ------------------------------------------------------------
-- ② 団体長の操作記録を「API を通らない操作」でも必ず残す
--   団体長は DB の権限上、自分の団体に所属を追加・削除できる（v20）。
--   記録と Slack 通知は API 側で行っているため、公開鍵で直接 DB を叩かれると
--   記録を残さずに追加・削除できてしまう。DB のトリガーで、実際の変更を必ず記録する。
--   - 記録名は db_add_member / db_remove_member（API の記録 add_member などとは別名）
--   - API を通った追加は「add_member」と「db_add_member」の2行になる。
--     db_ の行だけで API 側の行が無いものは、API を通らずに行われた操作
--   - 運営（admin）と service_role（SQL Editor など）の操作は記録しない
-- ------------------------------------------------------------
create or replace function public.log_manager_membership_change()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_row profile_organizations%rowtype;
begin
  if auth.uid() is null or is_guild_admin() then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT' then v_row := new; else v_row := old; end if;
  insert into org_manager_actions (actor_id, organization_id, action, target_email, target_profile_id)
  values (
    auth.uid(),
    v_row.organization_id,
    case when tg_op = 'INSERT' then 'db_add_member' else 'db_remove_member' end,
    (select email from profiles where id = v_row.profile_id),
    v_row.profile_id
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists log_manager_membership_change on profile_organizations;
create trigger log_manager_membership_change
  after insert or delete on profile_organizations
  for each row execute function public.log_manager_membership_change();

-- 同じく、1時間あたりの追加回数の上限も DB 側で強制する（API と同じ20回）。
-- 成功した追加は db_add_member で数える（API の add_member も数えると二重になるため除く）。
create or replace function public.limit_manager_membership_adds()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if auth.uid() is null or is_guild_admin() then
    return new;
  end if;
  select count(*) into v_count
  from org_manager_actions
  where actor_id = auth.uid()
    and action in ('add_member_not_found', 'add_member_already', 'db_add_member')
    and created_at > now() - interval '1 hour';
  if v_count >= 20 then
    raise exception '追加の操作が多すぎます。しばらくしてからお試しください。';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_manager_membership_adds on profile_organizations;
create trigger limit_manager_membership_adds
  before insert on profile_organizations
  for each row execute function public.limit_manager_membership_adds();

-- ------------------------------------------------------------
-- ③ クエストの写真のパスを DB 側でも確かめる
--   API では「本人のフォルダの画像か」を確かめているが、DB を直接叩かれると
--   任意のパス（他人の写真など）を指定できた。掲示前に運営の審査があるので
--   影響は小さいが、塞いでおく。
-- ------------------------------------------------------------
create or replace function public.check_quest_photo_path()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null or is_guild_admin() or new.photo_path is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.photo_path is not distinct from old.photo_path then
    return new;
  end if;
  if new.photo_path !~ ('^' || new.creator_id::text || '/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$') then
    raise exception '写真の指定が正しくありません。';
  end if;
  return new;
end;
$$;

drop trigger if exists check_quest_photo_path on quests;
create trigger check_quest_photo_path
  before insert or update on quests
  for each row execute function public.check_quest_photo_path();

-- ------------------------------------------------------------
-- 確認用
-- ------------------------------------------------------------
-- select tgname from pg_trigger
-- where tgname in ('log_manager_membership_change', 'limit_manager_membership_adds', 'check_quest_photo_path');
-- → 3行返れば成功

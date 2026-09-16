-- ============================================================
-- Migration v14: RLS の穴をふさぐ（セキュリティ修正）
-- 実行者: 人間（Supabase SQL Editor）
-- 前提: v13 実行後（is_guild_admin() を使うため。念のため本文でも再定義する）
--
-- 背景:
--   NEXT_PUBLIC_SUPABASE_ANON_KEY はブラウザに配られる公開値なので、
--   ログイン中のユーザーは自分のJWTで Supabase の REST API を直接叩ける。
--   つまり「アプリのAPIルートを通らない経路」が常に存在し、RLS が最後の砦になる。
--
--   既存のポリシーは update に with check を書いていなかった。PostgreSQL は
--   「update の with check が無い場合、using を with check としても使う」
--   ため、更新後の行は using しか検査されない。その結果:
--
--     ① profiles_update using (auth.uid() = id)
--        → 自分の行の role を 'admin' に書き換えても using は成立する。
--          誰でも運営になれてしまう（権限昇格）。
--     ② quests_update using (auth.uid() = creator_id or 管理者)
--        → 依頼者が自分のクエストを status='approved' に書き換えられる。
--          審査を通さず掲示板に載せられる。
--     ③ quests_insert with check (auth.uid() = creator_id)
--        → 最初から status='approved' で作れる。所属していない団体の
--          organization_id / organization_name も自由に入れられる（名義詐称）。
--     ④ quest_applications_insert with check (auth.uid() = applicant_id)
--        → status='accepted' で応募を作れる。自分でマッチを成立させて
--          依頼者のメールアドレスを見られる。
--
--   列ごとの制御は RLS の式では書きにくい（OLD を参照できない）ため、
--   BEFORE トリガーで守る。トリガーは auth.uid() が NULL のとき（= service_role
--   や SQL Editor からの操作）は素通しするので、運営の手作業は今までどおり。
-- ============================================================

create or replace function public.is_guild_admin()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ------------------------------------------------------------
-- ① 権限昇格を止める
--    role はアプリ経由では変更させない。運営は SQL Editor で変更する
--    （docs/admin-operations.md の手順。auth.uid() が NULL なので素通りする）。
-- ------------------------------------------------------------
create or replace function public.protect_profile_role()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    raise exception '権限(role)はアプリから変更できません。';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on profiles;
create trigger protect_profile_role
  before update on profiles
  for each row execute function public.protect_profile_role();

-- 表示名の変更（MemberCard / プロフィール編集）は今までどおり通る。
drop policy if exists "profiles_update" on profiles;
create policy "profiles_update" on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- ------------------------------------------------------------
-- ② 審査の自己承認を止める
--    依頼者が自分で status を変えてよいのは「完了報告」だけ。
--    承認・リジェクト・審査者・掲示終了日は運営しか触れない。
-- ------------------------------------------------------------
create or replace function public.protect_quest_review()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  -- service_role / SQL Editor と運営はそのまま通す
  if auth.uid() is null or is_guild_admin() then
    return new;
  end if;

  if new.status is distinct from old.status and new.status <> 'completed' then
    raise exception 'クエストの状態は運営の審査でのみ変更されます。';
  end if;

  if new.reviewed_by       is distinct from old.reviewed_by
  or new.reviewed_at       is distinct from old.reviewed_at
  or new.rejection_reason  is distinct from old.rejection_reason
  or new.effective_end_date is distinct from old.effective_end_date then
    raise exception '審査に関する項目は変更できません。';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_quest_review on quests;
create trigger protect_quest_review
  before update on quests
  for each row execute function public.protect_quest_review();

-- 新規クエストは必ず審査待ちから始まる
drop policy if exists "quests_insert" on quests;
create policy "quests_insert" on quests for insert with check (
  auth.uid() = creator_id
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and effective_end_date is null
);

drop policy if exists "quests_update" on quests;
create policy "quests_update" on quests for update
  using  (auth.uid() = creator_id or is_guild_admin())
  with check (auth.uid() = creator_id or is_guild_admin());

-- ------------------------------------------------------------
-- ③ 団体名義の詐称を止める
--    organization_name はクライアントが送った値を信用せず、
--    承認済みの所属から DB 側で確定させる。
--    団体欄を触っていない更新（運営の審査など）は素通しするので、
--    申請時点のスナップショットは後から書き換わらない。
-- ------------------------------------------------------------
create or replace function public.enforce_quest_organization()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.organization_id   is not distinct from old.organization_id
     and new.organization_name is not distinct from old.organization_name then
    return new;
  end if;

  if new.organization_id is null then
    new.organization_name := null;
    return new;
  end if;

  select o.name into v_name
  from profile_organizations po
  join organizations o on o.id = po.organization_id
  where po.profile_id      = new.creator_id
    and po.organization_id = new.organization_id
    and o.is_active;

  if v_name is null then
    raise exception '所属が承認されていない団体では申請できません。';
  end if;

  new.organization_name := v_name;
  return new;
end;
$$;

drop trigger if exists enforce_quest_organization on quests;
create trigger enforce_quest_organization
  before insert or update on quests
  for each row execute function public.enforce_quest_organization();

-- ------------------------------------------------------------
-- ④ 応募の自己承認を止める
--    応募は必ず「検討中」から始まる。承認できるのは依頼者と運営だけ
--    （quest_applications_update は v5 でその条件になっている）。
-- ------------------------------------------------------------
drop policy if exists "quest_applications_insert" on quest_applications;
create policy "quest_applications_insert" on quest_applications for insert with check (
  auth.uid() = applicant_id and status = 'pending'
);

-- ------------------------------------------------------------
-- 確認用
-- ------------------------------------------------------------
-- トリガーが4本入っているか
-- select tgname, tgrelid::regclass as table_name
-- from pg_trigger
-- where not tgisinternal
--   and tgname in ('protect_profile_role','protect_quest_review','enforce_quest_organization')
-- order by tgrelid::regclass::text, tgname;

-- update ポリシーに with check が入ったか（qual=using, with_check=with check）
-- select tablename, policyname, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('profiles','quests','quest_applications')
-- order by tablename, policyname;

-- 権限昇格が止まっているかの手動テスト（一般ユーザーのセッションで実行すること）:
--   update profiles set role = 'admin' where id = auth.uid();
--   → ERROR: 権限(role)はアプリから変更できません。
--
-- 自己承認が止まっているかの手動テスト（依頼者のセッションで）:
--   update quests set status = 'approved' where creator_id = auth.uid();
--   → ERROR: クエストの状態は運営の審査でのみ変更されます。

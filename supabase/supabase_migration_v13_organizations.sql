-- ============================================================
-- Migration v13: 所属団体タグ
--   ① 団体マスタ（運営が追加・編集。削除は論理削除）
--   ② ユーザーと団体の所属（付与できるのは運営のみ）
--   ③ ユーザーからの所属申請（メッセージ付き。運営が承認/却下）
--   ④ クエストに「どの団体からの申請か」を持たせる
-- 実行者: 人間（Supabase SQL Editor）
--
-- 背景:
--   試行段階として、関連団体に所属するユーザーからのクエストのみを受注する
--   運用になった。審査時にどの団体からの申請かを確認できるようにする。
--
-- 設計方針:
--   利用目的・興味分野（v5）と同じ「マスタ + 多対多 + is_active による論理削除」
--   の形にそろえている。団体が増減してもアプリの改修は不要。
-- ============================================================

-- ------------------------------------------------------------
-- 管理者判定（v6 で作成済みだが、v6 未実行でも動くようここでも定義する）
--   RLS から profiles を直接参照すると、profiles 自身のポリシーと
--   相互参照して無限再帰になるため security definer 関数を使う。
-- ------------------------------------------------------------
create or replace function public.is_guild_admin()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- ------------------------------------------------------------
-- ① 団体マスタ
--    削除は is_active = false の論理削除。
--    実削除するとクエストや所属の履歴が壊れるため、通常は使わない。
-- ------------------------------------------------------------
--    列名は purpose_options / interest_options の label ではなく name にしている。
--    団体名を label と呼ぶのは読みにくいため。表示側は明示的に name を select する
--    （/api/users/[id] の pickLabels は o.label 固定なので、団体には使い回さない）。
create table if not exists organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz default now()
);

create index if not exists idx_organizations_active on organizations (is_active, sort_order);

-- 初期データは入れていない。運営が管理画面（/admin → 団体管理）から追加する。
-- SQL から入れる場合の例:
--   insert into organizations (name, description, sort_order)
--   values ('九大ギルド運営', '本サービスの運営団体', 1)
--   on conflict (name) do nothing;

-- ------------------------------------------------------------
-- ② 所属（多対多）
--    付与・剥奪ができるのは運営のみ。ユーザーは自分では付けられない。
-- ------------------------------------------------------------
create table if not exists profile_organizations (
  profile_id      uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  granted_by      uuid references profiles(id) on delete set null, -- 付与した運営
  created_at      timestamptz default now(),
  primary key (profile_id, organization_id)
);

create index if not exists idx_profile_orgs_org on profile_organizations (organization_id);

-- ------------------------------------------------------------
-- ③ 所属申請
--    organization_id が NULL の場合は「マスタに無い団体」の申請。
--    その場合 requested_name に名称が入り、運営が承認時に団体を作る。
-- ------------------------------------------------------------
create table if not exists organization_requests (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references profiles(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  requested_name  text,                    -- マスタに無い団体を申請するとき
  message         text,                    -- 誰が申請しているか運営が判断するための補足
  status          text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected')),
  reviewed_by     uuid references profiles(id) on delete set null,
  reviewed_at     timestamptz,
  review_note     text,                    -- 却下理由など
  created_at      timestamptz default now(),
  -- 既存団体への申請か、新規団体名の申請か、どちらかは必ず埋まっていること
  constraint organization_requests_target_check
    check (organization_id is not null or nullif(btrim(requested_name), '') is not null)
);

create index if not exists idx_org_requests_status  on organization_requests (status, created_at desc);
create index if not exists idx_org_requests_profile on organization_requests (profile_id, created_at desc);

-- 同じ団体に対する審査待ちの申請を重複して出せないようにする
create unique index if not exists uq_org_requests_pending_existing
  on organization_requests (profile_id, organization_id)
  where status = 'pending' and organization_id is not null;

-- ------------------------------------------------------------
-- ④ クエストに申請元の団体を持たせる
--    organization_name は申請時点のスナップショット。
--    団体が改名・論理削除されても「当時どう名乗っていたか」が残る。
-- ------------------------------------------------------------
alter table quests add column if not exists organization_id   uuid references organizations(id) on delete set null;
alter table quests add column if not exists organization_name text;

create index if not exists idx_quests_organization on quests (organization_id);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table organizations          enable row level security;
alter table profile_organizations  enable row level security;
alter table organization_requests  enable row level security;

-- 団体マスタ: 閲覧はログインユーザーのみ。
--   v5 のマスタ（purpose_options 等）は using (true) だが、あちらに倣うと
--   anon キーの REST 直叩きで提携団体の一覧が未ログインでも読めてしまう。
--   v10 で掲示板をログイン限定に締めた方針に合わせる。
--   /api/quests の埋め込み（organization:organization_id (...)）はユーザー
--   セッション＝authenticated で動くので、これで問題なく引ける。
drop policy if exists "organizations_select" on organizations;
create policy "organizations_select" on organizations for select
  using (auth.role() = 'authenticated');

drop policy if exists "organizations_insert" on organizations;
create policy "organizations_insert" on organizations for insert with check (is_guild_admin());

-- 既存の update ポリシーは using のみだが、ここでは with check も付ける。
-- using だけだと「更新後の行」が検査されないため、条件を満たさない状態へ
-- 書き換える余地が残る。締める方向の逸脱なので意図的に揃えていない。
drop policy if exists "organizations_update" on organizations;
create policy "organizations_update" on organizations for update
  using (is_guild_admin()) with check (is_guild_admin());

-- 所属: 閲覧はログインユーザー全員（依頼者・応募者のプロフィールに出すため）。
--       付与・剥奪は運営のみ。ユーザーが自分に付けられないことが重要。
drop policy if exists "profile_organizations_select" on profile_organizations;
create policy "profile_organizations_select" on profile_organizations for select
  using (auth.role() = 'authenticated');

drop policy if exists "profile_organizations_insert" on profile_organizations;
create policy "profile_organizations_insert" on profile_organizations for insert
  with check (is_guild_admin());

drop policy if exists "profile_organizations_delete" on profile_organizations;
create policy "profile_organizations_delete" on profile_organizations for delete
  using (is_guild_admin());

-- 申請: 本人と運営のみ閲覧（申請メッセージは他人に見せない）。
--       作成は本人の pending のみ。status を 'approved' にして作ることはできない。
--       審査（update）は運営のみ。
drop policy if exists "organization_requests_select" on organization_requests;
create policy "organization_requests_select" on organization_requests for select
  using (profile_id = auth.uid() or is_guild_admin());

drop policy if exists "organization_requests_insert" on organization_requests;
create policy "organization_requests_insert" on organization_requests for insert
  with check (profile_id = auth.uid() and status = 'pending' and reviewed_by is null);

drop policy if exists "organization_requests_update" on organization_requests;
create policy "organization_requests_update" on organization_requests for update
  using (is_guild_admin()) with check (is_guild_admin());

-- 本人は審査待ちの申請を取り下げられる
drop policy if exists "organization_requests_delete" on organization_requests;
create policy "organization_requests_delete" on organization_requests for delete
  using (profile_id = auth.uid() and status = 'pending');

-- 権限付与
grant all privileges on table public.organizations         to anon, authenticated, service_role;
grant all privileges on table public.profile_organizations to anon, authenticated, service_role;
grant all privileges on table public.organization_requests to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 確認用
-- ------------------------------------------------------------
-- 3テーブルと quests の列ができているか
-- select
--   (select count(*) from information_schema.tables  where table_name = 'organizations')         as organizations,
--   (select count(*) from information_schema.tables  where table_name = 'profile_organizations') as profile_organizations,
--   (select count(*) from information_schema.tables  where table_name = 'organization_requests') as organization_requests,
--   (select count(*) from information_schema.columns where table_name = 'quests' and column_name = 'organization_id') as quests_org_id;

-- 誰がどの団体に所属しているか
-- select p.email, p.display_name, o.name
-- from profile_organizations po
-- join profiles p on p.id = po.profile_id
-- join organizations o on o.id = po.organization_id
-- order by o.sort_order, p.email;

-- 審査待ちの所属申請
-- select r.created_at, p.email, coalesce(o.name, r.requested_name) as org, r.message
-- from organization_requests r
-- join profiles p on p.id = r.profile_id
-- left join organizations o on o.id = r.organization_id
-- where r.status = 'pending'
-- order by r.created_at;

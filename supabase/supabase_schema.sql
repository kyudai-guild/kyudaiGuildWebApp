-- ============================================================
-- 九大ギルド DBスキーマ（実DBの現状: v2 + v3 events + v4 cleanup 適用後）
-- 新規環境はこのファイル1本で構築できる。
-- 適用済みマイグレーション: supabase_migration_v2_*.sql /
--   supabase_migration_v3_events.sql / supabase_migration_v4_cleanup.sql
-- ============================================================

-- ユーザープロフィール（Supabase Auth UIDに紐づく）
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text not null,
  role text default 'user' check (role in ('user', 'admin')),
  tags text[] default '{}',
  created_at timestamptz default now()
);

-- クエスト（ユーザーが作成、管理者が審査）
create table quests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references profiles(id) on delete cascade,
  title text not null,
  description text,
  quest_type text not null,  -- '仲間探し','研究協力','業務委託','ボランティア募集','雇用契約','その他'
  max_applicants int default 1,
  reward text,
  tags text[] default '{}',
  listing_duration_type text check (listing_duration_type in ('weeks', 'date')),
  listing_duration_weeks int,
  listing_end_date date,
  status text default 'pending' check (status in ('pending','approved','rejected','closed')),
  -- 審査関連
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  -- 承認後の掲示終了日（自動計算）
  effective_end_date date,
  created_at timestamptz default now()
);

-- クエスト応募
create table quest_applications (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid references quests(id) on delete cascade,
  applicant_id uuid references profiles(id) on delete cascade,
  message text,
  status text default 'pending' check (status in ('pending','accepted','rejected')),
  applied_at timestamptz default now(),
  unique(quest_id, applicant_id)
);

-- スキルレベル（ユーザーごとのスキル別レベル）
create table skill_levels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  skill_name text not null,
  level int default 0,
  updated_at timestamptz default now(),
  unique(user_id, skill_name)
);

-- イベント（管理者が登録、登録時に即 approved / v3 で追加, v11 でカテゴリ→色+終日に変更）
create table events (
  id               uuid primary key default gen_random_uuid(),
  organizer_id     uuid references profiles(id) on delete cascade,
  title            text not null,
  description      text,
  event_date       timestamptz not null,
  event_end_date   timestamptz,
  all_day          boolean not null default false,
  location         text,
  location_url     text,
  organizer_name   text,          -- 表示用の主催団体名（登録者 organizer_id とは別）
  color            text not null default '#1a4a3a',
  capacity         int,
  tags             text[] default '{}',
  status           text default 'pending'
                   check (status in ('pending','approved','rejected')),
  rejection_reason text,
  reviewed_by      uuid references profiles(id),
  reviewed_at      timestamptz,
  created_at       timestamptz default now()
);

-- ============================================================
-- RLS（Row Level Security）を有効化
-- ============================================================
alter table profiles enable row level security;
alter table quests enable row level security;
alter table quest_applications enable row level security;
alter table skill_levels enable row level security;
alter table events enable row level security;

-- ============================================================
-- profiles ポリシー
-- ============================================================
create policy "profiles_select" on profiles for select using (auth.role() = 'authenticated');
create policy "profiles_update" on profiles for update using (auth.uid() = id);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);

-- ============================================================
-- quests ポリシー
-- ============================================================
-- 閲覧: 承認済みクエストは全員見える / 自分が作ったクエストは全ステータス見える / 管理者は全部見える
create policy "quests_select" on quests for select using (
  status = 'approved'
  OR creator_id = auth.uid()
  OR exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
-- 作成: ログインユーザーが自分のIDで作成
create policy "quests_insert" on quests for insert with check (auth.uid() = creator_id);
-- 更新: 自分のクエスト or 管理者
create policy "quests_update" on quests for update using (
  auth.uid() = creator_id
  OR exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ============================================================
-- quest_applications ポリシー
-- ============================================================
-- 閲覧: 自分の応募 or クエスト作成者 or 管理者
create policy "quest_applications_select" on quest_applications for select using (
  applicant_id = auth.uid()
  OR exists (select 1 from quests where quests.id = quest_applications.quest_id and quests.creator_id = auth.uid())
  OR exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
-- 応募作成
create policy "quest_applications_insert" on quest_applications for insert with check (auth.uid() = applicant_id);

-- ============================================================
-- skill_levels ポリシー
-- ============================================================
create policy "skill_levels_select" on skill_levels for select using (auth.role() = 'authenticated');
create policy "skill_levels_insert" on skill_levels for insert with check (auth.uid() = user_id);
create policy "skill_levels_update" on skill_levels for update using (auth.uid() = user_id);

-- ============================================================
-- events ポリシー（v3 で追加）
-- ============================================================
-- 閲覧: 承認済みは全員 / 作成者は自分のを全件 / 管理者は全件
create policy "events_select" on events for select using (
  status = 'approved'
  OR organizer_id = auth.uid()
  OR exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
-- 登録: 管理者のみ
create policy "events_insert" on events for insert with check (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
-- 更新: 管理者のみ
create policy "events_update" on events for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ============================================================
-- 自動プロフィール作成トリガー
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 権限付与
-- ============================================================
GRANT ALL PRIVILEGES ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.quests TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.quest_applications TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.skill_levels TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON TABLE public.events TO anon, authenticated, service_role;

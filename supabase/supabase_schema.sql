-- ユーザープロフィール（Supabase Auth UIDに紐づく）
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text not null,
  tags text[] default '{}',
  created_at timestamptz default now()
);

-- クエスト（ユーザーが作成）
create table quests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references profiles(id) on delete cascade,
  title text not null,
  description text,
  category text not null, -- 'みつける','たかめる','つながる','つむぐ','ひらく'
  reward text,
  skill_name text not null, -- 紐づけるスキル名
  difficulty text default 'E',
  deadline date,
  status text default 'open', -- 'open', 'completed', 'cancelled'
  created_at timestamptz default now()
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

-- クエスト完了記録テーブル
create table quest_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  quest_id uuid references quests(id) on delete cascade,
  quest_title text not null,
  quest_description text,
  skill_name text not null,
  evaluation_token text unique not null,
  evaluated boolean default false,
  completed_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 評価テーブル
create table evaluations (
  id uuid primary key default gen_random_uuid(),
  quest_completion_id uuid references quest_completions(id) on delete cascade,
  rating_speed int check (rating_speed between 1 and 5),
  rating_quality int check (rating_quality between 1 and 5),
  rating_communication int check (rating_communication between 1 and 5),
  would_request_again boolean,
  comment text,
  created_at timestamptz default now()
);

-- RLS（Row Level Security）を有効化
alter table profiles enable row level security;
alter table quests enable row level security;
alter table skill_levels enable row level security;
alter table quest_completions enable row level security;
alter table evaluations enable row level security;

-- profiles
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);

-- quests
create policy "quests_select" on quests for select using (true);
create policy "quests_insert" on quests for insert with check (auth.uid() = creator_id);
create policy "quests_update" on quests for update using (auth.uid() = creator_id);

-- skill_levels
create policy "skill_levels_select" on skill_levels for select using (true);
-- ※insert/updateはサーバーサイドAPIからadmin経由で行うため、ユーザーには許可しないか適宜調整。
-- 一旦はAPI側からservice_role keyで更新すると想定。
create policy "skill_levels_insert" on skill_levels for insert with check (auth.uid() = user_id);
create policy "skill_levels_update" on skill_levels for update using (auth.uid() = user_id);

-- quest_completions
create policy "quest_completions_select" on quest_completions for select using (true);
create policy "quest_completions_insert" on quest_completions for insert with check (auth.uid() = user_id);
create policy "quest_completions_update" on quest_completions for update using (true);

-- evaluations
create policy "evaluations_select" on evaluations for select using (true);
create policy "evaluations_insert" on evaluations for insert with check (true);

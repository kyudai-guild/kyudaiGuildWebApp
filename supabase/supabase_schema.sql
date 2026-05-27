-- クエスト完了記録テーブル
create table quest_completions (
  id uuid primary key default gen_random_uuid(),
  member_discord_id text not null,
  member_name text not null,
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
alter table quest_completions enable row level security;
alter table evaluations enable row level security;

-- 誰でも読める（公開プロフィール用）
create policy "quest_completions_select" on quest_completions for select using (true);
-- 認証済みユーザーのみ書き込み可
create policy "quest_completions_insert" on quest_completions for insert with check (true);
create policy "quest_completions_update" on quest_completions for update using (true);

-- 評価は誰でも読める・書ける（ログイン不要）
create policy "evaluations_select" on evaluations for select using (true);
create policy "evaluations_insert" on evaluations for insert with check (true);

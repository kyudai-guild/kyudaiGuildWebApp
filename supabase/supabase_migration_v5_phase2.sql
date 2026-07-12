-- ============================================================
-- Migration v5: フェーズ2共通基盤
--   ① 初期設定（利用目的・興味分野マスタ + ユーザー選択）
--   ② プロフィール拡張（資格・自己PR・LINE通知設定）
--   ③ 完了フラグ + 感謝の言葉
--   ④ 共通: 応募の承認（マッチング）用ポリシー + 連絡先公開設定
-- 実行者: 人間（Supabase SQL Editor）
-- 案1（連絡先交換）/案2（トーク）どちらのブランチでも必要。
-- 案2 を試す場合は v6_talk も追加で実行する。
-- ============================================================

-- ------------------------------------------------------------
-- ① 利用目的・興味分野マスタ
--    後から追加・削除できるよう、コードに埋め込まず DB で管理する。
--    削除は is_active = false の論理削除（ユーザーの選択履歴を壊さない）。
-- ------------------------------------------------------------
create table if not exists purpose_options (
  id         uuid primary key default gen_random_uuid(),
  label      text not null unique,
  description text,
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists interest_options (
  id         uuid primary key default gen_random_uuid(),
  label      text not null unique,
  sort_order int  not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz default now()
);

-- 初期データ（あとから SQL Editor で INSERT / UPDATE is_active=false で増減可）
insert into purpose_options (label, description, sort_order) values
  ('お金を稼ぎたい',       '報酬のあるクエストに挑戦', 1),
  ('スキルを身につけたい', '実践しながら成長したい',   2),
  ('実績・経験を積みたい', '就活やポートフォリオに',   3),
  ('仲間を見つけたい',     'プロジェクトの仲間探し',   4),
  ('人の役に立ちたい',     'ボランティア・お手伝い',   5),
  ('面白いことを探したい', 'まずは眺めるだけでもOK',   6)
on conflict (label) do nothing;

insert into interest_options (label, sort_order) values
  ('Webサイト制作', 1), ('プログラミング', 2), ('デザイン', 3),
  ('動画編集', 4), ('ライティング', 5), ('翻訳・語学', 6),
  ('データ分析', 7), ('研究協力', 8), ('イベント運営', 9),
  ('SNS運用', 10), ('家庭教師・指導', 11), ('写真・撮影', 12)
on conflict (label) do nothing;

-- ユーザーの選択（多対多）。マスタ側が論理削除されても行は残り、表示時に絞る。
create table if not exists profile_purposes (
  profile_id uuid not null references profiles(id) on delete cascade,
  purpose_id uuid not null references purpose_options(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (profile_id, purpose_id)
);

create table if not exists profile_interests (
  profile_id  uuid not null references profiles(id) on delete cascade,
  interest_id uuid not null references interest_options(id) on delete cascade,
  created_at  timestamptz default now(),
  primary key (profile_id, interest_id)
);

-- ------------------------------------------------------------
-- ② プロフィール拡張
-- ------------------------------------------------------------
alter table profiles add column if not exists qualifications text[] default '{}'; -- 資格・スキル
alter table profiles add column if not exists bio text;                            -- できること・自己PR
alter table profiles add column if not exists line_notify boolean default true;    -- LINE通知希望
alter table profiles add column if not exists onboarded_at timestamptz;            -- 初期設定完了日時

-- ------------------------------------------------------------
-- ③ クエスト完了フロー + 感謝の言葉
-- ------------------------------------------------------------
alter table quests drop constraint if exists quests_status_check;
alter table quests add constraint quests_status_check
  check (status in ('pending','approved','rejected','closed','completed'));
alter table quests add column if not exists completed_at timestamptz;

create table if not exists quest_thanks (
  id           uuid primary key default gen_random_uuid(),
  quest_id     uuid not null references quests(id) on delete cascade,
  sender_id    uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  message      text not null,
  created_at   timestamptz default now(),
  unique (quest_id, sender_id, recipient_id)
);
create index if not exists idx_quest_thanks_recipient on quest_thanks (recipient_id, created_at desc);
create index if not exists idx_quest_thanks_sender    on quest_thanks (sender_id, created_at desc);

-- ------------------------------------------------------------
-- ④ 共通: マッチング + 連絡先公開設定
-- ------------------------------------------------------------
-- 依頼者の九大メール公開（オプトアウト式: 既定で公開）と希望連絡先（LINE等、任意）
alter table quests add column if not exists contact_email_public boolean not null default true;
alter table quests add column if not exists preferred_contact text;

-- 応募の承認/棄却をクエスト作成者ができるようにする（既存テーブルに update ポリシーが無かった）
drop policy if exists "quest_applications_update" on quest_applications;
create policy "quest_applications_update" on quest_applications for update using (
  exists (select 1 from quests where quests.id = quest_applications.quest_id and quests.creator_id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- 履歴表示用インデックス
create index if not exists idx_quests_creator          on quests (creator_id, created_at desc);
create index if not exists idx_applications_applicant  on quest_applications (applicant_id, applied_at desc);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table purpose_options   enable row level security;
alter table interest_options  enable row level security;
alter table profile_purposes  enable row level security;
alter table profile_interests enable row level security;
alter table quest_thanks      enable row level security;

-- マスタは誰でも閲覧可（未ログインのトップページでは使わないが害もない）
drop policy if exists "purpose_options_select" on purpose_options;
create policy "purpose_options_select" on purpose_options for select using (true);
drop policy if exists "interest_options_select" on interest_options;
create policy "interest_options_select" on interest_options for select using (true);
-- マスタの追加・変更はダッシュボード/SQL Editor から運営が行う（アプリからは不可）

-- 選択: 本人が管理。閲覧はログインユーザー全員（依頼者が応募者プロフィールを見るため）
drop policy if exists "profile_purposes_select" on profile_purposes;
create policy "profile_purposes_select" on profile_purposes for select using (auth.role() = 'authenticated');
drop policy if exists "profile_purposes_insert" on profile_purposes;
create policy "profile_purposes_insert" on profile_purposes for insert with check (profile_id = auth.uid());
drop policy if exists "profile_purposes_delete" on profile_purposes;
create policy "profile_purposes_delete" on profile_purposes for delete using (profile_id = auth.uid());

drop policy if exists "profile_interests_select" on profile_interests;
create policy "profile_interests_select" on profile_interests for select using (auth.role() = 'authenticated');
drop policy if exists "profile_interests_insert" on profile_interests;
create policy "profile_interests_insert" on profile_interests for insert with check (profile_id = auth.uid());
drop policy if exists "profile_interests_delete" on profile_interests;
create policy "profile_interests_delete" on profile_interests for delete using (profile_id = auth.uid());

-- 感謝: 送信者本人のみ作成。当事者と管理者のみ閲覧。
drop policy if exists "quest_thanks_select" on quest_thanks;
create policy "quest_thanks_select" on quest_thanks for select using (
  sender_id = auth.uid() or recipient_id = auth.uid()
  or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
drop policy if exists "quest_thanks_insert" on quest_thanks;
create policy "quest_thanks_insert" on quest_thanks for insert with check (sender_id = auth.uid());

-- 権限付与
grant all privileges on table public.purpose_options   to anon, authenticated, service_role;
grant all privileges on table public.interest_options  to anon, authenticated, service_role;
grant all privileges on table public.profile_purposes  to anon, authenticated, service_role;
grant all privileges on table public.profile_interests to anon, authenticated, service_role;
grant all privileges on table public.quest_thanks      to anon, authenticated, service_role;

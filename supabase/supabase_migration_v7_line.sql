-- ============================================================
-- Migration v7: LINE連携（LINEログイン + 通知）
-- 実行者: 人間（Supabase SQL Editor）。v5 実行後に。
-- 案1・案2どちらのブランチでも共通。
-- ============================================================

-- LINEアカウントとの紐付け情報
alter table profiles add column if not exists line_user_id      text unique; -- LINE の userId（プロバイダー内で一意）
alter table profiles add column if not exists line_display_name text;
alter table profiles add column if not exists line_picture_url  text;
alter table profiles add column if not exists line_linked_at    timestamptz;
alter table profiles add column if not exists line_friend       boolean default false; -- 公式アカウントを友だち追加しているか
-- line_notify（通知ON/OFF）は v5 で追加済み

create index if not exists idx_profiles_line_user_id on profiles (line_user_id);
-- 通知対象の絞り込み用（友だち かつ 通知ON かつ 連携済み）
create index if not exists idx_profiles_line_notify
  on profiles (line_notify) where line_user_id is not null;

-- ------------------------------------------------------------
-- RLS メモ
-- ------------------------------------------------------------
-- profiles の既存ポリシー（select: 認証済み全員 / update: 本人）をそのまま使う。
-- line_user_id の書き込みはサーバー側APIが本人セッションで行うため追加ポリシー不要。
-- ただし「他人の LINE ID を勝手に書き換える」ことは profiles_update（auth.uid() = id）で防がれている。
--
-- 通知送信はサービスロールキーを使うサーバー処理から行うため RLS を経由しない。

-- ------------------------------------------------------------
-- 確認用
-- ------------------------------------------------------------
-- select column_name from information_schema.columns
-- where table_name = 'profiles' and column_name like 'line%';

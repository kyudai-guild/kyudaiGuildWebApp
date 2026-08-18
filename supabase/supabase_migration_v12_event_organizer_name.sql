-- ============================================================
-- Migration v12: イベントに主催団体名を持たせる
-- 実行者: 人間（Supabase SQL Editor）
--
-- 背景:
--   これまで主催欄は登録した管理者アカウント（= 九大ギルド運営）しか出せず、
--   他団体のイベントを代理で登録すると主催が実態と食い違っていた。
--   登録者(organizer_id)とは別に、表示用の主催団体名を持たせる。
-- ============================================================

alter table events add column if not exists organizer_name text;

-- 既存イベントは運営主催だったので、そのまま既定値を入れておく
update events set organizer_name = '九大ギルド運営' where organizer_name is null;

-- ------------------------------------------------------------
-- 確認用
-- ------------------------------------------------------------
-- select title, organizer_name from events order by created_at desc limit 10;

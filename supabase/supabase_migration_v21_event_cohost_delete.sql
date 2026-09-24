-- ============================================================
-- Migration v21: イベントの共催団体と、編集・削除の権限
-- 実行者: 人間（Supabase SQL Editor）
--
-- 背景（2026-09 運営会議）:
--   - 共催のイベントを登録できるようにする（項目4）
--   - イベントを削除する方法が無かった（項目8）。調べると編集もできなかった。
--     API・画面に加えて、DBにも削除の権限（ポリシー）が無かった。
--
-- ⚠️ 反映の順番: v19 → v20 → v21 を実行してから、アプリを本番に反映（push）すること。
-- ============================================================

-- 共催団体（自由入力。学外の団体・行政なども入るため、団体マスタとは紐付けない）
alter table events add column if not exists co_organizer_names text[] not null default '{}';

-- 編集は運営のみ（既存。更新後の行も検査するよう with check を付け直す）
drop policy if exists "events_update" on events;
create policy "events_update" on events for update
  using (is_guild_admin()) with check (is_guild_admin());

-- 削除は運営のみ（これまでポリシーが無く、誰も削除できなかった）
drop policy if exists "events_delete" on events;
create policy "events_delete" on events for delete
  using (is_guild_admin());

-- ------------------------------------------------------------
-- 確認用
-- ------------------------------------------------------------
-- select
--   (select count(*) from information_schema.columns where table_name = 'events' and column_name = 'co_organizer_names') as cohost_col,
--   (select count(*) from pg_policies where tablename = 'events' and policyname = 'events_delete') as delete_policy;

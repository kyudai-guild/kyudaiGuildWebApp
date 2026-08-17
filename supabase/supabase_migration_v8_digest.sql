-- ============================================================
-- Migration v8: LINE通知を日次ダイジェストに変更
-- 実行者: 人間（Supabase SQL Editor）。v7 実行後に。
-- ============================================================

-- 通知済みかどうかの記録（NULL = まだ通知に含めていない）
alter table quests add column if not exists line_notified_at timestamptz;

-- 日次バッチが「未通知の承認済みクエスト」を引く時に使う
create index if not exists idx_quests_pending_notify
  on quests (reviewed_at) where line_notified_at is null;

-- ------------------------------------------------------------
-- 確認用
-- ------------------------------------------------------------
-- 次回のダイジェストに含まれる予定のクエスト:
-- select id, title, reviewed_at from quests
-- where status = 'approved' and line_notified_at is null
--   and reviewed_at >= now() - interval '3 days';
--
-- 既存の承認済みクエストを「通知済み」にしておく（初回に大量送信しないため。推奨）:
-- update quests set line_notified_at = now()
-- where status = 'approved' and line_notified_at is null;

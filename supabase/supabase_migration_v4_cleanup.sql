-- ============================================================
-- Migration v4: quests テーブルの v1 旧カラム掃除
-- ============================================================
-- 実行者: 人間（Supabase ダッシュボード → SQL Editor に貼り付けて Run）
--
-- ⚠️ 実行前に docs/verify-environment.md の A-1（カラム構成）と
--    A-4（status 分布）を確認しておくこと。
-- ⚠️ この SQL を実行するまで、コード側の旧カラム二重書き
--    （src/app/api/quests/route.ts の category / skill_name）は外せない。
--    先にコードだけ変えると INSERT が 23502 (NOT NULL違反) で失敗する。
--    逆に、この SQL を実行した後は二重書きコードが 42703 (存在しない列)
--    で失敗するため、実行後は速やかにコード側も更新すること（Phase 6）。
-- ============================================================

-- 事前確認（任意）: SELECT status, count(*) FROM quests GROUP BY status;

-- v1 時代の status 'open' を現行の 'approved' に統一
UPDATE quests SET status = 'approved' WHERE status = 'open';

-- v1 の旧カラムを削除（v2 以降は quest_type / listing_* を使用）
ALTER TABLE quests DROP COLUMN IF EXISTS category;
ALTER TABLE quests DROP COLUMN IF EXISTS skill_name;
ALTER TABLE quests DROP COLUMN IF EXISTS difficulty;
ALTER TABLE quests DROP COLUMN IF EXISTS deadline;

-- status のデフォルトと許容値を現行仕様に合わせる
ALTER TABLE quests ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE quests DROP CONSTRAINT IF EXISTS quests_status_check;
ALTER TABLE quests ADD CONSTRAINT quests_status_check
  CHECK (status IN ('pending','approved','rejected','closed'));

-- ============================================================
-- 任意（旧機能のテーブルが残っていれば。実行は人間の判断）:
-- verify-environment.md の A-6 で存在確認してから。
-- ============================================================
-- DROP TABLE IF EXISTS evaluations;
-- DROP TABLE IF EXISTS quest_completions;
-- DROP TABLE IF EXISTS member_profiles;

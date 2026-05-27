-- Supabase SQL Editor で実行してください
-- member_profiles テーブルに月次チェックイン用カラムを追加

ALTER TABLE member_profiles
  ADD COLUMN IF NOT EXISTS monthly_checkin_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkin_month text;

-- 確認用クエリ
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'member_profiles'
  AND column_name IN ('monthly_checkin_count', 'checkin_month');

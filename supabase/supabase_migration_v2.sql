-- ============================================================
-- 九大ギルド マイグレーション v2
-- 既存DBを v2 スキーマに更新するためのSQL
-- Supabase SQL Editor で実行してください
-- ============================================================

-- 1. profiles テーブルに role カラム追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 2. quests テーブルの改修
-- 新カラム追加
ALTER TABLE quests ADD COLUMN IF NOT EXISTS quest_type text;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS max_applicants int DEFAULT 1;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE quests ADD COLUMN IF NOT EXISTS listing_duration_type text CHECK (listing_duration_type IN ('weeks', 'date'));
ALTER TABLE quests ADD COLUMN IF NOT EXISTS listing_duration_weeks int;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS listing_end_date date;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(id);
ALTER TABLE quests ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE quests ADD COLUMN IF NOT EXISTS effective_end_date date;

-- status カラムの制約を更新（既存のcheck制約を削除して再作成）
ALTER TABLE quests DROP CONSTRAINT IF EXISTS quests_status_check;
ALTER TABLE quests ADD CONSTRAINT quests_status_check CHECK (status IN ('pending','approved','rejected','closed'));

-- 既存クエストのステータスを 'approved' に（既に公開中のため）
UPDATE quests SET status = 'approved' WHERE status = 'open';
UPDATE quests SET quest_type = 'その他' WHERE quest_type IS NULL;

-- quest_type を NOT NULL に
ALTER TABLE quests ALTER COLUMN quest_type SET NOT NULL;

-- 3. quest_applications テーブル新規作成
CREATE TABLE IF NOT EXISTS quest_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid REFERENCES quests(id) ON DELETE CASCADE,
  applicant_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  message text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  applied_at timestamptz DEFAULT now(),
  UNIQUE(quest_id, applicant_id)
);

-- 4. RLS有効化
ALTER TABLE quest_applications ENABLE ROW LEVEL SECURITY;

-- 5. 既存の RLS ポリシーを削除して再作成
-- profiles
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- quests
DROP POLICY IF EXISTS "quests_select" ON quests;
DROP POLICY IF EXISTS "quests_insert" ON quests;
DROP POLICY IF EXISTS "quests_update" ON quests;
CREATE POLICY "quests_select" ON quests FOR SELECT USING (
  status = 'approved'
  OR creator_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "quests_insert" ON quests FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "quests_update" ON quests FOR UPDATE USING (
  auth.uid() = creator_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- quest_applications
DROP POLICY IF EXISTS "quest_applications_select" ON quest_applications;
DROP POLICY IF EXISTS "quest_applications_insert" ON quest_applications;
CREATE POLICY "quest_applications_select" ON quest_applications FOR SELECT USING (
  applicant_id = auth.uid()
  OR EXISTS (SELECT 1 FROM quests WHERE quests.id = quest_applications.quest_id AND quests.creator_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "quest_applications_insert" ON quest_applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);

-- 6. 権限付与
GRANT ALL PRIVILEGES ON TABLE public.quest_applications TO anon, authenticated, service_role;

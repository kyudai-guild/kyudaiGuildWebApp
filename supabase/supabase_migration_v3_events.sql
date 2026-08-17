-- ============================================================
-- 九大ギルド マイグレーション v3 — イベントカレンダー機能
-- Supabase SQL Editor で実行してください
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title            text NOT NULL,
  description      text,
  event_date       timestamptz NOT NULL,
  event_end_date   timestamptz,
  location         text,
  location_url     text,
  category         text DEFAULT 'その他'
                   CHECK (category IN (
                     '学術','スポーツ','文化','ボランティア','交流','キャリア','その他'
                   )),
  capacity         int,
  tags             text[] DEFAULT '{}',
  status           text DEFAULT 'pending'
                   CHECK (status IN ('pending','approved','rejected')),
  rejection_reason text,
  reviewed_by      uuid REFERENCES profiles(id),
  reviewed_at      timestamptz,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 承認済みは全員閲覧 / 作成者は自分のを全件閲覧 / 管理者は全件
CREATE POLICY "events_select" ON events FOR SELECT USING (
  status = 'approved'
  OR organizer_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 管理者のみ登録可能
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 管理者のみ更新可能
CREATE POLICY "events_update" ON events FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 権限付与
GRANT ALL PRIVILEGES ON TABLE public.events TO anon, authenticated, service_role;

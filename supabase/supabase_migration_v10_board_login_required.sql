-- ============================================================
-- Migration v10: クエスト掲示板をログインユーザー限定にする
-- 実行者: 人間（Supabase SQL Editor）
--
-- 背景:
--   これまで承認済みクエストは未ログインでも閲覧できた。
--   anon キーは公開情報（NEXT_PUBLIC_）なので、アプリ側で隠しても
--   Supabase の REST API を直接叩けば読めてしまう。
--   そのため RLS 自体を締める必要がある。
-- ============================================================

drop policy if exists "quests_select" on quests;
create policy "quests_select" on quests for select using (
  -- 承認済みは「ログイン済みユーザー」に限り閲覧可
  (status = 'approved' and auth.role() = 'authenticated')
  -- 自分が掲示したクエストは全ステータス閲覧可
  or creator_id = auth.uid()
  -- 管理者は全件閲覧可
  or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ------------------------------------------------------------
-- 確認用
-- ------------------------------------------------------------
-- ポリシーの中身を確認:
--   select policyname, qual from pg_policies where tablename = 'quests';
--
-- 未ログイン扱いで読めないことの確認（anon キーで実行）:
--   curl "https://<project-ref>.supabase.co/rest/v1/quests?select=id" \
--     -H "apikey: <anon key>"
--   → [] が返れば成功（以前は承認済みクエストが返っていた）

-- ------------------------------------------------------------
-- 補足: イベント（events）は未ログインでも閲覧可のままです。
-- 同じように閉じたい場合は、以下も実行してください。
-- ------------------------------------------------------------
-- drop policy if exists "events_select" on events;
-- create policy "events_select" on events for select using (
--   (status = 'approved' and auth.role() = 'authenticated')
--   or organizer_id = auth.uid()
--   or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
-- );

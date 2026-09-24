-- ============================================================
-- Migration v22: 他人のメールアドレス・LINE ID を読めないようにする
-- 実行者: 人間（Supabase SQL Editor）
--
-- ⚠️⚠️ 実行するタイミングに注意 ⚠️⚠️
--   **v19〜v21 を実行し、アプリを本番に反映（push → Vercel が Ready）した「後」に実行すること。**
--   古いアプリはプロフィールを select('*') で読んでいるため、先にこれを実行すると
--   ログイン処理が権限エラーで失敗する。新しいアプリは読む列を絞ってあるので影響しない。
--
-- 背景（2026-09 の調査で発覚）:
--   profiles の閲覧ポリシーが「ログインしていれば全員・全列」になっており、
--   Supabase の公開鍵を使えば、ログイン中の誰でも
--     - 全ユーザーの九大メールアドレス
--     - 全ユーザーの LINE の userId・表示名・アイコン
--   を一覧で取得できた。団体長の「メールアドレスで追加」機能で戻り値を
--   どれだけ絞っても、ここが開いていては意味がない。
--
-- やり方:
--   行の閲覧範囲（RLS）は今までどおりにして、**列単位の権限**で絞る。
--   他人の表示名・自己紹介などは、掲示板や応募者の確認に必要なので読めるまま残す。
--   メールアドレス・LINE関連・通知設定は、本人の分も含めてブラウザからは読めなくし、
--   必要な場面ではサーバー（service_role）が本人・運営の確認をしてから読む。
-- ============================================================

-- 一度すべての閲覧権限を外してから、読んでよい列だけを付け直す
-- （表全体に SELECT が付いたままだと、列単位の revoke は効かないため）
revoke select on table public.profiles from anon, authenticated;

grant select (
  id,
  display_name,
  role,
  tags,
  created_at,
  qualifications,
  bio,
  onboarded_at
) on table public.profiles to authenticated;

-- ※ 書き込み（insert / update）の権限はそのまま。本人の表示名の変更などは今までどおりできる。
-- ※ 今後 profiles に列を足したとき、ブラウザから読ませたい列はここに追記すること。
--   追記しないと、その列を select した画面が権限エラーになる（安全側に倒れる）。

-- ------------------------------------------------------------
-- 確認用
-- ------------------------------------------------------------
-- 一般ユーザーがメール列を読めないこと（false が返れば正しい）
-- select has_column_privilege('authenticated', 'public.profiles', 'email', 'select');
-- select has_column_privilege('authenticated', 'public.profiles', 'line_user_id', 'select');

-- 表示名は読めること（true が返れば正しい）
-- select has_column_privilege('authenticated', 'public.profiles', 'display_name', 'select');

-- ------------------------------------------------------------
-- 元に戻す場合（問題が起きたときの緊急用）
-- ------------------------------------------------------------
-- grant select on table public.profiles to anon, authenticated;

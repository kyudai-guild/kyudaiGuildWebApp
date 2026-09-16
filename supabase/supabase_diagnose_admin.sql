-- ============================================================
-- 管理者権限が付かないときの診断
-- 実行者: 人間（Supabase SQL Editor）
--
-- 「update profiles set role='admin' ... が効かない」
-- 「管理者一覧SQLが0行を返す」ときは、下の【1】から順に実行してください。
-- ============================================================


-- ------------------------------------------------------------
-- 【1】全ユーザーの状態を一覧する（これでほぼ原因が分かる）
-- ------------------------------------------------------------
select
  u.email                          as auth_email,      -- 認証側の正しいアドレス
  u.email_confirmed_at is not null as confirmed,       -- false だとログインできない
  u.last_sign_in_at,                                   -- null = 一度もログインしていない
  (p.id is not null)               as profile_exists,  -- false だと UPDATE が空振りする
  p.email                          as profile_email,   -- auth_email と食い違っていないか
  p.role,                                              -- ここが admin になっていればOK
  p.display_name
from auth.users u
left join profiles p on p.id = u.id
order by u.created_at;

-- 読み方:
--   ・そもそも対象ユーザーの行が無い
--       → まだ登録されていません。本人に登録してもらうか、
--         Authentication → Users → Create new user で作成してください。
--   ・profile_exists = false
--       → profiles 行が無いので email 条件の UPDATE は必ず0件になります。
--         【3】のSQLで作成と同時に権限を付与できます。
--   ・auth_email と profile_email が違う / 大文字小文字が違う
--       → email 一致の UPDATE が空振りします。【3】を使ってください。
--   ・role が既に admin なのに画面に反映されない
--       → 【4】を参照。


-- ------------------------------------------------------------
-- 【2】プロフィール自動作成トリガーが生きているか
--   （無い場合、新規登録しても profiles 行が作られません）
-- ------------------------------------------------------------
select tgname, tgenabled
from pg_trigger
where tgname = 'on_auth_user_created';
-- 0行なら、supabase_schema.sql の handle_new_user / on_auth_user_created を
-- 再実行してトリガーを復活させてください。


-- ------------------------------------------------------------
-- 【3】確実に管理者にする（profiles 行が無くても効く／大文字小文字を無視）
--   ★ メールアドレスを書き換えてから実行
-- ------------------------------------------------------------
insert into profiles (id, email, display_name, role)
select
  u.id,
  u.email,
  coalesce(nullif(u.raw_user_meta_data->>'display_name', ''), split_part(u.email, '@', 1)),
  'admin'
from auth.users u
where lower(u.email) = lower('対象のメールアドレス')
on conflict (id) do update set role = 'admin'
returning id, email, role;

-- ★ returning の結果が 0行 の場合:
--    auth.users にそのアドレスが存在しません（＝まだ登録されていない）。
--    【1】で実際のアドレスを確認してください。


-- ------------------------------------------------------------
-- 【4】反映されているかの確認
-- ------------------------------------------------------------
select u.email, p.display_name, p.role
from profiles p
join auth.users u on u.id = p.id
where p.role = 'admin';

-- ここに出ているのに画面で管理メニューが出ない場合:
--   ・一度ログアウトして入り直す（権限はログイン時に読み込まれます）
--   ・それでも出ないなら、アプリが別のSupabaseプロジェクトを見ている可能性。
--     /api/line/webhook をブラウザで開き supabase_url を確認してください。

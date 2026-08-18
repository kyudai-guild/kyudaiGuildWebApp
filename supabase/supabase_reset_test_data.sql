-- ============================================================
-- テストデータの初期化（パイロット開始前のリセット）
-- 実行者: 人間（Supabase SQL Editor）
--
-- ⚠️ 削除したデータは戻せません。実行前に【0】で対象を必ず確認してください。
-- ⚠️ 順序が重要です。quests/events を先に消さないとユーザー削除が失敗します
--    （quests.reviewed_by / events.reviewed_by は ON DELETE CASCADE ではないため）。
-- ============================================================


-- ------------------------------------------------------------
-- 【0】現状確認（まずこれだけ実行して、消える対象を把握する）
-- ------------------------------------------------------------
select 'users'   as kind, count(*) from auth.users
union all select 'profiles',           count(*) from profiles
union all select 'quests',             count(*) from quests
union all select 'applications',       count(*) from quest_applications
union all select 'thanks',             count(*) from quest_thanks
union all select 'events',             count(*) from events
union all select 'talk_rooms',         count(*) from talk_rooms
union all select 'talk_messages',      count(*) from talk_messages
union all select 'notification_logs',  count(*) from notification_logs;

-- 残したいアカウント（＝自分たち運営）を確認する
select u.email, p.display_name, p.role, p.line_user_id is not null as line_linked
from auth.users u left join profiles p on p.id = u.id
order by u.created_at;


-- ------------------------------------------------------------
-- 【1】クエスト・イベントを全削除
--   quests を消すと、応募・感謝・トークルーム・メッセージも
--   ON DELETE CASCADE で一緒に消えます。
-- ------------------------------------------------------------
delete from quests;
delete from events;

-- 配信ログもリセットする場合（残しても害はありません）
delete from notification_logs;


-- ------------------------------------------------------------
-- 【2】テストユーザーを削除
--   auth.users を消すと profiles・興味分野の選択なども連鎖削除されます。
--
--   ★ 下の IN (...) に「残したいアカウント」のメールを列挙してください。
--     ここに書いたアカウント以外がすべて削除されます。
-- ------------------------------------------------------------
delete from auth.users
where email not in (
  'あなたの九大メール@s.kyushu-u.ac.jp'   -- ← 運営アカウント。必ず自分のアドレスに書き換える
  -- , 'sub-admin@s.kyushu-u.ac.jp'        -- 複数残す場合はカンマ区切りで追加
);

-- 全部消してゼロから作り直す場合は、上を使わずこちら:
-- delete from auth.users;


-- ------------------------------------------------------------
-- 【3】確認
-- ------------------------------------------------------------
select 'users' as kind, count(*) from auth.users
union all select 'quests', count(*) from quests
union all select 'events', count(*) from events;

-- 残ったアカウントに管理者権限があるか確認（無ければ下記の手順で付与）
select u.email, p.role from auth.users u join profiles p on p.id = u.id;


-- ============================================================
-- 参考: よく使う運用SQL
-- ============================================================

-- ▼ ユーザーを管理者にする
-- update profiles set role = 'admin'
-- where email = 'someone@s.kyushu-u.ac.jp';

-- ▼ 管理者権限を外す
-- update profiles set role = 'user'
-- where email = 'someone@s.kyushu-u.ac.jp';

-- ▼ 現在の管理者一覧
-- select u.email, p.display_name from profiles p
-- join auth.users u on u.id = p.id where p.role = 'admin';

-- ▼ 初期設定をやり直させる（次回ログイン時にウィザードが再表示される）
-- update profiles set onboarded_at = null where email = 'someone@s.kyushu-u.ac.jp';

-- ▼ LINE連携を解除する（連携先を作り直したい時）
-- update profiles set line_user_id = null, line_display_name = null,
--        line_picture_url = null, line_linked_at = null, line_friend = false
-- where email = 'someone@s.kyushu-u.ac.jp';

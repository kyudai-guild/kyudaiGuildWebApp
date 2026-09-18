-- ============================================================
-- Migration v18: 運営がアプリから切り替えられる設定
-- 実行者: 人間（Supabase SQL Editor）
--
-- 背景:
--   動作確認でテスト用のクエストを出すたびに運営Slackへ通知が飛び、
--   チャンネルが埋まってしまう。環境変数で止めることもできるが、
--   そのたびに再デプロイが必要で「ちょっと止める」用途に向かない。
--   管理画面から即座に切り替えられるよう、DBに持たせる。
--
--   今回必要なのは Slack のON/OFFだけだが、この先も
--   「運営が触りたい設定」は出てくるので、キーと値の表にしておく。
-- ============================================================

create table if not exists app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz default now(),
  updated_by uuid references profiles(id) on delete set null
);

-- 既定はON（今までと同じ挙動）。
-- 値を false にすると Slack 通知だけが止まる。メールやサイト内の
-- バッジは影響を受けない。
insert into app_settings (key, value)
values ('slack_notifications', 'true'::jsonb)
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- RLS
--   閲覧・変更とも運営のみ。設定値には今後、運営以外に見せたくない
--   ものが入る可能性があるので、最初から閉じておく。
--   通知の送信側は service_role（RLSをバイパスする）で読むため、
--   ここを閉じても配信には影響しない。
-- ------------------------------------------------------------
alter table app_settings enable row level security;

drop policy if exists "app_settings_select" on app_settings;
create policy "app_settings_select" on app_settings for select
  using (is_guild_admin());

drop policy if exists "app_settings_insert" on app_settings;
create policy "app_settings_insert" on app_settings for insert
  with check (is_guild_admin());

drop policy if exists "app_settings_update" on app_settings;
create policy "app_settings_update" on app_settings for update
  using (is_guild_admin()) with check (is_guild_admin());

grant all privileges on table public.app_settings to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 確認用
-- ------------------------------------------------------------
-- 現在の設定
-- select key, value, updated_at from app_settings order by key;

-- SQLから止める / 戻す場合（管理画面のスイッチと同じこと）
-- update app_settings set value = 'false'::jsonb, updated_at = now() where key = 'slack_notifications';
-- update app_settings set value = 'true'::jsonb,  updated_at = now() where key = 'slack_notifications';

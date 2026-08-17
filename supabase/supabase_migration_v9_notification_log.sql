-- ============================================================
-- Migration v9: 日次ダイジェストの実行ログ
-- 実行者: 人間（Supabase SQL Editor）。v8 実行後に。
--
-- 目的: cron が実際に動いたかを後から確認できるようにする。
-- Vercel の Hobby プランはログの保持期間が短く、朝の実行を後で見に行くと
-- 消えていることがあるため、結果をDBに残す。
-- ============================================================

create table if not exists notification_logs (
  id         uuid primary key default gen_random_uuid(),
  ran_at     timestamptz not null default now(),
  source     text not null,            -- 'cron' = 自動実行 / 'manual' = 管理者の手動実行
  ok         boolean not null,
  reason     text,                     -- 送らなかった理由（no-new-quests など）
  quests     int not null default 0,   -- 対象になったクエスト数
  recipients int not null default 0,   -- 通知対象になった人数
  sent       int not null default 0    -- 実際に送った通数（= 消費した通数）
);

create index if not exists idx_notification_logs_ran_at on notification_logs (ran_at desc);

alter table notification_logs enable row level security;

-- 閲覧は管理者のみ（書き込みはサービスロールで行うためポリシー不要）
drop policy if exists "notification_logs_select" on notification_logs;
create policy "notification_logs_select" on notification_logs for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

grant all privileges on table public.notification_logs to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 確認用: 直近の実行履歴
-- ------------------------------------------------------------
-- select ran_at, source, ok, reason, quests, recipients, sent
-- from notification_logs order by ran_at desc limit 20;
--
-- 今月の消費通数:
-- select coalesce(sum(sent), 0) as sent_this_month from notification_logs
-- where ran_at >= date_trunc('month', now());

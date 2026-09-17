-- ============================================================
-- Migration v17: リジェクトを確認したかどうかを記録する
-- 実行者: 人間（Supabase SQL Editor）
--
-- 背景:
--   ホーム画面の「マイクエストの状況を確認」バナーは、閉じた状態を
--   コンポーネントの state にしか持っていなかった。そのため
--   ページを再読み込みすると、すでに確認済みのリジェクトについて
--   何度でも表示されてしまっていた。
--
--   「確認したかどうか」はブラウザではなくアカウントに紐づく情報なので、
--   端末を変えても引き継がれるようDBに持たせる。
--
--   NULL = まだ確認していない / 日時 = 確認した時刻
-- ============================================================

alter table quests add column if not exists rejection_seen_at timestamptz;

-- バナーは「自分の・リジェクトされた・未確認の」件数だけを見るので、
-- その並びの部分インデックスを張る（未確認の行だけを対象にする）。
create index if not exists idx_quests_unseen_rejection
  on quests (creator_id)
  where status = 'rejected' and rejection_seen_at is null;

-- ------------------------------------------------------------
-- RLS / トリガーとの関係（確認事項。追加の変更は不要）
--   - 更新は quests_update（creator_id = auth.uid() or 管理者）で通る
--   - v14 の protect_quest_review トリガーは status と審査関連の列
--     （reviewed_by / reviewed_at / rejection_reason / effective_end_date）
--     しか見ていないため、この列は依頼者本人が更新できる
--   - v14 の enforce_quest_organization は organization 列を触らない
--     更新には介入しない
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 確認用
-- ------------------------------------------------------------
-- 列ができているか（1が返る）
-- select count(*) from information_schema.columns
-- where table_name = 'quests' and column_name = 'rejection_seen_at';

-- 未確認のリジェクトが誰に何件あるか
-- select p.email, count(*) as unseen
-- from quests q join profiles p on p.id = q.creator_id
-- where q.status = 'rejected' and q.rejection_seen_at is null
-- group by p.email;

-- 既存のリジェクトを「確認済み」にしてしまいたい場合（任意）
-- update quests set rejection_seen_at = now()
-- where status = 'rejected' and rejection_seen_at is null;

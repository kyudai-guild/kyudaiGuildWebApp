-- ============================================================
-- Migration v27: 常設クエスト（期限なし・継続募集）と、日程・場所が未定のクエスト（2026-09-28）
--
-- - quests.is_ongoing: 常設クエスト。申込の締切・定員・日程を持たず、団体が「募集を終了する」まで掲載する。
--   掲示板では通常のクエストと別の枠（常設クエスト）に並べる
-- - quests.schedule_note: 日程についての補足（常設なら「毎週水曜 19時〜」など、未定なら「10月中の平日夕方」など）
-- - 日程・場所・定員は空でもよい（アプリ側で「未定」「上限なし」と表示する）。列はもともと空を許している
-- - talk_rooms.applicant_id: 常設クエストは応募者ごとにトークを分ける
--   （同じクエストでも、参加する時期が違う学生どうしを同じトークに入れない）。
--   通常のクエストはこれまでどおり 1クエスト1トーク（applicant_id は空）
-- - アプリは新しい列を読み書きするので、**push の前に**実行すること
-- ============================================================

alter table public.quests add column if not exists is_ongoing boolean not null default false;
alter table public.quests add column if not exists schedule_note text;

alter table public.talk_rooms add column if not exists applicant_id uuid references public.profiles(id) on delete cascade;

-- 「1クエスト1トーク」の制約を、通常のクエストだけに掛け直す
alter table public.talk_rooms drop constraint if exists talk_rooms_quest_id_key;
create unique index if not exists talk_rooms_quest_shared_key
  on public.talk_rooms (quest_id) where applicant_id is null;
create unique index if not exists talk_rooms_quest_applicant_key
  on public.talk_rooms (quest_id, applicant_id) where applicant_id is not null;

-- ------------------------------------------------------------
-- 確認用
-- ------------------------------------------------------------
-- select column_name from information_schema.columns
-- where table_name in ('quests', 'talk_rooms') and column_name in ('is_ongoing', 'schedule_note', 'applicant_id');  → 3行

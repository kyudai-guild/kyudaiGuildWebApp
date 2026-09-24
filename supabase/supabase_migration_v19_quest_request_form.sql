-- ============================================================
-- Migration v19: クエスト依頼書の項目を追加する
-- 実行者: 人間（Supabase SQL Editor）
-- 前提: v13（団体）・v14（RLSの穴埋め）実行後
--
-- 背景:
--   2026年9月の運営会議で、クエストは「九大生が一日だけ参加できる体験」とし、
--   団体に「クエスト依頼書」の項目を書いてもらうことになった。
--   既存の項目（種別・タグ・クエスト内容）は残し、依頼書の項目を追加する。
--   報酬は廃止するが、既存データの reward 列は消さずに残す（表示だけやめる）。
--
-- ⚠️ 反映の順番: このSQLを実行してから、アプリを本番に反映（push）すること。
--    新しいアプリはここで追加する列を読むため、先に反映すると掲示板が壊れる。
-- ============================================================

-- ------------------------------------------------------------
-- ① 依頼書の項目（すべて掲示するもの）
-- ------------------------------------------------------------
-- 日程。複数回のクエストがあるので配列で持つ。
--   [{ "date": "2026-10-20", "start": "10:00", "end": "12:00" }, ...]
alter table quests add column if not exists sessions        jsonb not null default '[]'::jsonb;
alter table quests add column if not exists location        text;   -- 場所・集合場所
alter table quests add column if not exists participation_fee text; -- 参加費（「無料」など）
alter table quests add column if not exists belongings      text;   -- 持ち物・服装
-- 当日の流れ。[{ "time": "10:00", "content": "集合・説明" }, ...]
alter table quests add column if not exists schedule        jsonb not null default '[]'::jsonb;
alter table quests add column if not exists requirements    text;   -- 参加条件
alter table quests add column if not exists org_intro       text;   -- 団体の紹介（申請時点の内容）
alter table quests add column if not exists appeal          text;   -- 体験してほしいこと（任意）
alter table quests add column if not exists photo_path      text;   -- 写真（Storage 上のパス。任意）
-- 依頼書の「確認」3つにすべてチェックした日時
alter table quests add column if not exists guideline_confirmed_at timestamptz;

-- ※ 九大生からの問い合わせ先は既存の preferred_contact を使う

-- 団体の登録情報に「問い合わせ先」を持たせる。
-- 団体の紹介（既存の description）と合わせて、依頼フォームの初期値に使う。
-- 編集できるのは運営と、v20 で追加する団体長。
alter table organizations add column if not exists public_contact text;

-- ------------------------------------------------------------
-- ② 当日の受け入れ担当者（掲示しないもの）
--   quests は「承認済みなら誰でも全列を読める」ため、同じ表に置くと
--   公開鍵で直接読まれてしまう。別の表に分けて、読める人を絞る。
-- ------------------------------------------------------------
create table if not exists quest_private_details (
  quest_id         uuid primary key references quests(id) on delete cascade,
  receiver_name    text not null,   -- 当日の受け入れ担当者のお名前
  receiver_contact text not null,   -- 当日つながる連絡先
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table quest_private_details enable row level security;

-- 読めるのは「掲示した本人」と運営だけ（団体長は v20 で追加する）
drop policy if exists "quest_private_details_select" on quest_private_details;
create policy "quest_private_details_select" on quest_private_details for select using (
  exists (select 1 from quests q where q.id = quest_id and q.creator_id = auth.uid())
  or is_guild_admin()
);

drop policy if exists "quest_private_details_insert" on quest_private_details;
create policy "quest_private_details_insert" on quest_private_details for insert with check (
  exists (select 1 from quests q where q.id = quest_id and q.creator_id = auth.uid())
);

drop policy if exists "quest_private_details_update" on quest_private_details;
create policy "quest_private_details_update" on quest_private_details for update
  using (exists (select 1 from quests q where q.id = quest_id and q.creator_id = auth.uid()) or is_guild_admin())
  with check (exists (select 1 from quests q where q.id = quest_id and q.creator_id = auth.uid()) or is_guild_admin());

grant all privileges on table public.quest_private_details to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- ③ 主催団体の必須化と、1団体あたりの上限をDB側でも強制する
--   API側でも確認しているが、画面を通さずDBを直接叩かれても破れないようにする。
--   v14 の enforce_quest_organization を拡張する。
-- ------------------------------------------------------------
create or replace function public.enforce_quest_organization()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_name  text;
  v_open  int;
begin
  if auth.uid() is null then
    return new;  -- service_role / SQL Editor はそのまま
  end if;

  if tg_op = 'UPDATE'
     and new.organization_id   is not distinct from old.organization_id
     and new.organization_name is not distinct from old.organization_name then
    return new;
  end if;

  -- クエストは団体として出すもの。主催団体の無い申請は受け付けない。
  if new.organization_id is null then
    raise exception 'クエストは主催団体を選んで申請してください。';
  end if;

  select o.name into v_name
  from profile_organizations po
  join organizations o on o.id = po.organization_id
  where po.profile_id      = new.creator_id
    and po.organization_id = new.organization_id
    and o.is_active;

  if v_name is null then
    raise exception '所属が承認されていない団体では申請できません。';
  end if;

  -- 1団体あたり未完了（審査待ち＋掲示中）10件まで
  if tg_op = 'INSERT' then
    select count(*) into v_open
    from quests
    where organization_id = new.organization_id
      and status in ('pending', 'approved');
    if v_open >= 10 then
      raise exception 'この団体の未完了のクエストが上限（10件）に達しています。';
    end if;
  end if;

  new.organization_name := v_name;
  return new;
end;
$$;

-- トリガー自体は v14 で作成済み（関数の中身だけ差し替わる）
drop trigger if exists enforce_quest_organization on quests;
create trigger enforce_quest_organization
  before insert or update on quests
  for each row execute function public.enforce_quest_organization();

-- ------------------------------------------------------------
-- ④ 写真の置き場所（Supabase Storage）
--   - 公開バケット。ただし一覧取得のポリシーは作らないので、
--     パスを知らない限り他人の写真は辿れない（パスは推測できない乱数）
--   - アップロードできるのは自分のフォルダ（ユーザーIDのフォルダ）だけ
--   - 1枚2MBまで、JPEG/PNG/WebPのみ（ブラウザ側でも縮小してから送る）
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quest-photos', 'quest-photos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "quest_photos_insert" on storage.objects;
create policy "quest_photos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'quest-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "quest_photos_delete" on storage.objects;
create policy "quest_photos_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'quest-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------------------
-- 確認用
-- ------------------------------------------------------------
-- 列ができているか（10 が返る）
-- select count(*) from information_schema.columns
-- where table_name = 'quests'
--   and column_name in ('sessions','location','participation_fee','belongings','schedule',
--                       'requirements','org_intro','appeal','photo_path','guideline_confirmed_at');

-- 担当者情報の表と写真のバケット
-- select
--   (select count(*) from information_schema.tables where table_name = 'quest_private_details') as private_table,
--   (select count(*) from storage.buckets where id = 'quest-photos') as photo_bucket;

-- 旧形式のテストクエスト（日程が無いもの）を確認・削除する場合
-- select id, title, status, created_at from quests where sessions = '[]'::jsonb order by created_at;
-- delete from quests where sessions = '[]'::jsonb;   -- 応募・トークも連鎖して消えます

-- ============================================================
-- Migration v11: イベントのカテゴリ廃止 → 色 + 終日フラグ
-- 実行者: 人間（Supabase SQL Editor）。v3 実行済みが前提。
--
-- 変更内容:
--   1. all_day（終日イベント）列を追加
--   2. color（表示色, HEX）列を追加し、既存の category から引き継ぐ
--   3. category 列を削除（分類はタグに一本化）
-- ============================================================

alter table events add column if not exists all_day boolean not null default false;
alter table events add column if not exists color text not null default '#1a4a3a';

-- 既存イベントの色をカテゴリから引き継ぐ（category がまだ存在する場合のみ実行される）
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'events' and column_name = 'category'
  ) then
    update events set color = case category
      when '学術'         then '#2563eb'
      when 'スポーツ'     then '#059669'
      when '文化'         then '#7c3aed'
      when 'ボランティア' then '#d97706'
      when '交流'         then '#db2777'
      when 'キャリア'     then '#0891b2'
      else '#6b7280'
    end;
    alter table events drop column category;
  end if;
end $$;

-- ------------------------------------------------------------
-- 確認用
-- ------------------------------------------------------------
-- select column_name from information_schema.columns where table_name = 'events';
-- → category が消え、all_day と color が増えていれば成功

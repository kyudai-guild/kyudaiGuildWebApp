-- ============================================================
-- Migration v25: 利用目的・興味のある分野を「団体の活動を一日体験する」形に合わせる（2026-09-27）
--
-- - 古い選択肢は削除せず is_active = false にする（選んでいた人の記録を壊さない。画面には出なくなる）
-- - 興味のある分野は、クエストの種別（src/lib/quest-types.ts）と同じ言葉にする。
--   LINE の新着通知は、興味分野とクエストの種別が完全一致するかで判定するため
-- - 以前の興味分野を選んでいた人は、近い分野に引き継ぐ（通知が止まらないように）
-- ============================================================

-- ------------------------------------------------------------
-- 興味のある分野
-- ------------------------------------------------------------
insert into interest_options (label, sort_order, is_active) values
  ('スポーツ・運動', 1, true),
  ('音楽・演奏', 2, true),
  ('文化・芸術', 3, true),
  ('ものづくり・技術', 4, true),
  ('学び・研究', 5, true),
  ('自然・アウトドア', 6, true),
  ('国際交流・語学', 7, true),
  ('地域・ボランティア', 8, true),
  ('企画・イベント運営', 9, true),
  ('食・料理', 10, true)
on conflict (label) do update set sort_order = excluded.sort_order, is_active = true;

-- 以前の選択を近い分野に引き継ぐ
insert into profile_interests (profile_id, interest_id)
select pi.profile_id, n.id
from profile_interests pi
join interest_options o on o.id = pi.interest_id
join (values
  ('Webサイト制作', 'ものづくり・技術'),
  ('プログラミング', 'ものづくり・技術'),
  ('データ分析', 'ものづくり・技術'),
  ('デザイン', '文化・芸術'),
  ('動画編集', '文化・芸術'),
  ('写真・撮影', '文化・芸術'),
  ('ライティング', '文化・芸術'),
  ('翻訳・語学', '国際交流・語学'),
  ('研究協力', '学び・研究'),
  ('家庭教師・指導', '学び・研究'),
  ('イベント運営', '企画・イベント運営'),
  ('SNS運用', '企画・イベント運営')
) as m(old_label, new_label) on m.old_label = o.label
join interest_options n on n.label = m.new_label
on conflict do nothing;

update interest_options set is_active = false
where label in ('Webサイト制作', 'プログラミング', 'デザイン', '動画編集', 'ライティング', '翻訳・語学',
                'データ分析', '研究協力', 'イベント運営', 'SNS運用', '家庭教師・指導', '写真・撮影');

-- ------------------------------------------------------------
-- 利用目的
-- ------------------------------------------------------------
-- 報酬・就活の実績づくりは今の形（報酬なしの一日体験）に合わないので出さない
update purpose_options set is_active = false where label in ('お金を稼ぎたい', '実績・経験を積みたい');

-- 意味が近いものは言い回しを今の形に合わせる（選んでいた人はそのまま引き継がれる）
update purpose_options set label = '人とつながりたい', description = '学部や学年をこえて知り合いたい', sort_order = 3
where label = '仲間を見つけたい';
update purpose_options set description = '地域の活動やボランティアに参加したい', sort_order = 4
where label = '人の役に立ちたい';
update purpose_options set description = '体験しながら新しいことを学びたい', sort_order = 5
where label = 'スキルを身につけたい';
update purpose_options set sort_order = 6
where label = '面白いことを探したい';

insert into purpose_options (label, description, sort_order, is_active) values
  ('新しいことに挑戦したい', 'やったことのない活動を一日だけ体験してみたい', 1, true),
  ('サークル・団体を探したい', '入る前に、活動の雰囲気を知りたい', 2, true)
on conflict (label) do update set description = excluded.description, sort_order = excluded.sort_order, is_active = true;

-- ------------------------------------------------------------
-- 確認用
-- ------------------------------------------------------------
-- select label, description, sort_order from purpose_options where is_active order by sort_order;
-- select label, sort_order from interest_options where is_active order by sort_order;

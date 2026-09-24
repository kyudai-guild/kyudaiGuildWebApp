# 運営（人間）がやること

> コード側の実装が終わっても、**人間にしかできない作業**（SQLの実行、環境変数の設定、
> 外部サービスの設定、本番でしか試せない動作確認）が残ります。それをここに集約します。
>
> **新しい機能を実装するたびに、このファイルの「未実施」に追記されます。**
> 終わったら `[x]` にして「実施済み」へ移してください。
>
> 最終更新: 2026-09-25

---

## 🔴 いますぐ必要な作業（2026-09 会議の反映）— **順番を守ってください**

今回の変更はまだ**本番に出していません**（コミットだけして push を止めています）。
新しいアプリは新しい列を読むため、**SQL より先に本番に出すと掲示板が壊れます**。
逆に v22 は、**本番に出した後**でないとログインが壊れます。

### 手順1. SQL を3本実行する（push の前）

Supabase → **SQL Editor** で、この順に実行します。

- ☐ `supabase/supabase_migration_v19_quest_request_form.sql` — クエスト依頼書の項目・非公開の担当者情報・写真の置き場所
- ☐ `supabase/supabase_migration_v20_org_managers.sql` — 団体長・メールで追加・トークの人員
- ☐ `supabase/supabase_migration_v21_event_cohost_delete.sql` — イベントの共催・編集・削除

**確認**（すべて 1 以上が返れば成功）:

```sql
select
  (select count(*) from information_schema.columns where table_name = 'quests' and column_name = 'sessions')                  as v19_quest_cols,
  (select count(*) from information_schema.tables  where table_name = 'quest_private_details')                               as v19_private,
  (select count(*) from storage.buckets where id = 'quest-photos')                                                           as v19_photo_bucket,
  (select count(*) from information_schema.columns where table_name = 'profile_organizations' and column_name = 'role')     as v20_role,
  (select count(*) from information_schema.tables  where table_name = 'org_manager_actions')                                 as v20_log,
  (select count(*) from information_schema.columns where table_name = 'events' and column_name = 'co_organizer_names')       as v21_cohost,
  (select count(*) from pg_policies where tablename = 'events' and policyname = 'events_delete')                             as v21_delete;
```

### 手順2. 本番に出す（push）

- ☐ SQL の実行が終わったら、**Claude に「push して」と伝える**（または自分で `git push`）
- ☐ Vercel → Deployments の最新が **Production / Ready** になるのを待つ

### 手順3. v22 を実行する（**本番反映の後**、なるべくすぐ）

- ☐ `supabase/supabase_migration_v22_lock_profile_emails.sql` を実行

これで、ログイン中の人が**他人のメールアドレスや LINE ID を読めなくなります**
（これまでは読めてしまう状態でした。団体長の「メールで追加」を安全にするための前提です）。

```sql
-- false が返れば成功（一般ユーザーが他人のメールを読めない）
select has_column_privilege('authenticated', 'public.profiles', 'email', 'select');
```

> ⚠️ v22 を push の前に実行すると、古いアプリのままではログイン処理が権限エラーになります。
> 万一そうなったら、v22 の末尾にある「元に戻す場合」の1行を実行してください。

### 手順4. 旧形式のテストクエストを片付ける（任意）

報酬あり・日程なしの旧形式のクエストは、新しい表示で項目が欠けて見えます。

```sql
-- 確認
select id, title, status, created_at from quests where sessions = '[]'::jsonb order by created_at;
-- 削除（応募・トークも連鎖して消えます）
delete from quests where sessions = '[]'::jsonb;
```

### 手順5. 団体長を指名する

- ☐ `/admin` → **団体管理** → 団体の行を開く → メンバーの **団体長にする**

> 団体長に指名された人のプロフィールに「団体の管理」が出ます。
> メールで追加・メンバーを外す・団体情報の編集・トークの人員の管理ができます。

---

## 🔴 本番反映後に確認すること（今回分）

うまくいかない項目があれば、そのまま伝えてもらえれば調べます。
動作確認の前に、`/admin` の一番上のスイッチで **Slack通知をOFF** にしておくと楽です。

### A. クエスト依頼書（項目1・5・7・9）

- ☐ 所属のない人は「依頼を出す」で**出せない**旨が表示される
- ☐ 団体を選ぶと、団体の紹介・問い合わせ先に**団体情報が初期値で入る**
- ☐ 「この団体の未完了のクエスト: n / 10件」が表示される
- ☐ 日程を複数追加できる／当日の流れの行を追加できる
- ☐ 写真を選ぶとプレビューが出る（縮小されて送られる）
- ☐ 確認3項目にチェックしないと申請できない
- ☐ 掲示板のカードに**日程・場所・参加費**が出て、**報酬は出ない**
- ☐ 詳細に「**主催団体について**」（紹介・問い合わせ先）が出る。**掲示者本人のアカウントでも見える**
- ☐ 詳細に**当日の受け入れ担当者が出ない**（別アカウントで確認）
- ☐ 運営の審査画面とマイクエストには担当者が**出る**
- ☐ 定員まで承認でき、見送った応募は枠を使わない

### B. 団体長（項目3）

- ☐ 団体長のプロフィールに「団体の管理」が出る。一般メンバーには出ない
- ☐ 登録済みのメールで追加 → 「追加しました」。存在しないメール → 「見つかりませんでした」
- ☐ **どちらの場合も表示名などは表示されない**
- ☐ メンバー一覧はメールアドレスだけ
- ☐ 追加・削除で運営Slackに通知が届く（Slack通知ONのとき）
- ☐ 団体情報を保存すると、次の依頼書の初期値に反映される

### C. トークの人員（追加分）

- ☐ 団体長のトーク一覧に、自分の団体のクエストのトークが「団体長として管理（未参加）」で出る
- ☐ トーク画面の「トークの人員」から、団体のメンバーを追加・削除できる
- ☐ 掲示した本人と応募した学生は「外せません」になっている
- ☐ 空のトークで、相手の最初のメッセージが**再読み込みなしで**表示される（5秒以内）

### D. イベント・管理画面（項目4・6・8）

- ☐ 管理画面が暗い配色で、上部に「管理者モード」の帯が出る
- ☐ カレンダー画面に「イベントを登録」が**出ない**
- ☐ 管理画面のイベント管理タブで、登録・**編集**・**削除**ができる（削除は確認ダイアログ）
- ☐ 共催団体を入力でき、登録済みの団体が候補に出る。詳細に「共催: …」と出る

### E. デモ・チュートリアル（項目2）

- ☐ `/demo` と `/tutorial` に、報酬や旧ルールの記述が残っていない
- ☐ 文面が運営の方針と合っているか（直したい箇所は文面ごと伝えてください）

### F. How to（配布用の下書き）

`docs/private/` に置いてあります（git に入らない場所）。清書して配布してください。

- ☐ `docs/private/howto-requester.md` — 団体の方へ
- ☐ `docs/private/howto-student.md` — 九大生へ
- ☐ `docs/private/howto-ops.md` — 運営向け（**外部に配布しないこと**）

---

## 🔴 前回分の確認（未チェックのもの）

- ☐ 審査結果メール: 承認・リジェクトで届き、リジェクト理由が本文に入る（項目7の「メール」がこちらの件なら教えてください）
- ☐ 応募のお知らせメールが掲示者に届く
- ☐ トークの未読メール: 運営アカウントで `/api/cron/line-digest` を開くと手動実行でき、`talk_mail` の `sent` が増える
- ☐ Slack: クエスト申請・所属申請で通知が届く

---

## 🟡 継続中 / 期限なし

- ☐ **受注対象の団体を登録し、団体長を指名していく** — 運用として続く作業
- ☐ **通知先のSlackチャンネルがプライベートか**を確認する —
  氏名・メールアドレス・申請メッセージ・団体長の操作が流れます
- ☐ **LINEログインチャネルを「公開済み」にする** — 「開発中」のままだと
  Tester 権限を持つ人しかLINEログインできません（`docs/pilot-checklist.md` A-1）
- ☐ **大学の許可リスト登録を依頼する** — `@s.kyushu-u.ac.jp` 宛のメールが
  痕跡なく消える件。送信ドメインを大学の情報基盤側で許可してもらう
- ☐ **運営アカウントの共用化** — まだ個人アカウントのものが残っている場合
  （`docs/pilot-checklist.md` D）
- ☐ **管理者を2人以上にする** — 1人だと審査が止まります
- ☐ **公開リポジトリに置いてよい資料かの見直し** — `docs/` 配下はすべて公開されています。
  運営内部に留めたいものは `docs/private/`（git に入らない）へ移してください
- ☐ **デスクトップの空リポジトリを片付ける** — `Desktop/ギルド git` 自体が
  古い個人リモート（`sorairo-dev/----git`）を指す**空のgitリポジトリ**になっています。
  消してよければ `Desktop/ギルド git/.git` フォルダを削除してください
  （**`kyudaiGuildWebApp/.git` の方は絶対に消さないこと**）

---

## ✅ 実施済み

- [x] **SQLマイグレーション v15〜v18 を実行**（トークの既読 / 未読集計 / リジェクト確認 / Slack ON/OFF）
- [x] **SQLマイグレーション v13・v14 を実行**（所属団体タグ / RLSのセキュリティ修正）
- [x] **Slack の専用チャンネル作成**と **Incoming Webhook 発行**、`SLACK_WEBHOOK_URL` を設定
- [x] **メール通知の環境変数**（`RESEND_API_KEY` / `MAIL_FROM`）を Vercel に設定
- [x] Cloudflare でドメイン取得、Resend のドメイン認証（SPF/DKIM/DMARC）
- [x] Supabase のカスタムSMTP設定（登録確認メール）
- [x] 旧 Vercel プロジェクトの削除（cron の二重実行を解消）
- [x] テストデータの初期化
- [x] 運営アカウントへの admin 付与

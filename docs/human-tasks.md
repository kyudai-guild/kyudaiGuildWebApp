# 運営（人間）がやること

> コード側の実装が終わっても、**人間にしかできない作業**（SQLの実行、環境変数の設定、
> 外部サービスの設定、本番でしか試せない動作確認）が残ります。それをここに集約します。
>
> **新しい機能を実装するたびに、このファイルの「未実施」に追記されます。**
> 終わったら `[x]` にして「実施済み」へ移してください。
>
> 最終更新: 2026-09-17

---

## 🔴 いますぐ必要な作業

### 0. SQLマイグレーション v15 を実行する

**トークの未読メール通知に必要です。** 未実行だと、トーク画面を開いたときに
既読の記録でエラーになり、未読メールも飛びません。

- ☐ Supabase → **SQL Editor** で `supabase/supabase_migration_v15_talk_read_state.sql` を実行

**実行後の確認** — すべて 1 が返れば成功:

```sql
select
  (select count(*) from information_schema.columns where table_name='talk_members' and column_name='last_read_at')     as last_read_at,
  (select count(*) from information_schema.columns where table_name='talk_members' and column_name='last_notified_at') as last_notified_at,
  (select count(*) from information_schema.columns where table_name='profiles'     and column_name='talk_mail_notify') as talk_mail_notify,
  (select count(*) from pg_policies where tablename='talk_members' and policyname='talk_members_update')               as update_policy,
  (select count(*) from pg_trigger  where tgname='protect_talk_membership')                                            as membership_guard;
```

> このマイグレーションは、実行時点の未読を「通知済み」に倒します。
> 運用開始前の古いメッセージで、翌朝いきなりメールが飛ぶのを防ぐためです。

---

## 🔴 本番デプロイ後に確認すること

SlackとメールはPreview環境では試しにくいので、**本番デプロイが終わってから**上から順に確認してください。
うまくいかない項目があれば、そのまま伝えてもらえれば調べます。

### 1. デプロイが本番に反映されたか

- ☐ Vercel → Deployments の最新が **Production** で **Ready** になっている
- ☐ Settings → Environment Variables に以下が **Production** スコープで入っている
  - `RESEND_API_KEY` / `MAIL_FROM` / `SLACK_WEBHOOK_URL`

> 環境変数は**登録しただけでは反映されません**。登録後にデプロイが1回必要です。
> 今回の push でそのデプロイが走ります。

### 2. クエストの審査メール

- ☐ テストアカウントでクエストを申請する
- ☐ `/admin` で**承認** → 掲示者の受信箱に承認メールが届いた
- ☐ 別のクエストを**リジェクト** → メールが届き、**入力した理由が本文に入っている**
- ☐ Resend → **Emails** で `delivered` になっている
- ☐ 審査後に管理画面へ黄色の「メール通知に失敗しました」が**出ていない**

> 黄色い警告が出たら `MAIL_FROM` が Resend で**認証済みのドメイン**か確認してください。
> 未認証ドメインだと Resend が 403 を返します。

### 2b. 応募のお知らせメール

- ☐ 別アカウントから掲示中のクエストに応募する
- ☐ **掲示者**の受信箱に「応募がありました」が届き、応募メッセージが本文に入っている

### 2c. トークの未読メール（1日1回）

cron は既存の `/api/cron/line-digest` に相乗りしています（Hobbyプランは cron が1日1本まで）。
**運営アカウントでそのURLをブラウザで開くと手動実行できます。**

- ☐ AさんからBさんへトークを送る（Bさんはトーク画面を開かない）
- ☐ `https://（ドメイン）/api/cron/line-digest` を運営アカウントで開く
- ☐ 返ってきた JSON の `talk_mail` が `{"ok":true, "sent":1, ...}` になっている
- ☐ Bさんの受信箱に「未読のメッセージがあります」が届いた（**本文に中身は入りません**）
- ☐ Bさんがトーク画面を開いてから、もう一度実行 → `sent":0`（既読なので送られない）
- ☐ プロフィール画面の「トークの未読をメールで知らせる」をOFFにすると届かなくなる

### 3. Slack通知

- ☐ クエストを申請 → 専用チャンネルに通知が届いた
- ☐ 通知の「クエストを審査する」ボタンで `/admin` が開く
- ☐ プロフィールから所属団体を申請 → 通知が届いた

> 未設定でも申請そのものは普通に通ります（Slack通知だけスキップされます）。

### 4. 所属団体まわり

- ☐ `/admin` → **団体管理** タブで団体を追加できる
- ☐ 団体の行を開いてユーザーを検索し、所属を付与できる
- ☐ 所属を付与された人が、クエスト申請フォームで**団体名を選べる**
- ☐ 掲示板と審査画面に**団体バッジ**が出る
- ☐ 所属のない人の申請に「**個人申請**」と表示される
- ☐ ヘッダーの「管理」に**審査待ちの件数バッジ**が出る

### 5. セキュリティ修正（v14）が効いているか

v13・v14 の実行は完了済みなので、**効いているかの確認**だけお願いします。

```sql
select
  (select count(*) from pg_trigger where tgname = 'protect_profile_role')       as role_guard,
  (select count(*) from pg_trigger where tgname = 'protect_quest_review')       as review_guard,
  (select count(*) from pg_trigger where tgname = 'enforce_quest_organization') as org_guard;
```

- ☐ **3つとも 1 が返る**

> 0 が混ざっていたら v14 が途中でエラーになっています。
> その場合は `supabase/supabase_migration_v14_rls_hardening.sql` を貼り直してください。
> 何度実行しても壊れない書き方にしてあります。

### 6. チュートリアルの文面

`/tutorial`（ログイン後、ヘッダーの「チュートリアル」）を開いて、
**運営の方針と食い違っていないか**を見てください。実装者が決め打ちで書いた箇所があります。

- ☐ 「依頼を出す」タブ — ガイドラインの要約が実際の運用と合っているか
- ☐ 「審査する（運営）」タブ **← 運営アカウントでしか見えません**
  - ☐ 「確認すること」のチェックリストが実際の審査基準と合っているか
  - ☐ 「**個人申請のものは原則リジェクトするか、所属を申請してもらう**」と書いています。
    この運用でよいか（試行段階の方針をそのまま文章にしたものです）
- ☐ 「依頼に応募する」タブ — トーク内容を運営が確認しうる旨の記載でよいか

> 直したい箇所があれば、文面をそのまま伝えてください。反映します。

---

## 🟡 継続中 / 期限なし

- ☐ **受注対象の団体を登録し、所属を付与していく** — 運用として続く作業。
  手順は `docs/admin-operations.md`「4. 所属団体を運用する」。
  これをやらないと全員が「個人申請」扱いになり、
  「関連団体に所属するユーザーからのクエストのみ受注」の運用ができません
- ☐ **通知先のSlackチャンネルがプライベートか**を確認する —
  氏名・メールアドレス・申請メッセージ（学部・学年・役職など）が流れます
- ☐ **LINEログインチャネルを「公開済み」にする** — 「開発中」のままだと
  Tester 権限を持つ人しかLINEログインできません（`docs/pilot-checklist.md` A-1）
- ☐ **大学の許可リスト登録を依頼する** — `@s.kyushu-u.ac.jp` 宛のメールが
  痕跡なく消える件。送信ドメインを大学の情報基盤側で許可してもらう
- ☐ **運営アカウントの共用化** — まだ個人アカウントのものが残っている場合
  （`docs/pilot-checklist.md` D）
- ☐ **管理者を2人以上にする** — 1人だと審査が止まります
- ☐ **デスクトップの空リポジトリを片付ける** — `Desktop/ギルド git` 自体が
  古い個人リモート（`sorairo-dev/----git`）を指す**空のgitリポジトリ**になっています。
  0ファイルなので実害はありませんが、そこで `git add -A` すると
  アプリ全体を古い個人リポジトリに載せてしまう事故が起こりえます。
  消してよければ `Desktop/ギルド git/.git` フォルダを削除してください
  （**`kyudaiGuildWebApp/.git` の方は絶対に消さないこと**）

---

## ✅ 実施済み

- [x] **SQLマイグレーション v13・v14 を実行**（所属団体タグ / RLSのセキュリティ修正）
- [x] **Slack の専用チャンネル作成**と **Incoming Webhook 発行**、`SLACK_WEBHOOK_URL` を設定
- [x] **メール通知の環境変数**（`RESEND_API_KEY` / `MAIL_FROM`）を Vercel に設定
- [x] Cloudflare でドメイン取得、Resend のドメイン認証（SPF/DKIM/DMARC）
- [x] Supabase のカスタムSMTP設定（登録確認メール）
- [x] 旧 Vercel プロジェクトの削除（cron の二重実行を解消）
- [x] テストデータの初期化
- [x] 運営アカウントへの admin 付与

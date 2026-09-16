# 運営（人間）がやること

> コード側の実装が終わっても、**人間にしかできない作業**（SQLの実行、環境変数の設定、
> 外部サービスの設定）が残ります。それをここに集約します。
>
> **新しい機能を実装するたびに、このファイルの「未実施」に追記されます。**
> 終わったら `[x]` にして「実施済み」へ移してください。
>
> 最終更新: 2026-09-17

---

## 🔴 未実施（優先度順）

### 1. SQLマイグレーションを実行する

Supabase → **SQL Editor** で、**v13 → v14 の順に**ファイルの中身を貼って実行します。

| # | ファイル | 内容 |
|---|---|---|
| ☐ | `supabase/supabase_migration_v13_organizations.sql` | 所属団体タグ・所属申請 |
| ☐ | `supabase/supabase_migration_v14_rls_hardening.sql` | **RLSの穴をふさぐ（セキュリティ修正）** |

> ⚠️ **v14 は一般公開前に必ず実行してください。**
> 未実行だと、ログイン中の誰でも公開されている anon キーで Supabase を直接叩き、
> **自分を運営(admin)に昇格**させたり、**審査を通さずクエストを掲示**したりできます。
> v13 だけ入れて v14 を入れないと、団体機能の「運営だけが付与できる」前提も崩れます。

**実行後の確認** — 全部 1 以上が返れば成功:

```sql
select
  (select count(*) from information_schema.tables  where table_name = 'organizations')         as v13_orgs,
  (select count(*) from information_schema.tables  where table_name = 'organization_requests') as v13_reqs,
  (select count(*) from information_schema.columns where table_name = 'quests' and column_name = 'organization_id') as v13_quest_col,
  (select count(*) from pg_trigger where tgname = 'protect_profile_role')      as v14_role_guard,
  (select count(*) from pg_trigger where tgname = 'protect_quest_review')      as v14_review_guard,
  (select count(*) from pg_trigger where tgname = 'enforce_quest_organization') as v14_org_guard;
```

**v14 が効いているかの実地テスト**（一般ユーザーのアカウントでログインした状態で、
ブラウザの開発者ツールのコンソールから実行）:

```js
// 自分を運営に昇格できないこと
const { error } = await window.supabase?.from('profiles').update({ role: 'admin' }).eq('id', (await window.supabase.auth.getUser()).data.user.id);
console.log(error);  // → 「権限(role)はアプリから変更できません。」が出れば成功
```

> コンソールに `window.supabase` が無い場合は、このテストは飛ばして構いません。
> 上の確認SQLでトリガーが3本入っていれば、まず問題ありません。

---

### 2. 団体を登録して、所属を付与する

v13 実行後に行います。手順は `docs/admin-operations.md`「4. 所属団体を運用する」。

- ☐ `/admin` → **団体管理** タブで、受注対象にする関連団体を登録する
- ☐ 依頼を出す予定の人に所属を付与する（または本人に申請してもらって承認する）

> これをやらないと、全員が「個人申請」扱いになり、
> 「関連団体に所属するユーザーからのクエストのみ受注」の運用ができません。

---

### 3. 審査結果メールの動作確認

環境変数の設定は済んでいますが、**実際に届くかの確認がまだ**です。

- ☐ Vercel で **再デプロイ**した（環境変数は再デプロイしないと反映されません）
- ☐ テストアカウントでクエストを申請 → `/admin` で**承認** → 受信箱に届いた
- ☐ 別のクエストを**リジェクト** → 受信箱に届き、**理由が本文に入っている**
- ☐ Resend → **Emails** で `delivered` になっている
- ☐ 審査後に管理画面へ黄色の「メール通知に失敗しました」が**出ていない**

> 黄色の警告が出た場合は `MAIL_FROM` が Resend で認証済みのドメインか確認してください。
> 未認証ドメインだと Resend が 403 を返します。

---

### 4. チュートリアルの文面を確認する

`/tutorial`（ログイン後、ヘッダーの「チュートリアル」）を開いて、
**運営の方針と食い違っていないか**を見てください。実装者が決め打ちで書いた箇所があります。

- ☐ 「依頼を出す」タブ — ガイドラインの要約が実際の運用と合っているか
- ☐ 「審査する（運営）」タブ **← 運営アカウントでしか見えません**
  - ☐ 「確認すること」のチェックリストが、実際の審査基準と合っているか
  - ☐ 「**個人申請のものは原則リジェクトするか、所属を申請してもらう**」と書いています。
    この運用でよいか（試行段階の方針をそのまま文章にしたものです）
- ☐ 「依頼に応募する」タブ — トーク内容を運営が確認しうる旨の記載でよいか

> 直したい箇所があれば、文面をそのまま伝えてください。反映します。

---

## 🟡 継続中 / 期限なし

- ☐ **LINEログインチャネルを「公開済み」にする** — 「開発中」のままだと
  Tester 権限を持つ人しかLINEログインできません（`docs/pilot-checklist.md` A-1）
- ☐ **大学の許可リスト登録を依頼する** — `@s.kyushu-u.ac.jp` 宛のメールが
  痕跡なく消える件。送信ドメインを大学の情報基盤側で許可してもらう
- ☐ **運営アカウントの共用化** — まだ個人アカウントのものが残っている場合
  （`docs/pilot-checklist.md` D）
- ☐ **管理者を2人以上にする** — 1人だと審査が止まります

---

## ✅ 実施済み

- [x] **メール通知の環境変数**（`RESEND_API_KEY` / `MAIL_FROM`）を Vercel に設定
- [x] Cloudflare でドメイン取得、Resend のドメイン認証（SPF/DKIM/DMARC）
- [x] Supabase のカスタムSMTP設定（登録確認メール）
- [x] 旧 Vercel プロジェクトの削除（cron の二重実行を解消）
- [x] テストデータの初期化
- [x] 運営アカウントへの admin 付与

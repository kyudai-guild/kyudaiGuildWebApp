# 実環境（Supabase / Vercel）確認手順書

> **目的**: 実装モデルは実DBやVercelにアクセスできないため、設定ミス・SQL実行漏れがあっても検知できません。
> この手順書はあなた（人間）が実環境を確認するためのものです。各項目の「期待結果」と違ったら、**そのまま実行結果をコピーして実装モデルに貼り付けて**ください。
>
> SQL はすべて Supabase ダッシュボード → **SQL Editor** に貼り付けて Run するだけです（SELECT のみ＝安全。実行しても何も変更されません）。

---

## A. Supabase — DBスキーマの確認

### A-1. quests テーブルのカラム構成（migration v4 の実行前/後の判定）

```sql
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'quests'
ORDER BY ordinal_position;
```

**期待結果（migration v4 実行前）**: `category`, `skill_name`, `difficulty`, `deadline` が**含まれる**。
**期待結果（migration v4 実行後）**: 上記4カラムが**消えている**、かつ `status` の default が `'pending'`。

> ⚠️ v4 実行前に4カラムが既に無い、または v4 実行後も残っている場合は異常です。結果を実装モデルに報告してください。

### A-2. events テーブルの存在（migration v3 実行済みか）

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'events' ORDER BY ordinal_position;
```

**期待結果**: `id, title, description, category, organizer, location, event_date, start_time, end_time, status, created_by, ...` などが返る。
**0行が返る場合**: `supabase/supabase_migration_v3_events.sql` が未実行です。イベント機能が全て失敗します → SQL Editor で v3 を実行してください。

### A-3. RLS ポリシーの確認（イベントの管理者限定が効いているか）

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('quests', 'events', 'profiles', 'quest_applications')
ORDER BY tablename, policyname;
```

**期待結果**: `events` に INSERT 用ポリシー（`events_insert` 等）があり、`quests`/`profiles` にも複数ポリシーがある。
**events の行が無い場合**: RLS 未設定 → v3 SQL の実行漏れ。

### A-4. クエストの status 分布（migration v4 の事前確認）

```sql
SELECT status, count(*) FROM quests GROUP BY status;
```

**見るポイント**: `open` が残っていれば v1 時代のデータ。v4 の `UPDATE ... SET status='approved' WHERE status='open'` で `approved` に変換されます（v4 実行前に件数を控えておくと安心）。

### A-5. 管理者アカウントの確認

```sql
SELECT p.id, u.email, p.role
FROM profiles p JOIN auth.users u ON u.id = p.id
WHERE p.role = 'admin';
```

**期待結果**: 運営用の管理者アカウントが表示される。0行なら誰も `/admin` に入れません。

### A-6. 旧機能テーブルの残存確認（削除は任意）

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('evaluations', 'quest_completions', 'member_profiles');
```

**見るポイント**: 行が返っても**害はありません**（コードからはもう参照されません）。消したい場合のみ v4 SQL のコメントアウト部分（DROP TABLE）を実行。

---

## B. Vercel — 環境変数とデプロイ設定

Vercel ダッシュボード → 対象プロジェクト → **Settings → Environment Variables** で確認:

| 変数 | あるべき状態 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **必須**。Supabase プロジェクトの URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **必須**。anon public キー |
| `NEXT_PUBLIC_DEV_EMAILS` | **Phase 4 デプロイ後は不要** → 削除してよい（残っていても無害だが混乱の元） |
| `SUPABASE_SERVICE_ROLE_KEY` | **Phase 2 デプロイ後は不要** → 削除推奨（漏れると RLS を無視して全データ操作できる強力なキーのため、使わないなら消すのが安全） |
| `DISCORD_WEBHOOK_URL` | **Phase 2 デプロイ後は不要** → あれば削除してよい |

> 環境変数を変更したら **Redeploy が必要**です（変更は次のデプロイから反映）。

**デプロイブランチの確認**: Settings → Git で、動作確認したいブランチ（`feature/event-calendar`）のプレビューデプロイが動いているか、Deployments タブで最新コミットのハッシュ（`git log --oneline -1` の値）と一致しているか確認。**「直したはずなのに直ってない」時は大抵これ**（別ブランチ/古いコミットを見ている）。

---

## C. Supabase — Auth 設定

Supabase ダッシュボード → **Authentication → URL Configuration**:

- **Site URL**: 本番の URL（または現在テスト中の Vercel URL）
- **Redirect URLs**: Vercel のプレビュー URL（`https://*-xxx.vercel.app` 形式）が許可されているか

**症状と原因**: 確認メールのリンクを踏むと `localhost` に飛ぶ／エラーになる → Site URL・Redirect URLs の設定漏れです。

**Email confirmation**: Authentication → Sign In / Up → Email で「Confirm email」が **ON** であること（アプリは確認必須の前提で作られています）。

---

## D. 動作テスト

設定確認が済んだら `docs/manual-smoke.md` の手動スモークテストを実施してください（約10分）。
特に Phase 2〜4 のデプロイ後は:

1. **セクション6**（削除ルートが404になっているか）
2. **1-1**（九大メール以外で登録できないこと）
3. **1-5**（DB直接追加アカウントでログインできること）※非九大の管理者アカウントがある場合

---

## E. 異常時の報告フォーマット

実装モデルに報告する際は以下をコピペしてください:

```
[verify-environment 報告]
- 項目: A-2（例）
- 実行したSQL/操作: （そのまま貼る）
- 結果: （そのまま貼る）
- 期待結果との差分: （例: events テーブルが無い）
```

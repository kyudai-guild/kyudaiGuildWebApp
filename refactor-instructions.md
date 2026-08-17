# Refactor Instructions — 九大ギルド (kyudaiGuildWebApp)

> このドキュメントは実装担当モデルへの指示書です。
> 目的は「既存仕様を壊さずに技術的負債を減らし、今後変更しやすくすること」。
> **見た目の綺麗さ／全面書き換えは目的ではありません。** 証拠なく大きな削除・全面書き換えをしないこと。
>
> **2026-07-07 プロダクトオーナー決定済み事項**（本書に反映済み）:
> - 旧世代コード（Discord/評価/QR/ガチャ/スタンプ）は**すべて削除する**
> - DBデバッグは完了 → デバッグ用エラー漏洩は**是正する**
> - イベントに審査フローは**作らない** → 未使用の events review エンドポイントは**削除する**
> - 登録は九大生のみ。一般アカウントは運営が Supabase に直接追加する運用 → **dev用登録ホワイトリストは廃止**（ただしDB直接追加アカウントのログインは可能に保つ）
> - `middleware → proxy` 移行は**やらない**（問題が起きるまで放置）

---

## Objective

現行アプリの UI・機能・DB 挙動を変えずに、以下を安全な順序で実施する。

1. 旧世代コードの完全削除（承認済み）
2. デバッグ用エラー漏洩の是正（承認済み）
3. 登録フローの九大生限定化（dev ホワイトリスト廃止、承認済み）
4. 重複した設定・型の一元化
5. `any` の縮小（限定的）
6. 検証手段（typecheck）の整備
7. **【人間のSQL実行が前提】** quests テーブルの旧カラム掃除後、コードの二重書き除去

---

## Project Understanding（証拠にもとづく現状把握）

### これは何か
九州大学生向けの Web アプリ。3 つの主機能:
- **クエスト掲示板**: 学生が依頼（クエスト）を申請 → 管理者が承認/リジェクト → 承認済みが掲示され、他学生が応募。
- **イベントカレンダー**: 管理者が団体イベントを登録（登録時に即 `approved`、審査フローなし）→ カレンダー/リスト表示。
- **認証**: Supabase Auth（九大メール `@s.kyushu-u.ac.jp` / `@m.kyushu-u.ac.jp` 限定、メール確認必須）。

### 技術スタック（`package.json`）
- Next.js **16.2.4**（App Router, Turbopack）, React 19.2.4, TypeScript 5
- Supabase（`@supabase/ssr` 0.10.3, `@supabase/supabase-js` 2.106.2）
- Tailwind CSS v4, framer-motion, lucide-react
- `html5-qrcode`, `qrcode.react`（旧 QR 機能の依存 → **Phase 2 で削除対象**）
- **テストランナーは無し**（jest/vitest なし）

> `AGENTS.md`（= `CLAUDE.md` が `@AGENTS.md` を参照）:
> 「This is NOT the Next.js you know. Read `node_modules/next/dist/docs/` before writing code.」
> → Next.js 16 固有の破壊的変更に注意。必要時は同梱ドキュメントを読むこと。

### 主要エントリーポイント
- `src/app/layout.tsx` — ルートレイアウト（`GuildProvider` + `Header`）
- `src/app/page.tsx` — ホーム（未ログイン: ヒーロー+ログインCTA / ログイン: 直近イベント一覧 + クエスト掲示板）
- `src/middleware.ts` — 認証ガード（`/my-quests`, `/admin` 保護、admin ロール確認）**← 触らない**
- `src/contexts/GuildContext.tsx` — クライアント状態

### 主要モジュールと責務（現行アクティブ）
| ファイル | 責務 |
|---|---|
| `src/app/api/quests/route.ts` | GET(一覧) / POST(申請, status=pending, **旧カラム二重書きあり**) |
| `src/app/api/quests/[id]/review/route.ts` | 管理者承認/リジェクト。`effective_end_date` 計算 |
| `src/app/api/quests/[id]/apply/route.ts` | クエスト応募 |
| `src/app/api/my-quests/route.ts` | 自分のクエスト+応募者一覧 |
| `src/app/api/events/route.ts` | GET(月/直近フィルタ) / POST(管理者のみ, 即 approved) |
| `src/app/api/profile/route.ts` | 自分の profile 取得/upsert |
| `src/components/quest/QuestBoard.tsx` | 掲示板一覧 + 詳細モーダル + 応募 |
| `src/components/quest/CreateQuestModal.tsx` | クエスト申請フォーム |
| `src/components/events/*` | EventCalendar / EventDetailModal / CreateEventModal / UpcomingEvents / types |
| `src/app/admin/page.tsx` | 管理ダッシュボード（クエスト審査タブ / イベント管理タブ） |
| `src/app/my-quests/page.tsx` | 申請状況・応募者確認 |
| `src/components/member/MemberCard.tsx` | 会員情報パネル |
| `src/lib/supabase-client.ts` / `supabase-server.ts` | SSR ブラウザ/サーバークライアント |

### イベント権限（確認済み・変更禁止）
イベント登録は3層で管理者限定: UI（`isAdmin` 時のみボタン表示）/ API（非adminは403）/ RLS（`events_insert` が admin 要求）。

### 現在の検証コマンド
- `npm run dev` / `npm run build`（tsc 内包）/ `npm run lint`
- `npm run build` は成功するが警告あり: 「middleware → proxy に移行せよ」**← この警告は放置してよい（決定済み）**

### 環境変数
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — 現役
- `SUPABASE_SERVICE_ROLE_KEY` — 旧ルート専用 → Phase 2 の削除で未使用化
- `NEXT_PUBLIC_DEV_EMAILS` — Phase 4 で廃止
- `DISCORD_WEBHOOK_URL` — 旧 notify 専用 → Phase 2 で未使用化
- 全 Supabase モジュールの `'dummy'` フォールバックは**現状維持**（ローカル起動の維持のため）

---

## Behaviors To Preserve（絶対に壊してはいけない挙動）

1. **認証**: `signUp` 後の `signOut`＋確認画面表示、ログイン時 `email_confirmed_at` チェック、`/auth/callback` のコード交換。
   - **例外（意図的変更, Phase 4）**: メールドメイン検証は**サインアップ時のみ**に限定する。ログインはドメイン検証せず Supabase の認証に委ねる（DB直接追加アカウントのログインを可能にするため）。
2. **ルート保護**: `middleware.ts` の `/my-quests`・`/admin` ガード、admin ロール判定。**middleware.ts は一切変更しない。**
3. **クエスト**: 申請 `status=pending`、承認/リジェクト（理由必須）、`effective_end_date` 計算、承認済みのみ一般公開、応募バリデーション（満員/期限/重複/本人）。
4. **クエスト作成時の旧カラム二重書き**（`category`/`skill_name` ← `quest_type`）: **Phase 6 で人間が migration v4 SQL を実行完了するまで外してはならない。** 先に外すと INSERT が 23502 で失敗する。
5. **イベント**: 管理者のみ登録、登録時 `status=approved`、月/直近フィルタ、カテゴリ配色。
6. **RLS 前提**: API は RLS を前提に組まれている。
7. **UI 表示**: Tailwind v4 が本環境で不安定なため、コンポーネントは**意図的にインライン `style`** に移行済み。見た目・文言を変えない。`<style>` 埋め込みメディアクエリも維持。

---

## Non-Negotiables

- 公開 API のリクエスト/レスポンス**形状**（JSONキー）を変えない。エラー**文言**の汎用化のみ Phase 3 で許可。
- DB への変更はコードから行わない。SQL は人間が Supabase SQL Editor で実行する。
- UI の見た目・文言を変えない。
- 無関係な整形・リネーム・import 並べ替えを「ついで」でやらない。
- 1 コミット = 1 論理変更。各フェーズ後に検証。
- 削除は本書の**削除リストに列挙されたものだけ**。リスト外の削除は Stop-And-Ask。

---

## Stop And Ask Conditions（実装を止めて質問する条件）

- Phase 6 に着手する時点で、人間が migration v4 SQL を実行済みか**必ず確認**する（未実行なら着手しない）。
- 削除リスト外のファイル・依存・env を削除したくなったとき。
- 型を締めた結果、既存コードの**実行時挙動に関わる不整合**が見つかったとき（型だけ直して挙動が変わる場合）。
- テストランナー等の新規依存を追加したくなったとき（追加しない。必要と思うなら提案のみ）。
- 仕様がコードから判断できない・複数の設計案があるとき。

---

## Baseline Commands（最初に必ず記録）

```bash
cd kyudaiGuildWebApp
git status --short          # 未コミット変更の確認（混ぜない）
git branch --show-current
npm run build 2>&1 | tee /tmp/baseline-build.log   # 成功 + middleware 警告を記録
npm run lint  2>&1 | tee /tmp/baseline-lint.log
```

- 既存の未コミット変更があれば**先に人間へ確認**。自分の変更と混ぜない。
- `refactor-instructions.md` 自体が未コミットの場合は、最初に単独コミットしてよい。

---

## Debt Map（負債と対応区分）

### D1. 旧世代コードの残骸 — **APPROVED: 削除実施**
- **根拠**: import 0 件（grep 確認済み）/ ナビ未リンク / `api/review` は認証なしで service role により DB 書き込みする危険なドーマント経路。
- **削除リスト（これが全量。リスト外は消さない）**:
  ```
  src/components/gacha/Gacha.tsx
  src/components/stamp/StampCard.tsx
  src/components/quest/QuestCompleteModal.tsx
  src/components/quest/QuestBoard.tsx.test        # 拡張子.testだが実体は旧QuestBoard（死コード）
  src/app/review/page.tsx
  src/app/evaluate/[token]/page.tsx
  src/app/admin/qr/page.tsx
  src/app/api/notify/route.ts
  src/app/api/review/route.ts
  src/app/api/quests/evaluate/[token]/route.ts
  src/app/api/events/[id]/review/route.ts         # D10: 審査フローは作らない（決定済み）
  src/lib/supabase.ts                              # createAdminClient + 旧型。上記ルートのみが使用
  src/scripts/check_stats.ts
  src/scripts/list_skills.ts
  src/scripts/list_skills_raw.ts
  test_db.js
  supabase/supabase_migration.sql                  # v1時代 member_profiles 用。現アプリ無関係
  ```
- **付随削除（grep で未使用を確認してから）**:
  - `package.json` から `html5-qrcode`, `qrcode.react`（使用箇所は `admin/qr/page.tsx` のみのはず。削除後に grep で 0 件を確認 → `npm install` で lockfile 更新）
  - `.env.example` から `DISCORD_WEBHOOK_URL`, `SUPABASE_SERVICE_ROLE_KEY` の行（削除後に grep で参照 0 件を確認できた場合のみ）
- **検証**: 削除前後に `grep -rn "<各識別子>" src/` で参照 0 件 → `npm run build` 成功 → 全ページ手動巡回（/, /auth, /events, /my-quests, /admin）。

### D2. quests テーブルの旧/新カラム二重管理 — **GATED（人間のSQL実行後にコード変更）**
- **現状**: 実DBの quests に v1 の `category`(NOT NULL)/`skill_name`(NOT NULL)/`difficulty`/`deadline` が残存。API が `quest_type` を `category`/`skill_name` に複製して回避中。`supabase_schema.sql` は実DBと不一致。
- **人間が実行する SQL（migration v4）** — 実装モデルはこれを `supabase/supabase_migration_v4_cleanup.sql` として保存だけしてよい:
  ```sql
  -- 事前確認: SELECT status, count(*) FROM quests GROUP BY status;
  UPDATE quests SET status = 'approved' WHERE status = 'open';
  ALTER TABLE quests DROP COLUMN IF EXISTS category;
  ALTER TABLE quests DROP COLUMN IF EXISTS skill_name;
  ALTER TABLE quests DROP COLUMN IF EXISTS difficulty;
  ALTER TABLE quests DROP COLUMN IF EXISTS deadline;
  ALTER TABLE quests ALTER COLUMN status SET DEFAULT 'pending';
  ALTER TABLE quests DROP CONSTRAINT IF EXISTS quests_status_check;
  ALTER TABLE quests ADD CONSTRAINT quests_status_check
    CHECK (status IN ('pending','approved','rejected','closed'));

  -- 任意（旧機能のテーブルが残っていれば。実行は人間の判断）:
  -- DROP TABLE IF EXISTS evaluations;
  -- DROP TABLE IF EXISTS quest_completions;
  -- DROP TABLE IF EXISTS member_profiles;
  ```
- **SQL実行済み確認後のコード変更**:
  - `src/app/api/quests/route.ts` の POST から `category: quest_type` と `skill_name: quest_type` の2行を削除。
  - `supabase/supabase_schema.sql` を実DBに一致するよう更新（quests から旧カラム記述を除去、events テーブル定義を v3 から取り込み）。
- **検証**: プレビュー環境でクエスト申請 → 承認 → 応募まで E2E 手動確認。

### D3. STATUS 設定の重複 — SAFE
- `admin/page.tsx` と `my-quests/page.tsx` のほぼ同一 `const STATUS` を `src/components/quest/status.ts`（新規）に抽出し両者が import。**値・キー・色・ラベルは一切変えない**。
- 検証: build + 両ページ目視（バッジ不変）。

### D4. `createQuest: any` / `Icon: any` — SAFE（限定）
- `GuildContext.tsx` に `CreateQuestInput` 型を定義し `createQuest` の引数に適用（`CreateQuestModal` が送る形と一致させる）。
- `Icon: any` → `React.ElementType`（admin/page.tsx ほか）。
- **Quest 型の三重定義（GuildContext/admin/my-quests）の統合はやらない**（応答契約に触れるため今回スコープ外）。
- 検証: `npm run typecheck` エラーゼロ。エラーが出たら挙動変更をせず Stop-And-Ask。

### D5. デバッグ用エラー漏洩 — **APPROVED: 是正実施**
- `src/app/api/quests/route.ts` POST: `[${insertError.code}] ${insertError.message}` をクライアントへ返している → `console.error` に詳細を残し、クライアントへは `'クエストの作成に失敗しました。'` のみ。
- `src/app/api/events/route.ts` POST: 同様に `[${error.code}] ${error.message}` → `'イベントの登録に失敗しました。'` に変更し詳細は `console.error`。
- 検証: build + （可能なら）失敗ケースで汎用文言を確認。

### D6. 登録フローの九大生限定化 — **APPROVED: 実施（設計指定あり）**
- **決定**: 一般アカウントの登録は不可。必要なら運営が Supabase に直接追加。DB直接追加アカウントの**ログインは可能**でなければならない。
- **実装指定**（`src/components/auth/AuthForm.tsx`）:
  1. `NEXT_PUBLIC_DEV_EMAILS` ホワイトリスト分岐を削除。
  2. メールドメイン検証（`validateEmail`）を**サインアップ分岐のみ**で呼ぶよう変更。ログイン分岐ではドメイン検証をスキップし、Supabase の認証結果に委ねる。
  3. `.env.example` から `NEXT_PUBLIC_DEV_EMAILS` 行を削除（存在する場合）。`.env.local` は触らない（人間が管理）。
- **理由**: 現状 `validateEmail` はログインもブロックするため、単純にホワイトリストを消すと運営が直接追加した非九大アカウント（例: dev admin）がログイン不能になる。
- 検証: 九大ドメイン以外で**新規登録**が拒否されること／既存アカウントの**ログイン**は通ること（手動）。
- `'dummy'` フォールバックは今回**維持**（スコープ外）。

### D8. middleware 非推奨警告 — **WON'T DO（決定済み）**
- proxy 移行はやらない。警告は既知として baseline に記録するのみ。`middleware.ts` に触らない。

### D9. typecheck 欠如 — SAFE（一部）
- `package.json` scripts に `"typecheck": "tsc --noEmit"` を追加。テストランナー導入は**しない**。

### D11. `profile/route.ts` の死パラメータ — SAFE
- POST の分割代入から未使用の `last_check_in_date, monthly_checkin_count, checkin_month` を削除（挙動不変）。

---

## Implementation Phases（この順で。各フェーズ＝独立コミット）

### Phase 0 — Baseline
- Baseline Commands を実行し結果を記録。未コミット変更があれば人間に確認。

### Phase 1 — 安全網
1. `"typecheck": "tsc --noEmit"` を scripts に追加（D9）。実行し現状を記録。
2. `docs/manual-smoke.md` を新規作成: 認証（登録→確認→ログイン）/ クエスト（申請→承認→応募）/ イベント（登録→カレンダー表示→ホーム表示）/ 保護ルート（未ログインで /admin → /auth）の手動確認手順。**新規依存は入れない。**

### Phase 2 — 旧世代コードの削除（D1 + D10）
3. 削除リストのファイルを削除。削除前に各識別子の参照を grep で確認し、削除後に build。
4. `html5-qrcode` / `qrcode.react` を package.json から除去（grep で使用 0 を確認後）→ `npm install` → build。
5. `.env.example` の不要行を削除（grep 確認後）。

### Phase 3 — 明白な整理
6. D5: 両 POST ルートのエラー文言を汎用化（詳細は console.error へ）。
7. D11: profile/route.ts の死パラメータ削除。

### Phase 4 — 登録フローの九大生限定化（D6）
8. AuthForm: ドメイン検証をサインアップのみに限定し、`NEXT_PUBLIC_DEV_EMAILS` を廃止。手動でログイン/登録の両ケースを確認。

### Phase 5 — 重複と型（D3 + D4）
9. STATUS を共有モジュールへ抽出（視覚差分ゼロ確認）。
10. `CreateQuestInput` 型 + `Icon: React.ElementType`。typecheck 通過。

### Phase 6 — 【GATED】DB掃除後の二重書き除去（D2）
11. `supabase/supabase_migration_v4_cleanup.sql` を作成（上記SQL）。
12. **人間に「migration v4 を Supabase で実行したか」を確認。未実行なら停止。**
13. 実行確認後: POST /api/quests の `category`/`skill_name` 二重書きを削除、`supabase_schema.sql` を実DBに一致させる。
14. プレビューでクエスト申請→承認→応募の E2E 手動確認。

---

## Verification Requirements

- 各フェーズ後: `npm run build`（成功・警告差分なし ※middleware 警告は既知）、`npm run lint`、`npm run typecheck`（Phase 1 以降）。
- Phase 2 後: 全ページ手動巡回（/, /auth, /events, /my-quests, /admin）で 404/クラッシュなし。
- 視覚変更を伴わないこと（D3 は前後で目視比較）。
- API レスポンスの JSON キー不変（D5 の error 文言のみ例外）。

---

## Reporting Format（最後に必ず報告）

```
## 実行したフェーズ
- Phase X: <要約>

## 変更/削除ファイル一覧
- path — 理由（1行）

## 実行コマンドと結果
- npm run build → <成功/失敗, 警告差分>
- npm run lint  → <結果>
- npm run typecheck → <結果>

## Stop-And-Ask で保留した項目
- <あれば>

## Phase 6 の状態
- migration v4: <人間実行済み/未実行> / コード変更: <実施/未実施>

## 未解決/リスク
- <あれば>
```

---

## Out-of-scope Items（今回やらないこと）

- `middleware.ts` の変更・proxy 移行（決定済み: 放置）。
- UI の見た目・文言・レイアウト変更。
- Supabase の `'dummy'` フォールバック除去。
- テストランナー・新規ライブラリの導入。
- Quest 型三重定義の統合（応答契約に触れるため）。
- Tailwind への揺り戻し（インライン style を維持）。
- ブランチ運用・Vercel 設定の変更。

---

## Appendix — 「一見おかしいが正しい（消すな）」コード

- コンポーネント全般のインライン `style` と `<style>` 埋め込みメディアクエリ → Tailwind v4 が本環境で不安定なための意図的措置。
- Supabase モジュールの `'dummy'` フォールバック → ローカル/プレビュー起動維持のため（現状維持と決定）。
- `POST /api/quests` の `category`/`skill_name` 二重書き → **Phase 6 の SQL 実行完了までは必須**。

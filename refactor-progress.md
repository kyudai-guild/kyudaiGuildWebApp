# Refactor Progress Log — 引き継ぎ用

> **このファイルの目的**: セッションが途中で切れても、次の実装モデルがどこから再開すべきか即座に分かるようにする。
> 各フェーズの完了ごとに必ず更新し、フェーズのコミットと同時にコミットすること。
> 指示書本体: `refactor-instructions.md`（このファイルと同じディレクトリ）

## 再開手順（次のモデルへ）

1. このファイルの「フェーズ状況」を見て、最初の `IN PROGRESS` または `NOT STARTED` から再開する。
2. `git log --oneline -15` で下記のコミット履歴と一致しているか確認する。
3. 作業ブランチは `feature/event-calendar`。**ブランチを変えない。**
4. 各フェーズ後に `npm run build` / `npm run lint` /（Phase 1 以降）`npm run typecheck` を実行し、結果をここに追記する。
5. **Phase 6 はゲート付き**: 人間が Supabase で migration v4 SQL を実行したと明言するまでコード変更禁止。

## フェーズ状況

| Phase | 内容 | 状態 | コミット |
|---|---|---|---|
| 0 | Baseline 記録 | **DONE** | （進捗ファイル追加コミット） |
| 1 | typecheck script + docs/manual-smoke.md | **DONE** | （Phase 1 コミット参照） |
| 2 | 旧世代コード削除（D1+D10、17ファイル+依存2つ+env行） | **DONE** | （Phase 2 コミット参照） |
| 3 | エラー文言汎用化（D5）+ profile死パラメータ（D11） | NOT STARTED | - |
| 4 | 登録の九大生限定化（D6、ドメイン検証をサインアップのみに） | NOT STARTED | - |
| 5 | STATUS共有化（D3）+ CreateQuestInput/Icon型（D4） | NOT STARTED | - |
| 6 | 【GATED】migration v4 後の二重書き除去（D2） | BLOCKED（人間のSQL実行待ち） | - |

## Baseline（Phase 0 の記録・2026-07-07）

- ブランチ: `feature/event-calendar`
- Baseline 時点の HEAD: `3bfe11b` (docs: add refactor instructions)
- 未コミット変更: なし（refactor-instructions.md は単独コミット済み）
- `npm run build`: **成功**。既知の警告のみ:
  `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`（放置と決定済み）
  ルート一覧に旧ルート（/admin/qr, /api/notify, /api/review, /api/quests/evaluate/[token], /api/events/[id]/review, /evaluate/[token], /review）が含まれる → Phase 2 で消える予定。
- `npm run lint`: **失敗（既存）** — 63 problems (44 errors, 19 warnings)。内訳:
  - `scratch/*.js`, `scripts/*.js`, `test_db.js` の require() 禁止エラー（過去のデバッグ用スクリプト）
  - `src/` 内の `no-explicit-any`（D4 で一部解消予定）、`react-hooks/set-state-in-effect`、`no-html-link-for-pages` 警告等
  - **判定基準**: lint はベースラインで既に失敗している。以降のフェーズでは「新規エラーを増やさない」ことを合格基準とする（既存エラーの修正はスコープ外）。
- **注意（削除リスト外の残骸を発見）**: `scratch/` ディレクトリと `scripts/fix.js, patch*.js, replace*.js` は lint エラーを出す過去のデバッグ残骸だが、**D1 削除リストに含まれないため削除しない**（Stop-And-Ask 対象として最終報告に記載）。

## Phase 1 の記録

- `package.json` に `"typecheck": "tsc --noEmit"` を追加。**ベースラインで typecheck はエラーゼロ**（以降もゼロ維持が基準）。
- `docs/manual-smoke.md` を新規作成（認証/保護ルート/クエスト/イベント/巡回/削除ルート404 の6セクション）。

## Phase 2 の記録

- D1 削除リストの17ファイルを全削除（削除前に grep で現役コードからの参照ゼロを確認。参照は削除対象同士の内部のみだった）。
- `package.json` から `html5-qrcode`, `qrcode.react` を除去 → `npm install` で lockfile 更新（2パッケージ削除）。
- `.env.example` から `SUPABASE_SERVICE_ROLE_KEY` 行を削除（`DISCORD_WEBHOOK_URL` と `NEXT_PUBLIC_DEV_EMAILS` はそもそも .env.example に無かった）。
- **ビルドの罠**: 削除直後の build は `.next/dev/types/validator.ts` が旧ルート（/admin/qr）の型を参照して失敗した → `.next` を削除して再ビルドで解決。**ルート削除後は `.next` の削除が必要**。
- 検証: build 成功（ルート一覧から旧7ルートが消えたことを確認）/ typecheck エラーゼロ / lint 63→53 problems（新規エラーなし、削除ファイル分の減少）。

## Stop-And-Ask で保留した項目

- （なし）

## 人間への確認待ち事項

- **Phase 6 ゲート**: migration v4（`supabase/supabase_migration_v4_cleanup.sql`）を Supabase SQL Editor で実行したか。未実行の間、`src/app/api/quests/route.ts` の `category`/`skill_name` 二重書きは**絶対に外さない**。
- 実環境（Supabase / Vercel）の設定確認: `docs/verify-environment.md` の手順書を人間が実施する。

## メモ・注意（次のモデルが踏みやすい罠）

- Tailwind v4 がこの環境で不安定 → 全コンポーネントは意図的にインライン `style` + `<style>` タグのメディアクエリ。**className への揺り戻し禁止。**
- `middleware.ts` は一切触らない（proxy 移行はやらないと決定済み）。build 時の middleware 非推奨警告は既知・放置。
- Windows 環境。ファイル書き込みは Write/Edit ツール、シェルは PowerShell 5.1（`&&` 不可）。
- 削除は `refactor-instructions.md` の D1 削除リストに列挙されたものだけ。

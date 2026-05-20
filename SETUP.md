# セットアップ / 動作確認手順

このアプリは Supabase（DB）と Discord OAuth（認証）に依存する。
ただし、フロントエンドの見た目とアクセシビリティの確認は **Supabase 認証なしでも可能**。

---

## A. Supabase 認証取得後にやること（チェックリスト）

> Supabase プロジェクトの SQL Editor 権限が必要。

### A-1. `member_profiles` テーブルが存在することを確認
リポジトリにスキーマ定義は無い（過去に手動作成された想定）。
最低限、以下のカラムが必要：

| カラム | 型 | 用途 |
|---|---|---|
| `discord_id` | text (PK 推奨) | Discord ユーザー ID |
| `display_name` | text | 表示名 |
| `avatar_url` | text | アバター URL |
| `tags` | text[] または jsonb | 特技タグ |
| `last_check_in_date` | text または date | 直近チェックイン日 |
| `updated_at` | timestamptz | 更新時刻 |

無ければ Supabase で作成する（後で SQL を整備する場合はこのファイルに追記）。

### A-2. `supabase_migration.sql` を実行
リポジトリ直下の `supabase_migration.sql` を Supabase SQL Editor にコピペして実行。
`member_profiles` に以下を追加する:

- `monthly_checkin_count` (integer, default 0)
- `checkin_month` (text)

→ これが **未実行だとランキングAPIが空のまま** になる（コード側で 500 を返さず縮退表示に変えてあるので、エラーにはならないが、データが出ない）。

### A-3. `supabase_schema.sql` を実行
リポジトリ直下の `supabase_schema.sql` を Supabase SQL Editor にコピペして実行。
以下を作成する:

- `quest_completions` テーブル
- `evaluations` テーブル
- RLS ポリシー

→ これが未実行だと、**実績API・スキル評価API も空のまま** になる。

### A-4. （任意）`get_skill_stats` RPC の作成
RPC 関数が未作成でも、API 側でフォールバック集計が動く。
パフォーマンスが気になる場合のみ、SQL で RPC を実装する。

### A-5. 環境変数を実値に差し替え
`.env.local` のダミー値を本物に置き換える（B-1 参照）。

---

## B. ローカル動作確認（Supabase 認証なしで OK）

### B-1. `.env.local` をリポジトリ直下に作る

```
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy
SUPABASE_SERVICE_ROLE_KEY=dummy
NEXTAUTH_SECRET=any-string-here-32-chars-or-more
NEXTAUTH_URL=http://localhost:3000
DISCORD_CLIENT_ID=dummy
DISCORD_CLIENT_SECRET=dummy
```

### B-2. 起動

```
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開く。

### B-3. このブランチ（`fix/ui-api-issues`）で確認できること

| 項目 | 確認方法 | 期待 |
|---|---|---|
| モバイル見切れ | DevTools → デバイスツールバー → 幅 375px（iPhone SE 相当） | 「みつける・たかめる・つながる・つむぐ・ひらく」が折り返し、横にはみ出さない |
| 会員証ボタン入れ子 | DevTools → Accessibility パネル → カードを選択 | 「会員証をフリップ」というラベルが消え、Skills/Achievements/編集ボタンが独立した button として並ぶ |
| プロフィール編集 Esc | 編集パネルを開いて Esc キーを押す | パネルが閉じる |
| プロフィール編集 × ボタンラベル | DevTools → 要素検査で × ボタンを選択 | `aria-label="プロフィール編集を閉じる"` が付いている |
| APIの縮退表示 | ネットワークタブで `/api/member/*` を見る | 401 や 500 ではなく、200 + 空配列 `[]` が返る（Supabase 未接続でも UI が壊れない） |

### B-4. 確認できないこと（Supabase 認証取得後でないと確認できない）

- ログイン後の自分のスキル統計・実績データの表示
- ランキングの実データ
- プロフィールの保存

---

## C. 履歴

- 2026-05-20: `AIによる問題点.md` の指摘に対応する `fix/ui-api-issues` ブランチを作成。
  - フロント: モバイル見切れ修正、会員証カードのボタン入れ子解消、編集パネルの Esc / aria 対応
  - API: leaderboard / achievements / stats を 500 ではなく空配列縮退に変更

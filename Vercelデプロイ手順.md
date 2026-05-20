# Vercel でブランチをクラウドで動かす手順

## Vercel ってなに？

GitHub のリポジトリと繋げると、ブランチを push するたびに
**専用のURLが自動で作られる**サービス。

```
main ブランチ       → https://guild-app.vercel.app        （本番）
fix/ui-api-issues  → https://guild-app-fix-xxx.vercel.app （プレビュー）
```

無料で使える。Next.js との相性が一番いい。

---

## 事前に確認すること

- GitHub アカウント（あるはず）
- このリポジトリへの admin または collaborator 権限

---

## セットアップ手順

### ① Vercel にサインイン

1. https://vercel.com を開く
2. 「Continue with GitHub」をクリック
3. GitHub アカウントでログイン

---

### ② リポジトリを追加

1. ダッシュボードの「**Add New… → Project**」をクリック
2. 「Import Git Repository」の一覧からこのリポジトリ（`teruk328-design/-`）を探して「**Import**」

   > リポジトリが一覧に出ない場合：
   > 「Adjust GitHub App Permissions →」→ 対象リポジトリにチェックを入れて保存

---

### ③ 環境変数を設定

インポート画面の「**Environment Variables**」欄に、以下を1行ずつ追加する。

| 変数名 | 値 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase の Project URL（認証取得後）※ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase の anon key ※ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase の service_role key ※ |
| `NEXTAUTH_SECRET` | 32文字以上の適当な文字列（例: `myrandomsecret1234567890abcdefgh`） |
| `NEXTAUTH_URL` | `https://（Vercelが発行するドメイン）`（後で変更可） |
| `DISCORD_CLIENT_ID` | Discord デベロッパーポータルのクライアントID |
| `DISCORD_CLIENT_SECRET` | Discord デベロッパーポータルのクライアントシークレット |

> ※ Supabase の認証がまだの場合は `dummy` と入力しておいてOK。
> APIのデータは出ないが、フロントエンドの見た目確認はできる。

---

### ④ デプロイ

1. 「**Deploy**」ボタンをクリック
2. ビルドログが流れて、2〜3分で完了
3. 「🎉 Congratulations!」が出たらデプロイ成功

本番URL（main ブランチ）が発行される。

---

## ブランチのプレビューURLを確認する方法

### 方法A：GitHub の PR から見る
1. GitHub でプルリクエストを開く
2. 下の方にある「**Vercel** — Preview deployed」のチェックマークをクリック
3. 「Visit Preview」でプレビューURLが開く

### 方法B：Vercel ダッシュボードから見る
1. https://vercel.com のダッシュボードを開く
2. プロジェクトをクリック
3. 「Deployments」タブ → ブランチ名で絞り込み
4. 該当のデプロイの「Visit」をクリック

---

## NEXTAUTH_URL の更新について

本番URLが確定したら、環境変数 `NEXTAUTH_URL` をその URL に変更する必要がある。

1. Vercel ダッシュボード → プロジェクト → 「Settings」
2. 「Environment Variables」タブ
3. `NEXTAUTH_URL` を `https://あなたのドメイン.vercel.app` に更新
4. 「Redeploy」して反映させる

---

## Supabase なしで確認できること / できないこと

| 確認できる | Supabase 認証が必要 |
|---|---|
| トップページの見た目 | ログイン後のプロフィール表示 |
| スマホでの文字折り返し | ランキングの実データ |
| プロフィール編集パネルの Esc 動作 | 実績・スキル評価データ |
| APIがエラーで落ちないこと（空表示になる） | チェックイン機能 |

---

## よくあるつまずき

**Q. ビルドが失敗した**
→ Vercel のビルドログを見て、エラーメッセージを確認。
  環境変数が足りていないケースが多い。

**Q. ログインしようとするとエラーになる**
→ Discord の Oauth リダイレクトURLに Vercel のドメインを追加する必要がある。
  Discord デベロッパーポータル → アプリ → OAuth2 → Redirects に
  `https://あなたのドメイン.vercel.app/api/auth/callback/discord` を追加する。

**Q. main を変えていないのにデプロイが走った**
→ Vercel はブランチへの push すべてに反応する。これは正常動作。

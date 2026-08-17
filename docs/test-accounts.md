# テスト用アカウントの作り方（運営向け）

> 応募者側の挙動を確認するには、依頼者役とは別のアカウントが必要です。
> アプリからの新規登録は九大メール限定ですが、**ログインはドメイン制限をしていない**ので、
> 運営が Supabase に直接追加したアカウントでテストできます（設計どおりの運用です）。

## 手順1: Supabase ダッシュボードでユーザーを作る

1. Supabase → **Authentication → Users** → 右上 **Add user → Create new user**
2. 入力する:
   - Email: `applicant-a@guild-dev.test`（好きな文字列でOK。実在しないドメインで構いません）
   - Password: 任意（テスト用に覚えやすいもの）
   - **☑ Auto Confirm User に必ずチェック**
3. **Create user**

> ⚠️ **Auto Confirm User のチェックが最重要**です。
> アプリはログイン時に `email_confirmed_at` を検証しており、未確認だと
> 「メールアドレスの認証が完了していません」で弾かれます。
> 実在しないドメインなので確認メールは届かず、後から確認する手段がありません。

複数人の応募をテストしたい場合は、`applicant-b@guild-dev.test` なども同じ手順で作ります。

## 手順2: 表示名を設定する（SQL Editor）

ダッシュボード作成だと `display_name` が空になるため、SQL Editor で設定します。
プロフィール行が自動生成されていない場合も、この1文で同時に作られます。

```sql
insert into profiles (id, email, display_name)
select u.id, u.email, 'テスト応募者A'
from auth.users u
where u.email = 'applicant-a@guild-dev.test'
on conflict (id) do update set display_name = excluded.display_name;
```

作成できたか確認:

```sql
select u.email, u.email_confirmed_at, p.display_name, p.role, p.onboarded_at
from auth.users u left join profiles p on p.id = u.id
where u.email like '%@guild-dev.test';
```

- `email_confirmed_at` が **NULL でない** こと（NULLなら手順1のチェック忘れ → 一度削除して作り直す）
- `role` は `user`（応募者役なので admin にしない）
- `onboarded_at` は NULL でOK（初回ログイン時に初期設定ウィザードが出ます。それも確認できます）

## トラブル: 「Invalid login credentials」と出る

メールかパスワードが一致していません（メール未確認の場合は別の文言になります）。
**最も多い原因は、ユーザー作成時に「Create new user」ではなく「Send invitation」を選んだこと**です。
招待方式ではパスワードが設定されず、招待メールも架空ドメインなので届きません。

まず状態を確認:

```sql
select id, email, email_confirmed_at, last_sign_in_at,
       (encrypted_password is null or encrypted_password = '') as password_missing
from auth.users
where email like '%guild-dev%';
```

- `password_missing` = true → パスワード未設定
- `email_confirmed_at` = NULL → 未確認（Auto Confirm のチェック忘れ）
- 行が返らない → 作成失敗、またはアプリが別プロジェクトを見ている

パスワードと確認状態をまとめて設定し直す（これが一番確実）:

```sql
update auth.users
set encrypted_password = crypt('Test1234!', gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now())
where email = 'applicant-a@guild-dev.test';
```

> `function crypt does not exist` と出たら `extensions.crypt(...)` / `extensions.gen_salt('bf')` に書き換える。

**それでも直らない場合**: 自分の九大アカウントで同じURLにログインできるか試す。
そちらもログインできないなら、Vercel の `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` が
ユーザーを追加したプロジェクトと一致していない（プレビュー環境に未設定を含む）。

## 手順3: 同時に2人分ログインしてテストする

セッションはCookieで管理されるため、同じブラウザの同じウィンドウでは1人しかログインできません。

- **依頼者役**: 通常のウィンドウ
- **応募者役**: **シークレット/プライベートウィンドウ**（または別ブラウザ）

この2つを並べて開くと、応募 → 通知バッジ → 承認 → マッチング成立の流れをリアルタイムに確認できます。

## 応募者フローの確認シナリオ

| # | 誰が | 操作 | 期待結果 |
|---|---|---|---|
| 1 | 応募者 | 初回ログイン | 初期設定ウィザードに誘導される（スキップ可） |
| 2 | 依頼者 | クエストを申請 | 審査中になる |
| 3 | 管理者 | `/admin` で承認 | 掲示板に載る |
| 4 | 応募者 | 掲示板から応募 | 応募完了。マイクエスト「応募した依頼」に検討中で出る |
| 5 | 依頼者 | ヘッダーを見る | 「マイクエスト ①」の赤バッジ（タブ復帰か60秒で更新） |
| 6 | 依頼者 | 応募者の「プロフィールを見る」 | 資格・自己PR・興味分野が見える |
| 7 | 依頼者 | 「承認する」 | バッジが消える。**案1**=双方にメール表示 / **案2**=トークルーム生成 |
| 8 | 依頼者 | 「完了報告する」 | 完了になり、双方に「感謝をおくる」が出る |
| 9 | 両者 | 感謝を送る | `/thanks` に反映。2回目はエラー |

## テスト後の片付け

テストデータを消す場合は、**Authentication → Users からユーザーを削除**すれば、
profiles・応募・トークなどは外部キーの `on delete cascade` で自動的に消えます。

クエストだけ消したい場合:

```sql
delete from quests where title like 'テスト%';
```

## 注意

- テストアカウントに `role = 'admin'` を付けないこと（応募者の見え方が変わります）
- 本番運用開始前に、`@guild-dev.test` のアカウントは削除してください
- 依頼者役は「掲示中で未完了の依頼」が1件あると新しい依頼を出せません（仕様）。
  続けてテストしたい場合は完了報告をしてから次を申請してください。

# 運営マニュアル（アカウント管理・データ初期化）

> 日常運用で必要になる操作をまとめたもの。SQL はすべて Supabase → **SQL Editor** に貼り付けて実行します。
> テストアカウントの作り方は `docs/test-accounts.md`、環境構築は `docs/operations-setup.md` を参照。

---

## 1. テストデータを消して、まっさらにする

パイロット開始前など、テスト中に作ったユーザー・クエスト・イベントを一掃したいとき。

**`supabase/supabase_reset_test_data.sql` を使います。** 上から順にブロックを実行してください。

### 実行前に必ず

1. スクリプトの **【0】現状確認** だけを先に実行し、何件消えるかを把握する
2. **【2】の `IN (...)` に、残したい運営アカウントのメールアドレスを書く**
   （ここに書いたアカウント以外が全部消えます。書き換え忘れると自分も消えます）

### 消える順序と理由

```
quests を削除
  └─ 応募 / 感謝 / トークルーム / トークメッセージ も連鎖削除
events を削除
auth.users を削除
  └─ profiles / 利用目的・興味分野の選択 も連鎖削除
```

> ⚠️ **quests・events を先に消す必要があります。**
> `quests.reviewed_by`（審査した管理者）だけは連鎖削除の対象外なので、
> クエストが残ったままユーザーを消そうとすると外部キー違反で失敗します。

### 消えないもの

- **利用目的・興味分野のマスタ**（`purpose_options` / `interest_options`）— 選択肢そのものは残ります
- Supabase の設定、環境変数、LINE の連携設定

### 自分のアカウントも消した場合

1. アプリから九大メールで新規登録し直す
2. 確認コードを入力して登録を完了する
3. 下の「2. 管理者にする」で `role = 'admin'` を付与する
4. LINE連携をやり直す（プロフィール画面から）

---

## 2. ユーザーを管理者にする

管理者になると、クエストの審査（承認・リジェクト）とイベント登録ができるようになります。

```sql
update profiles set role = 'admin'
where email = 'someone@s.kyushu-u.ac.jp';
```

**確認:**

```sql
select u.email, p.display_name, p.role
from profiles p join auth.users u on u.id = p.id
where p.role = 'admin';
```

**権限を外す:**

```sql
update profiles set role = 'user' where email = 'someone@s.kyushu-u.ac.jp';
```

> **反映のタイミング**: アプリは**ログイン時に権限を読み込む**ため、すでにログイン中の人は
> **一度ログアウトして入り直す**（またはページを再読み込みする）まで管理メニューが出ません。
>
> **前提**: 対象ユーザーが**一度アプリにログインしている**必要があります。
> profiles 行はログイン時に自動作成されるため、未ログインだと更新対象がありません。

**管理者は最低2人**にしておくことをおすすめします。1人だけだと、その人が対応できない間クエストの審査が止まります。

---

## 3. 九大メール以外のユーザーを登録する

アプリからの**新規登録は九大メール（`@s.kyushu-u.ac.jp` / `@m.kyushu-u.ac.jp`）限定**です。
これは在籍確認を兼ねた仕様なので、外部の方は**運営が Supabase に直接追加**します。

**ログイン側にはドメイン制限をかけていない**ので、直接追加したアカウントは普通にログインできます。

### 手順

1. Supabase → **Authentication → Users** → **Add user → Create new user**
2. 入力:
   - **Email**: 相手のアドレス（`@guild-dev.test` のような架空ドメインでも可）
   - **Password**: 初期パスワード（本人に伝えて、後で変更してもらう）
   - **☑ Auto Confirm User に必ずチェック**
3. **Create user**

> ⚠️ **Auto Confirm User のチェックが最重要**です。
> アプリはログイン時に `email_confirmed_at` を検証するため、未確認だと
> 「メールアドレスの確認が完了していません」で弾かれます。
> 架空ドメインだと確認メールも届かず、後から救済できません。

4. 表示名を設定（未設定だと空欄になります）:

```sql
insert into profiles (id, email, display_name)
select u.id, u.email, '表示したい名前'
from auth.users u
where u.email = '追加したアドレス'
on conflict (id) do update set display_name = excluded.display_name;
```

5. 本人に **アドレスと初期パスワード** を伝える。初回ログイン後、初期設定ウィザードが表示されます

### 「Send invitation」を選ばないこと

ユーザー追加メニューには「Send invitation」もありますが、**こちらはパスワードが設定されません**。
架空ドメインだと招待メールも届かないため、ログインできない状態になります。
必ず **「Create new user」** を選んでください。

### うまくログインできない場合

`Invalid login credentials` が出るときは、パスワード未設定か未確認です。両方まとめて直せます:

```sql
update auth.users
set encrypted_password = crypt('新しいパスワード', gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now())
where email = '対象のアドレス';
```

> `function crypt does not exist` と出たら `extensions.crypt(...)` / `extensions.gen_salt('bf')` に書き換えてください。

### 運用上の注意

- 外部アカウントは**在籍確認を経ていない**ため、誰に発行したかを運営側で記録しておいてください
- 不要になったら **Authentication → Users から削除**すれば、関連データも連鎖削除されます

---

## 4. その他よく使う操作

**初期設定をやり直させる**（ウィザードを再表示）

```sql
update profiles set onboarded_at = null where email = '対象のアドレス';
```

**LINE連携を解除する**（連携し直したいとき）

```sql
update profiles set line_user_id = null, line_display_name = null,
       line_picture_url = null, line_linked_at = null, line_friend = false
where email = '対象のアドレス';
```

**利用目的・興味分野の選択肢を増やす**（アプリ側の改修は不要）

```sql
insert into interest_options (label, sort_order) values ('新しい分野', 13);
insert into purpose_options (label, description, sort_order) values ('新しい目的', '説明', 7);
```

**選択肢を減らす**（削除せず非表示にする。ユーザーの選択履歴を壊さないため）

```sql
update interest_options set is_active = false where label = '使わなくなった分野';
```

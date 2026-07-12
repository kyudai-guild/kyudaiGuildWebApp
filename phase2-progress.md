# フェーズ2 進捗・引き継ぎドキュメント

> **目的**: セッションが切れても次の実装モデルが即再開できるようにする。
> 対象: デモ承認済みの4機能（①初期設定 ②プロフィール ③感謝+完了 ④連絡手段2案）+ LINE計画。

## ブランチ構成（重要）

| ブランチ | 内容 | 分岐元 |
|---|---|---|
| `feature/phase2-base` | ①②③ + マッチング基盤 + 連絡先公開設定（共通） | feature/event-calendar |
| `feature/phase2-contact` | ④案1: メール連絡先交換方式（+希望連絡先欄） | phase2-base |
| `feature/phase2-talk` | ④案2: サイト内トークルーム方式 | phase2-base |

- **DBは1つのSupabaseを全ブランチで共有**。スキーマは加算式なので、どのブランチでも壊れない。
- 共通の修正は phase2-base に入れて、両案ブランチへ `git merge feature/phase2-base` で配る。

## 人間が実行するSQL

| ファイル | 必要なブランチ | 状態 |
|---|---|---|
| `supabase/supabase_migration_v5_phase2.sql` | 全部（base 必須） | **未実行** |
| `supabase/supabase_migration_v6_talk.sql` | 案2 を試す時のみ | **未実行** |

v5 の内容: 目的/分野マスタ（論理削除つき）+ ユーザー選択 m2m + profiles拡張（qualifications/bio/line_notify/onboarded_at）+ quests完了ステータス/completed_at + quest_thanks + 連絡先公開列 + 応募updateポリシー + インデックス。

## 実装状況

### feature/phase2-base
- [x] migration v5 / v6 SQL 作成
- [x] `docs/line-integration-plan.md`（LINE連携はまず人間がアカウント/API準備 → その後 v7 で実装）
- [x] API: `GET /api/options`（マスタ取得）
- [x] API: `GET/POST /api/profile` 拡張（purpose_ids/interest_ids洗い替え, qualifications, bio, line_notify, onboarded）
- [x] API: `GET /api/profile/stats`（countクエリのみ＝軽量）/ `GET /api/profile/history`（10件ページネーション, role=posted|applied）
- [x] API: `GET /api/users/[id]`（応募者プロフィール閲覧）
- [x] API: `PATCH /api/applications/[id]`（accept/reject, 依頼者のみ, 定員チェック）
- [x] API: `POST /api/quests/[id]/complete`（approved→completed, 依頼者のみ）
- [x] API: `POST /api/quests/[id]/thanks` / `GET /api/thanks`（完了後・当事者のみ・1クエスト1回）
- [x] `POST /api/quests`: **approvedで未完了の依頼があると新規申請を400で拒否** + contact列の受け入れ
- [x] `/onboarding` 3ステップウィザード（スキップ可）+ GuildContext による未設定者の自動誘導
- [x] `/profile`（統計タイル4枚・履歴フィルタ+もっと見る・編集・LINE通知トグル）
- [x] `/thanks`（もらった/おくったタブ）
- [x] my-quests 拡張: 掲示/応募タブ、応募者プロフィールモーダル、承認/見送り、完了報告、感謝送信
- [x] QuestBoard 詳細: 依頼者メール表示（公開設定ON時・ログインユーザーにのみ表示）
- [x] CreateQuestModal: メール公開チェック（既定ON）
- [x] Header に プロフィール リンク
- [ ] build/typecheck 検証 → コミット（実行中）

### feature/phase2-contact（案1）— 未着手
1. base から分岐
2. CreateQuestModal に「希望連絡先（LINE/Instagram等, 任意）」入力欄 → `preferred_contact` で送信
3. my-quests 応募タブ: `status=accepted` になったら依頼者メール+希望連絡先を表示（「こちらに連絡してください」の案内文）
4. my-quests 掲示側: マッチ成立した応募者のメールを表示
5. QuestBoard: 希望連絡先の存在を「マッチ後に開示されます」と表示

### feature/phase2-talk（案2）— 未着手
1. base から分岐
2. API: `GET /api/talks`（自分のルーム一覧）/ `GET /api/talks/[id]`（メッセージ, ?after=）/ `POST /api/talks/[id]`（送信）
3. `PATCH /api/applications/[id]` の accept 時に talk_rooms/talk_members を作成（room: quest_id unique, member: 依頼者+承認応募者）
4. `/talks` 一覧 + `/talks/[id]` チャットUI（5秒ポーリング, 下部に「会話の内容は運営が確認することがあります」注意書き）
5. Header に トーク リンク

## 設計上の決定（次のモデルは変えないこと）

- **マスタはDB管理**: purpose_options / interest_options。追加はINSERT、削除は `is_active=false`（ユーザー選択の履歴を壊さない）。コードにラベルを埋め込まない。
- **新規依頼ブロックの条件**: 自分の quests に `status='approved'` が1件でもあれば新規申請不可（pending/rejected/completed はブロックしない）。承認済みは応募ゼロでも「完了報告」で解除できる。
- **感謝**: quest_thanks に UNIQUE(quest_id, sender_id, recipient_id)。送信条件は「クエスト completed かつ 当事者」（APIで検証、方向は依頼者⇔承認応募者）。
- **メール公開はオプトアウト式**（quests.contact_email_public default true）。表示は**ログインユーザーに限定**（未ログインには出さない）。
- **重さ対策**: 統計は head:true の count のみ / 履歴・感謝は10〜20件ページネーション / インデックス追加済み。
- 案2のRLSは security definer 関数 `is_talk_member()` で自己参照再帰を回避している（v6参照）。

## 既知の注意点

- profiles テーブルの email は認証済みユーザー全員が SELECT できる既存ポリシーのまま（今回の公開設定はUI/API表示の制御）。厳密に隠すなら profiles の列分離が必要（今回はスコープ外、運営判断）。
- 既存ユーザーも onboarded_at が NULL のため初回ログイン時に /onboarding に誘導される（スキップ可能）。
- `.next` キャッシュ: ルート追加/削除後にビルドが型エラーを出したら `.next` を削除して再ビルド。

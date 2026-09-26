'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useGuild } from '@/contexts/GuildContext';
import {
  ArrowLeft, BookOpen, Scroll, Send, Shield, Building2, CheckCircle2, XCircle,
  Users, Tag, Calendar, Mail, Heart, MessageCircle, AlertCircle, Search, Plus,
} from 'lucide-react';

/* ============================================================
   チュートリアル（デモページ）
   実際の画面を縮小再現したモックを各ステップに置いている。
   スクリーンショットではなく HTML で作っているのは、UIを変えたときに
   古い画像が残らないようにするため。
   ============================================================ */

const S = {
  page: { minHeight: '100vh' } as React.CSSProperties,
  pageHeader: { background: 'var(--bg-card)', borderBottom: '1px solid var(--color-border)', padding: 'clamp(1rem, 4vw, 1.5rem) clamp(1rem, 4vw, 2rem)', marginBottom: '1.5rem' } as React.CSSProperties,
  inner: { maxWidth: 820, margin: '0 auto' } as React.CSSProperties,
  content: { maxWidth: 820, margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem) 4rem' } as React.CSSProperties,
  backBtn: { display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 500, marginBottom: '1rem', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--color-text-tertiary)' } as React.CSSProperties,
  iconBox: { width: 40, height: 40, borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--bg-dark)' } as React.CSSProperties,
  card: { background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: '1rem', boxShadow: 'var(--shadow-card)' } as React.CSSProperties,
  mock: { background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '1rem', marginTop: '0.875rem' } as React.CSSProperties,
  mockLabel: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' } as React.CSSProperties,
};

const PAGE_STYLES = `
  .tut-tabs { display: flex; gap: 0.5rem; border-bottom: 1px solid var(--color-border); margin-bottom: 1.5rem; overflow-x: auto; }
  .tut-step-line { position: absolute; left: 15px; top: 34px; bottom: -6px; width: 2px; background: var(--color-border); }
  @media (max-width: 640px) {
    .tut-grid-2 { grid-template-columns: 1fr !important; }
  }
`;

/* ── 小さな部品 ───────────────────────────────── */

const pill = (text: string, color: string, bg: string) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 700, padding: '0.1875rem 0.625rem', borderRadius: '9999px', color, background: bg, whiteSpace: 'nowrap' }}>{text}</span>
);

function Step({ n, title, children, last }: { n: number; title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ position: 'relative', paddingLeft: '2.75rem', paddingBottom: last ? 0 : '2rem' }}>
      {!last && <span className="tut-step-line" />}
      <span style={{ position: 'absolute', left: 0, top: 0, width: 32, height: 32, borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', color: 'var(--color-accent)', fontSize: '0.875rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{n}</span>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.6, paddingTop: '0.25rem', marginBottom: '0.5rem' }}>{title}</h3>
      <div style={{ fontSize: '0.875rem', lineHeight: 1.9, color: 'var(--color-text-secondary)' }}>{children}</div>
    </div>
  );
}

function Mock({ label = '画面イメージ', children }: { label?: string; children: React.ReactNode }) {
  return (
    <div style={S.mock}>
      <p style={S.mockLabel}>{label}</p>
      {children}
    </div>
  );
}

function Note({ kind = 'info', children }: { kind?: 'info' | 'warn'; children: React.ReactNode }) {
  const c = kind === 'warn'
    ? { bg: '#fffbeb', border: '#fde68a', color: '#d97706' }
    : { bg: 'var(--bg-base)', border: 'var(--color-border)', color: 'var(--color-text-secondary)' };
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginTop: '0.75rem', fontSize: '0.8125rem', lineHeight: 1.8, background: c.bg, border: `1px solid ${c.border}`, color: c.color }}>
      <AlertCircle size={14} style={{ marginTop: 3, flexShrink: 0 }} />
      <div>{children}</div>
    </div>
  );
}

const fakeInput = (label: string, value: string, hint?: string) => (
  <div style={{ marginBottom: '0.75rem' }}>
    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.25rem' }}>{label}</p>
    <div style={{ background: 'var(--bg-base)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.8125rem', color: value ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>{value || '未入力'}</div>
    {hint && <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: '0.1875rem' }}>{hint}</p>}
  </div>
);

const fakeBtn = (text: string, variant: 'dark' | 'ok' | 'ng' | 'ghost', Icon?: React.ElementType) => {
  const v = {
    dark:  { background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', border: 'none' },
    ok:    { background: '#ecfdf5', color: '#059669', border: '1px solid #bbf7d0' },
    ng:    { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
    ghost: { background: 'var(--bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' },
  }[variant];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, padding: '0.5rem 1rem', borderRadius: '0.625rem', ...v }}>
      {Icon && <Icon size={13} />}{text}
    </span>
  );
};

/* ── 各タブの中身 ─────────────────────────────── */

/* 例として使う架空のクエスト（2026-09 の方針: 九大生が一日だけ参加できる体験。報酬なし） */
const EX_ORG = '〇〇和太鼓サークル';
const EX_TITLE = '和太鼓を1日だけ叩いてみよう';

const orgChip = (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '9999px', padding: '0.1875rem 0.625rem' }}>
    <Building2 size={11} />{EX_ORG}
  </span>
);

function PostTutorial() {
  return (
    <>
      <Step n={1} title="団体に所属を追加してもらう">
        クエストは<b>団体として</b>出すものです。まず、あなたのアカウントを団体に紐付けてもらいます。
        ログインに使っているメールアドレスを、<b>団体の団体長か運営</b>に伝えてください。
        追加されると、プロフィールの「所属団体」に団体名のタグが付きます。
        <Mock>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 700 }}>
              <Building2 size={14} style={{ color: 'var(--color-accent)' }} />所属団体
            </p>
            {orgChip}
          </div>
        </Mock>
        <Note kind="warn">
          <b>所属のタグが付くまで、クエストは出せません。</b>自分でタグを付けることはできません。
          プロフィールの「所属を申請する」から、運営に申請することもできます。
        </Note>
      </Step>

      <Step n={2} title="掲示板の「依頼を出す」を押し、注意事項を読む">
        クエストは<b>九大生が一日だけ参加できる体験</b>です。手や体を動かす体験があること、
        入部・入会の条件になっていないこと、やった後に「どう感じたか」が言えることが条件です。
        <Note kind="warn">
          <b>参加者に報酬が出るものは、当面お受けしていません。</b>
          参加費は必要経費の範囲で、必ずフォームに書いてください（当日その場で現金を求めることはできません）。
        </Note>
      </Step>

      <Step n={3} title="クエスト依頼書を書く">
        「掲示するもの」と「掲示しないもの」が分かれています。
        <Mock>
          {fakeInput('主催団体 ※必須', EX_ORG, '所属している団体だけが選べます')}
          {fakeInput('クエスト名 ※必須', EX_TITLE)}
          {fakeInput('日程 ※必須（複数回も可）', '10月20日(火) 10:00〜12:00')}
          {fakeInput('場所・集合場所 ※必須', '伊都キャンパス センター2号館前に集合')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="tut-grid-2">
            {fakeInput('定員 ※必須', '10人')}
            {fakeInput('参加費 ※必須', '無料')}
          </div>
          {fakeInput('当日の流れ ※必須', '10:00 集合・説明 ／ 10:20 基本の叩き方 ／ 11:30 合奏')}
          {fakeInput('団体の紹介・問い合わせ先 ※必須', '団体長が登録した内容が最初から入っています')}
          {fakeInput('当日の受け入れ担当者 ※必須（掲示しません）', 'お名前・当日つながる連絡先')}
        </Mock>
        <Note>
          問い合わせ先には、確実に連絡がつく<b>九大メールアドレス</b>もあわせて載せるのがおすすめです（ボタン1つで入れられます）。
          最後に「確認」の3項目にチェックして申請します。
        </Note>
        <Note kind="warn">
          <b>1団体あたり、未完了（審査中・掲示中）のクエストは10件まで</b>です。
          同じ団体から似たクエストが重ならないよう、出す前に団体内で相談してください。
        </Note>
      </Step>

      <Step n={4} title="審査結果がメールで届く">
        申請した時点では掲示板に出ません。<b>運営が内容を確認してから</b>掲示されます。
        結果はメールで届き、<b>掲載できない場合は理由が書かれています</b>。直して再度申請できます。
        <Mock label="メールのイメージ">
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            <Mail size={13} style={{ color: 'var(--color-accent)' }} />【九大ギルド】クエスト「{EX_TITLE}」の掲示を承認しました
          </p>
        </Mock>
      </Step>

      <Step n={5} title="応募が来たら、参加する人を承認する">
        応募があるとメールが届き、ヘッダーの「マイクエスト」に赤いバッジが出ます。
        応募者のプロフィールを見てから承認します。<b>定員は承認した人数で数えます</b>（見送った応募は枠を使いません）。
        掲示した人でなくても、<b>団体のメンバーなら誰でも</b>、マイクエストの「自団体の掲示クエスト」から承認・完了報告ができます。
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {fakeBtn('プロフィールを見る', 'ghost', Users)}
          {fakeBtn('承認する', 'ok', CheckCircle2)}
        </div>
      </Step>

      <Step n={6} title="トークで連絡する">
        承認するとトークができ、<b>承認した人・団体長・学生</b>が最初から参加しています。
        団体のメンバーなら誰でも、トーク一覧の「団体のトーク（未参加）」から自分で参加したり、
        「トークの人員」から同じ団体のメンバー（当日の担当者など）を追加したりできます。
        <div style={{ marginTop: '0.75rem' }}>{fakeBtn('トークを開く', 'ghost', MessageCircle)}</div>
      </Step>

      <Step n={7} title="終わったら「完了報告」をする" last>
        クエストが終わったら、マイクエストから完了報告をします。お互いに<b>感謝の言葉</b>を送れるようになります。
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {fakeBtn('完了報告する', 'dark', CheckCircle2)}
          {fakeBtn('感謝をおくる', 'ghost', Heart)}
        </div>
      </Step>
    </>
  );
}

function ApplyTutorial() {
  return (
    <>
      <Step n={1} title="掲示板でクエストを探す">
        クエストは、団体の活動に<b>一日だけ参加してみる体験</b>です。種別やキーワードで絞り込めます。
        カードには主催団体・日程・場所・参加費が出ます。
        <Mock>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
            {pill('仲間探し', '#2563eb', '#eff6ff')}
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>定員 0/10人</span>
          </div>
          <p style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.5rem' }}>{EX_TITLE}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Calendar size={12} />10月20日(火) 10:00〜12:00</span>
            <span>伊都キャンパス センター2号館前</span>
            <span>参加費 無料</span>
          </div>
          <div style={{ paddingTop: '0.75rem', marginTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>{orgChip}</div>
        </Mock>
      </Step>

      <Step n={2} title="詳細を開いて確かめる">
        日程・場所・参加費に加えて、<b>持ち物・服装、当日の流れ、参加条件</b>が書かれています。
        「主催団体について」には団体の紹介と問い合わせ先があるので、応募前に質問することもできます。
      </Step>

      <Step n={3} title="メッセージを添えて応募する">
        なぜ参加してみたいのかを一言添えてください。プロフィールの自己紹介も団体から見えます。
        <Mock>
          {fakeInput('応募メッセージ', '楽器は初めてですが、和太鼓に前から興味がありました。')}
          <div style={{ marginTop: '0.25rem' }}>{fakeBtn('応募する', 'dark', Send)}</div>
        </Mock>
      </Step>

      <Step n={4} title="結果を待つ">
        マイクエストの「応募した依頼」で状態を確認できます。
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {pill('検討中', '#d97706', '#fffbeb')}
          {pill('マッチ成立', '#059669', '#ecfdf5')}
          {pill('見送り', '#6b7280', '#f9fafb')}
        </div>
      </Step>

      <Step n={5} title="マッチしたらトークで連絡を取る">
        承認されるとトークでやり取りできます。団体の担当者が入ってくることもあります。
        <div style={{ marginTop: '0.75rem' }}>{fakeBtn('トークを開く', 'ghost', MessageCircle)}</div>
        <Note kind="warn">
          トークの内容は、トラブル対応のために運営が確認する場合があります。
          参加の後も勧誘が続くなど困ったことがあれば、運営に連絡してください。
        </Note>
      </Step>

      <Step n={6} title="参加したら感謝を送る" last>
        団体が完了報告をすると、お互いに感謝の言葉を送れるようになります。
        受け取った言葉はプロフィールに残ります。
      </Step>
    </>
  );
}

function ReviewTutorial() {
  return (
    <>
      <Step n={1} title="バッジで気づく">
        審査待ちのものがあると、ヘッダーの「管理」に赤いバッジが出ます。
        件数は<b>クエストの審査待ち＋所属団体の申請</b>の合計です。管理画面は暗い配色で、上部に「管理者モード」と出ます。
        <Note kind="warn">
          <b>クエストは運営が承認するまで掲示板に出ません。</b>1日1回は確認してください。
          動作確認でテスト用のクエストを出すときは、管理画面の一番上のスイッチで<b>Slack通知を一時停止</b>できます。
        </Note>
      </Step>

      <Step n={2} title="「クエスト審査」タブで依頼書を確認する">
        カードを開くと、依頼書の全項目と、<b>掲示しない「当日の受け入れ担当者」</b>が表示されます（運営にだけ見えます）。
        <Mock>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            {pill('審査中', '#d97706', '#fffbeb')}
            {orgChip}
          </div>
          <p style={{ fontSize: '0.875rem', fontWeight: 700 }}>{EX_TITLE}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>10月20日(火) 10:00〜12:00 ・ 定員10人 ・ 参加費 無料</p>
        </Mock>
      </Step>

      <Step n={3} title="確認すること">
        <div style={{ ...S.mock, background: 'var(--bg-base)' }}>
          <ul style={{ margin: 0, paddingLeft: '1.125rem', fontSize: '0.8125rem', lineHeight: 2, color: 'var(--color-text-secondary)' }}>
            <li><b>クエストの条件</b> — 手や体を動かす体験があるか／入部・入会の条件になっていないか／感想が言える形か</li>
            <li><b>参加費</b> — 必要経費の範囲か。参加者に報酬が出るものは受けない</li>
            <li><b>お受けできないもの</b> — 勧誘が主目的、お酒・夜間の屋外・水辺・高所・激しい運動、車やバイクの運転など</li>
            <li><b>当日の受け入れ担当者</b> — 名前と当日つながる連絡先が書かれているか</li>
            <li><b>書き方</b> — 言い切り・根拠のない表現が無いか。団体を知らない人が読んで分かるか</li>
          </ul>
        </div>
      </Step>

      <Step n={4} title="承認する">
        ワンクリックで承認されます。掲示は「申込の締切」の日まで続きます。
        <div style={{ marginTop: '0.75rem' }}>{fakeBtn('承認する', 'ok', CheckCircle2)}</div>
        <p style={{ marginTop: '0.625rem' }}>
          承認すると掲示板に載り、<b>掲示者に承認メールが届きます</b>。
        </p>
      </Step>

      <Step n={5} title="リジェクトする">
        「リジェクト」を押すと理由の入力欄に切り替わります。<b>理由は必須</b>です。
        <Mock>
          {fakeInput('リジェクト理由 ※必須', '参加費1,500円の内訳が分からないため、必要経費の内訳を書き添えてください。')}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {fakeBtn('キャンセル', 'ghost')}
            {fakeBtn('リジェクト', 'ng', XCircle)}
          </div>
        </Mock>
        <Note kind="warn">
          <b>入力した理由は、そのまま掲示者へのメール本文に載ります。</b>
          <b>どこを直せば通るのか</b>が分かるように書いてください。
        </Note>
      </Step>

      <Step n={6} title="団体を登録し、団体長を指名する">
        「団体管理」タブで団体を登録し、団体の行を開いてメンバーを追加します。
        メンバーの行の「<b>団体長にする</b>」で団体長を指名できます。
        団体長は、以後メールアドレスを入力して自分の団体にメンバーを追加できます（追加・削除は運営のSlackに通知されます）。
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {fakeBtn('追加する', 'dark', Plus)}
          {fakeBtn('検索', 'ghost', Search)}
        </div>
        <Note kind="warn">
          団体をやめるときは<b>削除ではなく「無効にする」</b>を使ってください（過去のクエストの記録を保つため）。
        </Note>
      </Step>

      <Step n={7} title="所属申請・イベントを管理する" last>
        「所属申請」タブには、ユーザーから届いた所属の申請が並びます。本人確認の材料を見て承認してください。
        イベントの<b>登録・編集・削除</b>は「イベント管理」タブで行います（カレンダー画面からは登録できません）。
      </Step>
    </>
  );
}

/* ── ページ本体 ───────────────────────────────── */

type Tab = 'post' | 'apply' | 'review';

export default function TutorialPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin } = useGuild();
  const [tab, setTab] = useState<Tab>('post');

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>チュートリアルを見るにはログインしてください。</p>
      </div>
    );
  }

  const tabBtn = (key: Tab, label: string, Icon: React.ElementType) => {
    const active = tab === key;
    return (
      <button key={key} onClick={() => setTab(key)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer', border: 'none', borderBottom: '2px solid', background: 'none', whiteSpace: 'nowrap', transition: 'all 0.2s',
          color: active ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
          borderBottomColor: active ? 'var(--color-primary)' : 'transparent' }}
      ><Icon size={16} />{label}</button>
    );
  };

  return (
    <div style={S.page}>
      <style>{PAGE_STYLES}</style>

      <div style={S.pageHeader}>
        <div style={S.inner}>
          <button onClick={() => router.push('/')} style={S.backBtn}>
            <ArrowLeft size={14} />ホームへ戻る
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={S.iconBox}><BookOpen size={18} style={{ color: 'var(--color-accent)' }} /></div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>チュートリアル</h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>使い方を順番に見ていけます</p>
            </div>
          </div>
        </div>
      </div>

      <div style={S.content}>
        <div className="tut-tabs">
          {tabBtn('post', '依頼を出す', Scroll)}
          {tabBtn('apply', '依頼に応募する', Send)}
          {isAdmin && tabBtn('review', '審査する（運営）', Shield)}
        </div>

        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
          style={{ ...S.card, padding: 'clamp(1.25rem, 4vw, 2rem)' }}>
          {tab === 'post' && <PostTutorial />}
          {tab === 'apply' && <ApplyTutorial />}
          {tab === 'review' && isAdmin && <ReviewTutorial />}
        </motion.div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/#quest-board')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', border: 'none' }}
          ><Scroll size={14} />掲示板へ</button>
          <button onClick={() => router.push('/profile')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', background: 'var(--bg-card)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
          ><Building2 size={14} />プロフィール・所属団体</button>
        </div>
      </div>
    </div>
  );
}

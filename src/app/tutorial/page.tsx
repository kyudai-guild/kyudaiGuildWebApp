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

function PostTutorial() {
  return (
    <>
      <Step n={1} title="所属団体を登録しておく">
        プロフィール画面の「所属団体」から、所属している団体を申請します。
        メッセージ欄には<b>運営が本人確認できる情報</b>（学部・学年・団体での役職など）を書いてください。
        運営が承認すると、依頼を出すときに団体名を選べるようになります。
        <Mock>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 700 }}>
              <Building2 size={14} style={{ color: 'var(--color-accent)' }} />所属団体
            </p>
            {fakeBtn('所属を申請する', 'ghost')}
          </div>
          {fakeInput('団体', '九州大学◯◯サークル')}
          {fakeInput('運営へのメッセージ ※必須', '工学部3年、◯◯サークルで会計を担当しています。')}
        </Mock>
        <Note kind="warn">
          試行段階のため、<b>関連団体に所属する方からの依頼のみ</b>を受け付けています。
          所属がなくても申請自体はできますが、「個人申請」として審査されます。
        </Note>
      </Step>

      <Step n={2} title="掲示板から「クエストを掲示する」を押す">
        トップページの掲示板にあるボタンです。ログインしていないと表示されません。
      </Step>

      <Step n={3} title="ガイドラインを読んで同意する">
        学業不正の助長、マルチ商法や宗教勧誘、出会い目的、おとり募集などは禁止です。
        雇用契約なら最低賃金の遵守、業務委託なら偽装請負の禁止など、契約形態ごとの注意もあります。
        <Note>
          ここに反する依頼は、事前通知なく削除されることがあります。必ず目を通してください。
        </Note>
      </Step>

      <Step n={4} title="内容を入力する">
        <Mock>
          {fakeInput('申請元（所属団体）', '九州大学◯◯サークル', '選んだ団体名が掲示板と審査画面に表示されます')}
          {fakeInput('クエスト名 ※必須', 'イベント告知用チラシのデザイン')}
          {fakeInput('クエスト内容 ※必須', '11月の学園祭で配るA4チラシのデザインをお願いしたいです。素材と文面はこちらで用意します。')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="tut-grid-2">
            {fakeInput('募集人数 ※必須', '1')}
            {fakeInput('クエスト種別 ※必須', '業務委託')}
          </div>
          {fakeInput('報酬', '5,000円')}
          {fakeInput('掲示期間 ※必須', '2週間', '掲示許可が出てから2週間掲示されます')}
          <div style={{ marginTop: '0.5rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>連絡先の公開</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
              ☑ 九大メールアドレスを応募者に公開する（推奨）
            </p>
          </div>
        </Mock>
        <Note>
          <b>報酬</b>は「5,000円」「昼食おごり」「経験値のみ」など、実態をそのまま書いてください。
          実際の条件と著しく違う掲示（おとり募集）は禁止です。
        </Note>
      </Step>

      <Step n={5} title="申請する">
        {fakeBtn('クエストを申請する', 'dark', Send)}
        <p style={{ marginTop: '0.625rem' }}>
          申請した時点では掲示板に出ません。<b>運営の審査を通ってから</b>掲示されます。
          状態はマイクエストで確認できます。
        </p>
        <Mock>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {pill('審査中', '#d97706', '#fffbeb')}
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>業務委託</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '9999px', padding: '0.1875rem 0.625rem' }}>
              <Building2 size={11} />九州大学◯◯サークル
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, marginTop: '0.5rem' }}>イベント告知用チラシのデザイン</p>
        </Mock>
      </Step>

      <Step n={6} title="審査結果がメールで届く">
        承認・リジェクトのどちらでも、登録しているメールアドレスにお知らせが届きます。
        <b>リジェクトの場合は理由が本文に書かれています</b>ので、内容を直してから再度申請してください。
        <Mock label="メールのイメージ">
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            <Mail size={13} style={{ color: 'var(--color-accent)' }} />【九大ギルド】クエスト「イベント告知用チラシのデザイン」の掲示を承認しました
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.375rem', lineHeight: 1.8 }}>
            掲示板に掲載されましたので、応募をお待ちください。掲示期限は◯月◯日までです。
          </p>
        </Mock>
      </Step>

      <Step n={7} title="応募が来たら承認する">
        応募があると、ヘッダーの「マイクエスト」に赤いバッジが出ます。
        応募者のプロフィール（資格・自己PR・興味分野・所属団体）を見てから判断できます。
        <Mock>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Scroll size={14} style={{ color: 'var(--color-text-secondary)' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>マイクエスト</span>
            <span style={{ minWidth: 16, height: 16, padding: '0 4px', borderRadius: 9999, background: '#dc2626', color: '#fff', fontSize: '0.625rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {fakeBtn('プロフィールを見る', 'ghost', Users)}
            {fakeBtn('承認する', 'ok', CheckCircle2)}
          </div>
        </Mock>
        <p style={{ marginTop: '0.625rem' }}>
          承認するとマッチ成立です。以降は<b>トーク画面</b>で直接やり取りできます。
        </p>
      </Step>

      <Step n={8} title="終わったら「完了報告」をする" last>
        依頼が完了したら、マイクエストから完了報告をします。
        完了すると、お互いに<b>感謝の言葉</b>を送れるようになります。
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {fakeBtn('完了報告する', 'dark', CheckCircle2)}
          {fakeBtn('感謝をおくる', 'ghost', Heart)}
        </div>
        <Note kind="warn">
          <b>完了報告をするまで、次の依頼を出せません。</b>
          掲示中の依頼が終わったら忘れずに報告してください。
        </Note>
      </Step>
    </>
  );
}

function ApplyTutorial() {
  return (
    <>
      <Step n={1} title="掲示板でクエストを探す">
        トップページの掲示板から、種別（仲間探し・研究協力・業務委託など）やキーワードで絞り込めます。
        カードには依頼者名と、団体からの依頼であれば団体名が表示されます。
        <Mock>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
            {pill('業務委託', '#d97706', '#fffbeb')}
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>0/1人</span>
          </div>
          <p style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.375rem' }}>イベント告知用チラシのデザイン</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>11月の学園祭で配るA4チラシのデザインを…</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '0.75rem', marginTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
            <div>
              <p style={{ fontSize: '0.625rem', fontWeight: 500, letterSpacing: '0.05em', color: 'var(--color-text-tertiary)' }}>依頼者</p>
              <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>山田太郎</p>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '9999px', padding: '0.1875rem 0.625rem', marginTop: '0.25rem' }}>
                <Building2 size={11} />九州大学◯◯サークル
              </span>
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-accent)' }}>5,000円</span>
          </div>
        </Mock>
      </Step>

      <Step n={2} title="詳細を開いて条件を確かめる">
        募集人数、報酬、掲示期限、タグが表示されます。
        依頼者が連絡先を公開している場合は、応募前に質問することもできます。
        <Note>
          報酬・作業内容・期限に納得できない場合は、応募前に依頼者へ確認してください。
          条件の交渉や金銭のやり取りは<b>当事者間で直接</b>行っていただきます。
        </Note>
      </Step>

      <Step n={3} title="メッセージを添えて応募する">
        なぜ応募したのか、何ができるのかを一言添えると採用されやすくなります。
        プロフィールの<b>資格・スキル</b>と<b>できること・自己PR</b>は依頼者から見えるので、
        先に埋めておくのがおすすめです。
        <Mock>
          {fakeInput('応募メッセージ', 'デザインサークルで2年間チラシを作っています。ポートフォリオをお送りできます。')}
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

      <Step n={5} title="マッチしたら連絡を取る">
        依頼者が承認するとマッチ成立です。トーク画面でやり取りを始めてください。
        <div style={{ marginTop: '0.75rem' }}>{fakeBtn('トークを開く', 'ghost', MessageCircle)}</div>
        <Note kind="warn">
          トークの内容は、トラブル対応のために運営が確認する場合があります。
        </Note>
      </Step>

      <Step n={6} title="終わったら感謝を送る" last>
        依頼者が完了報告をすると、お互いに感謝の言葉を送れるようになります。
        受け取った言葉はプロフィールに残り、次の依頼で信頼の材料になります。
      </Step>
    </>
  );
}

function ReviewTutorial() {
  return (
    <>
      <Step n={1} title="バッジで気づく">
        審査待ちのものがあると、ヘッダーの「管理」に赤いバッジが出ます。
        件数は<b>クエストの審査待ち＋所属団体の申請</b>の合計です。
        <Mock>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={14} style={{ color: 'var(--color-primary)' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)' }}>管理</span>
            <span style={{ minWidth: 16, height: 16, padding: '0 4px', borderRadius: 9999, background: '#dc2626', color: '#fff', fontSize: '0.625rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
          </div>
        </Mock>
        <Note kind="warn">
          <b>クエストは運営が承認するまで掲示板に出ません。</b>
          審査が止まると「投稿したのに何も起きない」状態になります。1日1回は確認してください。
        </Note>
      </Step>

      <Step n={2} title="「クエスト審査」タブでカードを開く">
        審査待ちが既定の表示です。カードをクリックすると内容が開きます。
        <Mock>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            {pill('審査中', '#d97706', '#fffbeb')}
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>業務委託</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '9999px', padding: '0.1875rem 0.625rem' }}>
              <Building2 size={11} />九州大学◯◯サークル
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', fontWeight: 700 }}>イベント告知用チラシのデザイン</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>掲示者: 山田太郎 / 申請日: 2026/09/17</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Users size={13} style={{ color: 'var(--color-primary)' }} />募集: 1人</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Tag size={13} style={{ color: 'var(--color-accent)' }} />5,000円</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Calendar size={13} style={{ color: 'var(--color-text-tertiary)' }} />2週間</span>
          </div>
        </Mock>
      </Step>

      <Step n={3} title="確認すること">
        <div style={{ ...S.mock, background: 'var(--bg-base)' }}>
          <ul style={{ margin: 0, paddingLeft: '1.125rem', fontSize: '0.8125rem', lineHeight: 2, color: 'var(--color-text-secondary)' }}>
            <li><b>申請団体</b> — 関連団体からの依頼か。「個人申請」のバッジが出ていたら要注意</li>
            <li><b>禁止事項</b> — レポート代行などの学業不正、マルチ商法・宗教勧誘、出会い目的、おとり募集</li>
            <li><b>報酬の妥当性</b> — 雇用契約なら最低賃金以上か。作業量に対して極端に安くないか</li>
            <li><b>条件の明示</b> — 作業内容・期限・支払い方法が読み取れるか</li>
            <li><b>学業への支障</b> — 深夜の拘束や過酷なスケジュールになっていないか</li>
            <li><b>研究協力</b> — 人を対象とする研究なら倫理委員会の承認に触れているか</li>
          </ul>
        </div>
        <Note kind="warn">
          試行段階では<b>関連団体に所属するユーザーからのクエストのみ受注</b>する方針です。
          「個人申請」のものは、原則リジェクトするか、所属を申請してもらってください。
        </Note>
      </Step>

      <Step n={4} title="承認する">
        ワンクリックで承認されます。掲示期間はこの時点から起算されます。
        <div style={{ marginTop: '0.75rem' }}>{fakeBtn('承認する', 'ok', CheckCircle2)}</div>
        <p style={{ marginTop: '0.625rem' }}>
          承認すると掲示板に載り、<b>掲示者に承認メールが届きます</b>。
          条件に合うユーザーには、翌日の1日1回のLINEダイジェストでお知らせが配信されます。
        </p>
      </Step>

      <Step n={5} title="リジェクトする">
        「リジェクト」を押すと理由の入力欄に切り替わります。<b>理由は必須</b>です。
        <Mock>
          {fakeInput('リジェクト理由 ※必須', '報酬が作業量に対して不明確なため、具体的な金額と支払い方法の記載をお願いします。')}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {fakeBtn('キャンセル', 'ghost')}
            {fakeBtn('リジェクト', 'ng', XCircle)}
          </div>
        </Mock>
        <Note kind="warn">
          <b>入力した理由は、そのまま掲示者へのメール本文に載ります。</b>
          「規約違反のため」だけだと直しようがないので、
          <b>どこを直せば通るのか</b>が分かるように書いてください。
        </Note>
      </Step>

      <Step n={6} title="所属団体の申請を審査する">
        「所属申請」タブに、ユーザーからの所属申請が届きます。
        メッセージ欄に本人確認の材料（学部・役職など）が書かれているので、
        団体の名簿や担当者に確認したうえで承認してください。
        <Mock>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            {pill('審査待ち', '#d97706', '#fffbeb')}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '9999px', padding: '0.1875rem 0.625rem' }}>
              <Building2 size={11} />九州大学◯◯サークル
            </span>
          </div>
          <p style={{ fontSize: '0.875rem', fontWeight: 700 }}>山田太郎</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>yamada@s.kyushu-u.ac.jp / 申請日: 2026/09/17</p>
          <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--bg-base)', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.625rem' }}>
            工学部3年、◯◯サークルで会計を担当しています。
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            {fakeBtn('承認する', 'ok', CheckCircle2)}
            {fakeBtn('却下', 'ng', XCircle)}
          </div>
        </Mock>
        <Note>
          一覧にない団体名での申請には「新規団体」のバッジが付きます。
          <b>承認すると、その団体が新しく登録されます</b>。名称に誤りがないか確認してください。
        </Note>
      </Step>

      <Step n={7} title="団体を登録・管理する" last>
        「団体管理」タブから、受注対象の団体を登録します。
        団体の行を開くと、表示名やメールアドレスでユーザーを検索して所属を付与できます。
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {fakeBtn('追加する', 'dark', Plus)}
          {fakeBtn('検索', 'ghost', Search)}
        </div>
        <Note kind="warn">
          団体をやめるときは<b>削除ではなく「無効にする」</b>を使ってください。
          無効にすると新しい依頼で選べなくなりますが、
          過去のクエストに残った団体名は消えません（審査の記録を保つため）。
        </Note>
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

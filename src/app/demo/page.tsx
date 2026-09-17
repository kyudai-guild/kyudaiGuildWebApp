'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Building2, Shield, Users, Scroll, CheckCircle2, MessageCircle, Heart,
  Mail, Send, RotateCcw, ArrowRight, Sparkles, Clock, Tag, Calendar,
} from 'lucide-react';

/* ============================================================
   関連団体向けのデモ（モックアップ）

   ⚠️ このページは意図的に**どこにも接続していない**。
      fetch も Supabase も使わず、状態はすべてこのファイル内にある。
      ログインなしで開けるので、団体の方にURLを送るだけで見てもらえる。

   目的は「依頼を出してから学生とつながるまで」を体験してもらうこと。
   読ませるのではなく、ボタンを押して進めてもらう作りにしている。
   ============================================================ */

const DEMO_ORG = '〇〇実行委員会';
const DEMO_QUEST = 'イベント告知チラシのデザイン';
const DEMO_STUDENT = 'はなこ';

const PAGE_STYLES = `
  .demo-shell { max-width: 900px; margin: 0 auto; padding: 0 clamp(1rem, 4vw, 2rem) 4rem; }
  .demo-head  { padding: clamp(1rem, 4vw, 1.5rem) clamp(1rem, 4vw, 2rem); }
  .demo-rail  { display: flex; gap: 0.375rem; overflow-x: auto; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
  .demo-split { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; align-items: start; }
  @media (max-width: 760px) {
    .demo-split { grid-template-columns: 1fr; gap: 1.25rem; }
  }
`;

type Actor = '団体' | '運営' | '学生';

type Step = {
  actor: Actor;
  title: string;
  lead: string;
  detail: React.ReactNode;
  action: string;
  mock: React.ReactNode;
  notice?: { icon: React.ElementType; text: string };
};

/* ── 見た目の部品 ───────────────────────────────── */

const card: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--color-border)',
  borderRadius: '1rem', boxShadow: 'var(--shadow-card)', padding: '1.25rem',
};

const ACTOR_STYLE: Record<Actor, { color: string; bg: string; Icon: React.ElementType }> = {
  団体: { color: 'var(--color-primary)', bg: 'var(--bg-secondary)', Icon: Building2 },
  運営: { color: '#d97706', bg: '#fffbeb', Icon: Shield },
  学生: { color: '#2563eb', bg: '#eff6ff', Icon: Users },
};

function ActorTag({ actor }: { actor: Actor }) {
  const s = ACTOR_STYLE[actor];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: '9999px', color: s.color, background: s.bg, whiteSpace: 'nowrap' }}>
      <s.Icon size={12} />{actor}の操作
    </span>
  );
}

const pill = (text: string, color: string, bg: string) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.6875rem', fontWeight: 700, padding: '0.1875rem 0.625rem', borderRadius: '9999px', color, background: bg, whiteSpace: 'nowrap' }}>{text}</span>
);

const orgBadge = (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)', borderRadius: '9999px', padding: '0.1875rem 0.625rem' }}>
    <Building2 size={11} />{DEMO_ORG}
  </span>
);

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: '0.625rem' }}>
      <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: '0.1875rem' }}>{label}</p>
      <div style={{ background: 'var(--bg-base)', border: '1px solid var(--color-border)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.8125rem', color: 'var(--color-text-primary)', lineHeight: 1.6 }}>{value}</div>
    </div>
  );
}

function MockFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>{label}</p>
      <div style={{ ...card, padding: '1rem' }}>{children}</div>
    </div>
  );
}

/* ── 各ステップの画面モック ─────────────────────── */

const MockOrgRegister = (
  <MockFrame label="運営の管理画面 — 団体管理">
    <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.625rem' }}>団体を追加</p>
    <Field label="団体名" value={DEMO_ORG} />
    <Field label="説明（任意）" value="学園祭の企画・運営" />
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, padding: '0.5rem 1.25rem', borderRadius: '9999px', background: 'var(--bg-dark)', color: 'var(--color-text-inverse)' }}>
      追加する
    </span>
    <div style={{ marginTop: '1rem', paddingTop: '0.875rem', borderTop: '1px solid var(--color-border)' }}>
      <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-tertiary)', marginBottom: '0.5rem' }}>登録済みの団体</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
        {orgBadge}
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', alignSelf: 'center' }}>所属 0人</span>
      </div>
    </div>
  </MockFrame>
);

const MockOrgRequest = (
  <MockFrame label="担当者のプロフィール — 所属団体">
    <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.625rem' }}>
      <Building2 size={13} style={{ color: 'var(--color-accent)' }} />所属団体
    </p>
    <Field label="団体" value={DEMO_ORG} />
    <Field label="運営へのメッセージ（必須）" value="工学部3年、〇〇実行委員会で広報を担当しています。" />

    <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-tertiary)', width: 68, flexShrink: 0 }}>承認前</span>
        <div style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: '#fffbeb', border: '1px solid #fde68a' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706' }}>{DEMO_ORG} — 審査待ち</p>
          <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: '0.125rem' }}>この間はまだ団体名義で依頼を出せません</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-text-tertiary)', width: 68, flexShrink: 0 }}>承認後</span>
        <div style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', background: 'var(--bg-base)', border: '1px solid var(--color-border)' }}>
          {orgBadge}
          <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>タグが付き、依頼を出すときに選べるようになります</p>
        </div>
      </div>
    </div>
  </MockFrame>
);

const MockForm = (
  <MockFrame label="依頼の申請フォーム">
    <Field label="申請元（所属団体）" value={DEMO_ORG} />
    <Field label="クエスト名" value={DEMO_QUEST} />
    <Field label="クエスト内容" value="11月の学園祭で配るA4チラシのデザインをお願いしたいです。写真と文面はこちらで用意します。" />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
      <Field label="募集人数" value="1人" />
      <Field label="報酬" value="5,000円" />
    </div>
  </MockFrame>
);

const MockReview = (
  <MockFrame label="運営の審査画面">
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
      {pill('審査中', '#d97706', '#fffbeb')}
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>業務委託</span>
      {orgBadge}
    </div>
    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{DEMO_QUEST}</p>
    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>掲示者: {DEMO_ORG} 担当者</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: '0.75rem 0' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Users size={13} style={{ color: 'var(--color-primary)' }} />募集: 1人</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Tag size={13} style={{ color: 'var(--color-accent)' }} />5,000円</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Calendar size={13} style={{ color: 'var(--color-text-tertiary)' }} />2週間</span>
    </div>
    <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
      <span style={{ flex: 1, textAlign: 'center', fontSize: '0.8125rem', fontWeight: 600, padding: '0.5rem', borderRadius: '0.625rem', background: '#ecfdf5', color: '#059669', border: '1px solid #bbf7d0' }}>承認する</span>
      <span style={{ flex: 1, textAlign: 'center', fontSize: '0.8125rem', fontWeight: 600, padding: '0.5rem', borderRadius: '0.625rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>リジェクト</span>
    </div>
  </MockFrame>
);

const MockBoard = (
  <MockFrame label="学生から見た掲示板">
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.625rem' }}>
      {pill('業務委託', '#d97706', '#fffbeb')}
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>0/1人</span>
    </div>
    <p style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '0.375rem' }}>{DEMO_QUEST}</p>
    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
      11月の学園祭で配るA4チラシのデザインを…
    </p>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '0.75rem', marginTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
      <div>
        <p style={{ fontSize: '0.625rem', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)' }}>依頼者</p>
        <div style={{ marginTop: '0.25rem' }}>{orgBadge}</div>
      </div>
      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-accent)' }}>5,000円</span>
    </div>
  </MockFrame>
);

const MockApply = (
  <MockFrame label="学生の応募">
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
      <div style={{ width: 40, height: 40, borderRadius: '9999px', flexShrink: 0, background: 'var(--bg-dark)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>は</div>
      <div>
        <p style={{ fontSize: '0.875rem', fontWeight: 700 }}>{DEMO_STUDENT}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>工学部3年</p>
      </div>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
      {['デザイン', 'Illustrator', '動画編集'].map(t => (
        <span key={t} style={{ fontSize: '0.75rem', fontWeight: 600, background: 'var(--bg-base)', border: '1px solid var(--color-border)', borderRadius: '9999px', padding: '0.1875rem 0.625rem' }}>{t}</span>
      ))}
    </div>
    <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--bg-base)', fontSize: '0.8125rem', lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
      デザインサークルで2年間チラシを作っています。過去の制作物をお送りできます。
    </div>
  </MockFrame>
);

const MockMatch = (
  <MockFrame label="応募者の確認とマッチング">
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <div style={{ width: 34, height: 34, borderRadius: '9999px', background: 'var(--bg-dark)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 800 }}>は</div>
        <div>
          <p style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{DEMO_STUDENT}</p>
          {pill('検討中', '#d97706', '#fffbeb')}
        </div>
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.375rem 0.875rem', borderRadius: '9999px', background: 'var(--bg-card)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>プロフィールを見る</span>
    </div>
    <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
      <span style={{ flex: 1, textAlign: 'center', fontSize: '0.8125rem', fontWeight: 600, padding: '0.5rem', borderRadius: '0.625rem', background: 'var(--bg-dark)', color: 'var(--color-text-inverse)' }}>承認する</span>
      <span style={{ flex: 1, textAlign: 'center', fontSize: '0.8125rem', fontWeight: 600, padding: '0.5rem', borderRadius: '0.625rem', background: 'var(--bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>見送る</span>
    </div>
  </MockFrame>
);

const MockTalk = (
  <MockFrame label="トーク画面">
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ alignSelf: 'flex-start', maxWidth: '85%', padding: '0.625rem 0.875rem', borderRadius: '0.875rem', background: 'var(--bg-base)', border: '1px solid var(--color-border)', fontSize: '0.8125rem', lineHeight: 1.7 }}>
        はじめまして。今回はよろしくお願いします。まず素材をお送りしますね。
      </div>
      <div style={{ alignSelf: 'flex-end', maxWidth: '85%', padding: '0.625rem 0.875rem', borderRadius: '0.875rem', background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', fontSize: '0.8125rem', lineHeight: 1.7 }}>
        ありがとうございます！今週中に初稿をお出しします。
      </div>
    </div>
    <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: '0.75rem', paddingTop: '0.625rem', borderTop: '1px solid var(--color-border)', lineHeight: 1.6 }}>
      ※ トラブル対応のため、運営が内容を確認する場合があります
    </p>
  </MockFrame>
);

const MockDone = (
  <MockFrame label="完了と感謝">
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
      {pill('完了', '#059669', '#ecfdf5')}
      <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{DEMO_QUEST}</span>
    </div>
    <div style={{ padding: '0.875rem', borderRadius: '0.625rem', background: '#fff7ed', border: '1px solid #fed7aa' }}>
      <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: 700, color: '#c2410c', marginBottom: '0.375rem' }}>
        <Heart size={12} />{DEMO_ORG} からの感謝
      </p>
      <p style={{ fontSize: '0.8125rem', lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
        こちらの意図をすぐに汲んでくださり、当日も大好評でした。またぜひお願いしたいです。
      </p>
    </div>
    <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: '0.75rem', lineHeight: 1.6 }}>
      受け取った言葉は学生のプロフィールに残り、次の依頼での判断材料になります
    </p>
  </MockFrame>
);

/* ── 流れの定義 ─────────────────────────────────── */

const STEPS: Step[] = [
  {
    actor: '運営',
    title: 'はじめに、団体を登録します',
    lead: 'まず運営が団体名を登録します。ここが最初の一歩です。',
    detail: <>この登録が済むまで、担当者の画面に<b>団体名は選択肢として出てきません</b>。団体の登録は運営が行いますので、ご利用の際は<b>まず運営までお声がけください</b>。</>,
    action: '団体を登録する',
    mock: MockOrgRegister,
    notice: { icon: Building2, text: '団体の登録は運営だけが行えます。担当者ご自身では登録できません' },
  },
  {
    actor: '団体',
    title: '担当者が所属を申請し、運営が承認する',
    lead: '承認されてはじめて、団体のタグが付きます。',
    detail: <>担当者はプロフィール画面から所属を申請します。運営が本人確認できるよう、<b>学部・学年・団体での役職</b>などをメッセージに書いていただきます。<br /><b>運営が承認するまで、所属団体のタグは付きません。</b>承認前に依頼を出すと団体名が表示されず、「個人からの申請」として扱われます。</>,
    action: '運営が承認する',
    mock: MockOrgRequest,
    notice: { icon: Shield, text: '申請が届くと運営に通知が飛びます。承認は運営の画面から行います' },
  },
  {
    actor: '団体',
    title: '団体として依頼を出す',
    lead: '所属団体を選んで、依頼内容を書くだけです。',
    detail: <>申請元の欄には、<b>承認済みの団体だけ</b>が選択肢として出てきます。選んだ団体名が掲示板と審査画面に表示されるので、学生からは「どの団体からの依頼か」がはっきり見えます。</>,
    action: '申請する',
    mock: MockForm,
  },
  {
    actor: '運営',
    title: '運営が内容を確認する',
    lead: '掲示板に出る前に、運営が必ず目を通します。',
    detail: <>報酬の妥当性、労働条件の明示、学業への影響などを確認します。問題があればリジェクトし、<b>理由をメールでお伝えします</b>ので、直して再申請できます。</>,
    action: '承認する',
    mock: MockReview,
    notice: { icon: Mail, text: '審査の結果は、承認・リジェクトどちらでも担当者にメールで届きます' },
  },
  {
    actor: '学生',
    title: '掲示板に載り、学生が見つける',
    lead: '承認されると掲示板に掲載されます。',
    detail: <>興味分野を登録している学生には、<b>条件に合う依頼がLINEで届きます</b>（1日1回のまとめ配信）。待っているだけで、関心のある学生に届きます。</>,
    action: '学生として見る',
    mock: MockBoard,
  },
  {
    actor: '学生',
    title: '学生が応募する',
    lead: '応募にはメッセージとプロフィールが付いてきます。',
    detail: <>資格・スキル・自己PR・これまでの実績が見られるので、<b>会う前に判断できます</b>。複数の応募から選ぶこともできます。</>,
    action: '団体の画面に戻る',
    mock: MockApply,
    notice: { icon: Mail, text: '応募があると、担当者にすぐメールで通知が届きます' },
  },
  {
    actor: '団体',
    title: '応募者を選んでマッチング成立',
    lead: '納得できる相手だけを承認します。',
    detail: <>承認するとマッチング成立です。見送る場合も、こちらから直接お断りの連絡をする必要はありません。</>,
    action: '承認してマッチング',
    mock: MockMatch,
  },
  {
    actor: '団体',
    title: 'サイト内で連絡を取り、完了する',
    lead: '個人の連絡先を交換しなくても進められます。',
    detail: <>やり取りはサイト内のトークで行います。終わったら完了報告をして、<b>お互いに感謝の言葉</b>を送れます。</>,
    action: '完了報告する',
    mock: MockTalk,
  },
  {
    actor: '団体',
    title: '完了。実績が残ります',
    lead: 'ここまでが一連の流れです。',
    detail: <>学生には実績と感謝の言葉が残り、次の依頼での判断材料になります。団体側も、過去にどの学生と組んだかが残ります。</>,
    action: 'もう一度見る',
    mock: MockDone,
  },
];

/* ── ページ本体 ───────────────────────────────── */

export default function DemoPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const next = () => setStep(s => (s === STEPS.length - 1 ? 0 : s + 1));

  return (
    <div style={{ minHeight: '100vh' }}>
      <style>{PAGE_STYLES}</style>

      {/* デモであることを最初に明示する */}
      <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a' }}>
        <div className="demo-head" style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 800, padding: '0.25rem 0.75rem', borderRadius: '9999px', background: '#d97706', color: '#fff' }}>
            <Sparkles size={11} />デモ
          </span>
          <p style={{ fontSize: '0.8125rem', color: '#92400e', lineHeight: 1.6 }}>
            これは流れを体験していただくためのサンプルです。実際のデータは使用していません。
          </p>
        </div>
      </div>

      {/* タイトル */}
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="demo-head" style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--bg-dark)' }}>
              <Scroll size={18} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                依頼から学生とつながるまで
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                関連団体のみなさま向け・{STEPS.length}ステップ
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="demo-shell" style={{ paddingTop: '1.5rem' }}>
        {/* 進捗 */}
        <div className="demo-rail">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <button key={i} onClick={() => setStep(i)}
                title={s.title}
                style={{
                  flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.375rem 0.75rem', borderRadius: '9999px', cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', transition: 'all 0.2s',
                  background: active ? 'var(--bg-dark)' : done ? 'var(--bg-secondary)' : 'var(--bg-card)',
                  color: active ? 'var(--color-text-inverse)' : done ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                  border: `1px solid ${active ? 'var(--bg-dark)' : 'var(--color-border)'}`,
                }}
              >
                {done ? <CheckCircle2 size={12} /> : <span>{i + 1}</span>}
                {active && <span>{s.title}</span>}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <div className="demo-split">
              {/* 説明 */}
              <div>
                <ActorTag actor={current.actor} />
                <h2 style={{ fontSize: '1.375rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', lineHeight: 1.5, margin: '0.75rem 0 0.5rem' }}>
                  {current.title}
                </h2>
                <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.75rem' }}>
                  {current.lead}
                </p>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.9, color: 'var(--color-text-secondary)' }}>
                  {current.detail}
                </p>

                {current.notice && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginTop: '1rem', background: 'var(--bg-base)', border: '1px solid var(--color-border)' }}>
                    <current.notice.icon size={14} style={{ marginTop: 3, flexShrink: 0, color: 'var(--color-accent)' }} />
                    <p style={{ fontSize: '0.8125rem', lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>{current.notice.text}</p>
                  </div>
                )}

                <button onClick={next}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', padding: '0.75rem 1.5rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', border: 'none', transition: 'background 0.2s, transform 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                >
                  {isLast ? <RotateCcw size={15} /> : <Send size={15} />}
                  {current.action}
                </button>
              </div>

              {/* 画面モック */}
              <div>{current.mock}</div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* まとめ（最後のステップでだけ出す） */}
        {isLast && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            style={{ ...card, marginTop: '2rem', padding: 'clamp(1.25rem, 4vw, 1.75rem)' }}>
            {/* 前提条件を最初に置く。ここを飛ばすと何も始まらないため */}
            <div style={{ padding: '1rem 1.25rem', borderRadius: '0.75rem', marginBottom: '1.5rem', background: '#fffbeb', border: '1px solid #fde68a' }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 700, color: '#92400e', marginBottom: '0.5rem' }}>
                <Building2 size={14} />はじめる前に：団体の登録が必要です
              </p>
              <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', lineHeight: 2, color: '#92400e' }}>
                <li><b>運営が団体を登録します</b>（担当者ご自身では登録できません）</li>
                <li>担当者がプロフィールから所属を申請します</li>
                <li><b>運営が承認してはじめて、所属団体のタグが付きます</b></li>
              </ol>
              <p style={{ fontSize: '0.8125rem', lineHeight: 1.8, color: '#92400e', marginTop: '0.625rem' }}>
                承認前に依頼を出すと団体名が表示されず、「個人からの申請」として扱われます。
                ご利用の際は、まず運営までお声がけください。
              </p>
            </div>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '1rem' }}>
              登録が済んだあと、団体側でやることは3つだけ
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { Icon: Send, t: '依頼を出す', d: 'フォームに書いて申請するだけ。掲載の可否は運営が判断します' },
                { Icon: CheckCircle2, t: '応募者を選ぶ', d: 'プロフィールと応募メッセージを見て、納得できる相手だけ承認します' },
                { Icon: MessageCircle, t: '連絡して完了報告', d: 'サイト内のトークでやり取りし、終わったら完了報告します' },
              ].map(({ Icon, t, d }) => (
                <div key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ width: 30, height: 30, borderRadius: '0.5rem', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', color: 'var(--color-primary)' }}>
                    <Icon size={14} />
                  </span>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{t}</p>
                    <p style={{ fontSize: '0.8125rem', lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>{d}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.875rem 1rem', borderRadius: '0.75rem', marginTop: '1.25rem', background: 'var(--bg-base)', border: '1px solid var(--color-border)' }}>
              <Clock size={14} style={{ marginTop: 3, flexShrink: 0, color: 'var(--color-accent)' }} />
              <p style={{ fontSize: '0.8125rem', lineHeight: 1.8, color: 'var(--color-text-secondary)' }}>
                現在は<b>試行期間</b>のため、関連団体に所属する方からの依頼のみをお受けしています。
                所属が承認されていない方からの依頼は、掲載を見送らせていただく場合があります。
              </p>
            </div>
          </motion.div>
        )}

        {/* 導線 */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '2rem', flexWrap: 'wrap' }}>
          <button onClick={() => setStep(0)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', background: 'var(--bg-card)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
          ><RotateCcw size={14} />最初から見る</button>
          <button onClick={() => router.push('/')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', background: 'var(--bg-card)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
          >九大ギルドについて<ArrowRight size={14} /></button>
        </div>
      </div>
    </div>
  );
}

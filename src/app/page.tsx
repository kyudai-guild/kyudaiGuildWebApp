'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGuild } from '@/contexts/GuildContext';
import MemberCard from '@/components/member/MemberCard';
import QuestBoard from '@/components/quest/QuestBoard';
import { Scroll, Clock, XCircle } from 'lucide-react';

function MyQuestsBanner() {
  const { isLoggedIn } = useGuild();
  const router = useRouter();
  const [counts, setCounts] = useState<{ pending: number; rejected: number } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetch('/api/my-quests')
      .then(r => r.ok ? r.json() : [])
      .then((quests: Array<{ status: string }>) => {
        const pending = quests.filter(q => q.status === 'pending').length;
        const rejected = quests.filter(q => q.status === 'rejected').length;
        if (pending > 0 || rejected > 0) setCounts({ pending, rejected });
      })
      .catch(() => {});
  }, [isLoggedIn]);

  if (!isLoggedIn || !counts || dismissed) return null;

  return (
    <div className="max-w-6xl mx-auto px-6 sm:px-8 pt-6">
      <div className="flex items-stretch gap-1">
        <button
          onClick={() => router.push('/my-quests')}
          className="flex-1 flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all hover:-translate-y-px"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
        >
          <Scroll size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>マイクエストの状況を確認</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {counts.pending > 0 && (
                <span className="inline-flex items-center gap-1 mr-3">
                  <Clock size={10} style={{ color: '#d97706' }} />審査中 {counts.pending}件
                </span>
              )}
              {counts.rejected > 0 && (
                <span className="inline-flex items-center gap-1" style={{ color: '#dc2626' }}>
                  <XCircle size={10} />リジェクト {counts.rejected}件
                </span>
              )}
            </p>
          </div>
          <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>詳細 →</span>
        </button>
        <button onClick={() => setDismissed(true)} aria-label="閉じる"
          className="px-3 rounded-lg text-sm transition-colors"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}
        >✕</button>
      </div>
    </div>
  );
}

function HeroSection() {
  const { quests } = useGuild();
  const approvedCount = quests.filter(q => q.status === 'approved').length;

  const stats = [
    { num: approvedCount.toString(), label: '公開中のクエスト' },
    { num: '6', label: 'カテゴリ' },
    { num: '九大', label: '学内限定' },
  ];

  return (
    <section
      style={{
        paddingTop: '5rem', paddingBottom: '5rem',
        background: 'radial-gradient(ellipse 80% 60% at 20% 100%, rgba(26,74,58,0.04), transparent), radial-gradient(ellipse 60% 40% at 80% 0%, rgba(200,149,108,0.06), transparent), var(--bg-base)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-10">
        <div className="animate-fade-in-up">
          <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Quest Board
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.25rem, 6vw, 3.5rem)', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.2, letterSpacing: '0.02em', marginBottom: '1.5rem' }}>
            キャンパスの<br />
            <span style={{ color: 'var(--color-primary)', position: 'relative', display: 'inline-block' }}>
              冒険
              <span style={{ position: 'absolute', bottom: 2, left: 0, right: 0, height: 3, background: 'var(--color-accent)', borderRadius: 999, opacity: 0.6 }} />
            </span>
            が始まる。
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.8, maxWidth: 480 }}>
            研究協力、業務委託、仲間探し ——<br />
            大学生活のあらゆる依頼が集まるクエスト掲示板
          </p>
        </div>

        <div className="flex gap-10 animate-fade-in-up delay-2 shrink-0">
          {stats.map(s => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {s.num}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <HeroSection />
      <MyQuestsBanner />

      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="w-full lg:w-[320px] flex-shrink-0">
            <MemberCard />
          </div>
          <div className="flex-1 min-w-0">
            <QuestBoard />
          </div>
        </div>
      </div>

      <footer className="mt-8 border-t" style={{ borderColor: 'var(--color-border)', background: 'var(--bg-card)' }}>
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-10">
          <div className="flex items-center gap-2 mb-3">
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: 'var(--bg-dark)', color: 'var(--color-accent)', fontSize: '0.875rem', fontWeight: 800, borderRadius: 'var(--radius-md)' }}>G</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>Guild</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
            大学生のための依頼掲示板。研究協力、業務委託、仲間探しなど。
          </p>
          <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <small style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>九大ギルド © 2024 — All Rights Reserved</small>
          </div>
        </div>
      </footer>
    </>
  );
}

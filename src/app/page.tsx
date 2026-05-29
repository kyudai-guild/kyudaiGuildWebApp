'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGuild } from '@/contexts/GuildContext';
import QuestBoard from '@/components/quest/QuestBoard';
import { Scroll, Clock, XCircle, Shield, LogIn, Edit2, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';

/* ============================================================
   MyQuestsBanner
   ============================================================ */
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
    <div className="flex items-stretch gap-1 mb-8">
      <button
        onClick={() => router.push('/my-quests')}
        className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all hover:-translate-y-px"
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
        className="px-3 rounded-xl text-sm"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}
      >✕</button>
    </div>
  );
}

/* ============================================================
   UserStatus — horizontal panel (replaces MemberCard)
   ============================================================ */
function UserStatus() {
  const { isLoggedIn, member, updateProfile } = useGuild();
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const initial = member.name ? member.name.charAt(0).toUpperCase() : '?';

  const saveEdit = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ display_name: newName.trim() }).eq('id', member.id);
      if (!error) { await updateProfile({ name: newName.trim() }); setEditing(false); }
    } finally { setSaving(false); }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-between gap-6 px-8 py-6 rounded-2xl mb-8"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-dark)' }}>
            <Shield size={24} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div>
            <h3 className="text-base font-bold mb-0.5" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
              ギルドに参加する
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              九大メールアドレスで登録すると、クエストへの応募や依頼の掲示ができます。
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push('/auth')}
          className="flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-full flex-shrink-0 transition-all hover:-translate-y-px"
          style={{ background: 'var(--bg-dark)', color: 'var(--color-text-inverse)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; }}
        >
          <LogIn size={14} />ログイン / 新規登録
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-6 px-8 py-6 rounded-2xl mb-8 animate-fade-in"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center gap-5 flex-1 min-w-0">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-extrabold"
          style={{ background: 'var(--bg-dark)', color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
        >{initial}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {editing ? (
              <div className="flex items-center gap-2">
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  className="text-base font-semibold px-3 py-1 rounded-lg outline-none"
                  style={{ border: '1px solid var(--color-primary)', color: 'var(--color-text-primary)', background: 'var(--bg-base)', boxShadow: '0 0 0 3px rgba(26,74,58,0.1)' }}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
                />
                <button onClick={saveEdit} disabled={saving} className="p-1.5 rounded-lg" style={{ color: '#16a34a' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f0fdf4'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                ><Check size={14} /></button>
                <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg" style={{ color: 'var(--color-text-tertiary)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                ><X size={14} /></button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold truncate" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '0.02em' }}>
                  {member.name || '名無しの冒険者'}
                </h3>
                <button onClick={() => { setNewName(member.name || ''); setEditing(true); }} className="p-1 rounded flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'; }}
                ><Edit2 size={12} /></button>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>九州大学</span>
            {member.role === 'admin' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: '#ecfdf5', color: '#059669' }}>
                <Shield size={10} />管理者
              </span>
            )}
            {member.joinDate && (
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                {new Date(member.joinDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' })}参加
              </span>
            )}
          </div>
        </div>
      </div>

      {member.tags && member.tags.length > 0 && (
        <div className="hidden md:flex flex-wrap gap-1.5 max-w-xs">
          {member.tags.slice(0, 4).map(tag => (
            <span key={tag} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ color: 'var(--color-text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)' }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Hero Section
   ============================================================ */
function HeroSection() {
  const { quests } = useGuild();
  const approvedCount = quests.filter(q => q.status === 'approved').length;

  return (
    <section style={{
      paddingTop: 'calc(var(--header-height) + 4rem)',
      paddingBottom: '4rem',
      background: 'radial-gradient(ellipse 80% 60% at 20% 100%, rgba(26,74,58,0.04), transparent), radial-gradient(ellipse 60% 40% at 80% 0%, rgba(200,149,108,0.06), transparent), var(--bg-base)',
      borderBottom: '1px solid var(--color-border)',
      marginTop: 'calc(-1 * var(--header-height))',
    }}>
      <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '0 2rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '3rem', flexWrap: 'wrap' }}>
        <div className="animate-fade-in-up">
          <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Quest Board
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 5vw, 3.5rem)', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.2, letterSpacing: '0.02em', marginBottom: '1.5rem' }}>
            キャンパスの<br />
            <span style={{ color: 'var(--color-primary)', position: 'relative', display: 'inline-block' }}>
              冒険
              <span style={{ position: 'absolute', bottom: 4, left: 0, right: 0, height: 3, background: 'var(--color-accent)', borderRadius: 999, opacity: 0.6 }} />
            </span>
            が始まる。
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.8, maxWidth: 440 }}>
            研究協力、業務委託、仲間探し ——<br className="hidden sm:block" />
            大学生活のあらゆる依頼が集まるクエスト掲示板
          </p>
        </div>

        <div className="flex gap-10 animate-fade-in-up delay-2">
          {[
            { num: String(approvedCount), label: '公開中のクエスト' },
            { num: '6', label: 'カテゴリ' },
            { num: '九大', label: '学内限定' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 2.5rem)', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
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

/* ============================================================
   Main Page — vertical stack matching reference layout
   ============================================================ */
export default function Home() {
  return (
    <>
      <HeroSection />

      <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '3rem 2rem' }}>
        <MyQuestsBanner />
        <UserStatus />
        <QuestBoard />
      </div>

      <footer style={{ borderTop: '1px solid var(--color-border)', background: 'var(--bg-card)', marginTop: '2rem' }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '3rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: 'var(--bg-dark)', color: 'var(--color-accent)', fontSize: '0.875rem', fontWeight: 800, borderRadius: 'var(--radius-md)', flexShrink: 0 }}>G</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>Guild</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.7, maxWidth: 320 }}>
            大学生のための依頼掲示板。<br />研究協力、業務委託、仲間探しなど。
          </p>
          <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
            <small style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>九大ギルド © 2024 — All Rights Reserved</small>
          </div>
        </div>
      </footer>
    </>
  );
}

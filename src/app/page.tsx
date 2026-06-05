'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGuild } from '@/contexts/GuildContext';
import QuestBoard from '@/components/quest/QuestBoard';
import UpcomingEvents from '@/components/events/UpcomingEvents';
import { Scroll, Clock, XCircle, Shield, LogIn, Edit2, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';

/* ============================================================
   Responsive styles (media queries — cannot use Tailwind sm:)
   ============================================================ */
const STYLES = `
  .page-content  { padding: 3rem 2rem; }
  .hero-section  { padding-top: calc(var(--header-height) + 4rem); padding-bottom: 4rem; }
  .hero-inner    { padding: 0 2rem; gap: 3rem; }
  .hero-stats    { display: flex; gap: 2.5rem; flex-shrink: 0; }

  /* UserStatus panel */
  .user-panel          { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; padding: 1.5rem 2rem; border-radius: 1rem; margin-bottom: 2rem; background: var(--bg-card); border: 1px solid var(--color-border); box-shadow: var(--shadow-card); }
  .user-panel-left     { display: flex; align-items: center; gap: 1.25rem; }
  .user-panel-cta      { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; font-weight: 600; padding: 0.75rem 1.5rem; border-radius: 9999px; flex-shrink: 0; background: var(--bg-dark); color: var(--color-text-inverse); cursor: pointer; transition: background 0.2s, transform 0.2s; border: none; }
  .user-panel-cta:hover { background: var(--bg-dark-hover); transform: translateY(-1px); }
  .user-tags-desktop   { display: flex; flex-wrap: wrap; gap: 0.375rem; max-width: 280px; }

  @media (max-width: 640px) {
    .page-content  { padding: 1.5rem 1rem; }
    .hero-section  { padding-top: calc(var(--header-height) + 2rem); padding-bottom: 2rem; }
    .hero-inner    { padding: 0 1rem; gap: 1.5rem; flex-direction: column; align-items: flex-start; }
    .hero-stats    { gap: 1.5rem; width: 100%; justify-content: flex-start; }

    /* Stack the login panel vertically on mobile */
    .user-panel      { flex-direction: column; align-items: flex-start; padding: 1.25rem; gap: 1rem; }
    .user-panel-left { gap: 0.875rem; align-items: flex-start; }
    .user-panel-cta  { width: 100%; justify-content: center; }
    .user-tags-desktop { display: none; }
  }
`;

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
    <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.25rem', marginBottom: '2rem' }}>
      <button
        onClick={() => router.push('/my-quests')}
        style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', textAlign: 'left', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)', cursor: 'pointer', transition: 'transform 0.2s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
      >
        <Scroll size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>マイクエストの状況を確認</p>
          <p style={{ fontSize: '0.75rem', marginTop: '0.125rem', color: 'var(--color-text-secondary)' }}>
            {counts.pending > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.75rem' }}>
                <Clock size={10} style={{ color: '#d97706' }} />審査中 {counts.pending}件
              </span>
            )}
            {counts.rejected > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#dc2626' }}>
                <XCircle size={10} />リジェクト {counts.rejected}件
              </span>
            )}
          </p>
        </div>
        <span style={{ fontSize: '0.75rem', flexShrink: 0, color: 'var(--color-text-tertiary)' }}>詳細 →</span>
      </button>
      <button onClick={() => setDismissed(true)} aria-label="閉じる"
        style={{ padding: '0 0.75rem', borderRadius: '0.75rem', fontSize: '0.875rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)', cursor: 'pointer' }}
      >✕</button>
    </div>
  );
}

/* ============================================================
   UserStatus — responsive horizontal panel
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

  const avatarStyle: React.CSSProperties = {
    width: 52, height: 52,
    borderRadius: '0.875rem',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    background: 'var(--bg-dark)',
  };

  if (!isLoggedIn) {
    return (
      <div className="user-panel">
        <div className="user-panel-left">
          <div style={avatarStyle}>
            <Shield size={22} style={{ color: 'var(--color-accent)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
              ギルドに参加する
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, maxWidth: 380 }}>
              九大メールアドレスで登録すると、クエストへの応募や依頼の掲示ができます。
            </p>
          </div>
        </div>
        <button className="user-panel-cta" onClick={() => router.push('/auth')}>
          <LogIn size={14} />ログイン / 新規登録
        </button>
      </div>
    );
  }

  return (
    <div className="user-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, minWidth: 0 }}>
        <div style={{ ...avatarStyle, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            {editing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  style={{ fontSize: '1rem', fontWeight: 600, padding: '0.25rem 0.75rem', borderRadius: '0.5rem', outline: 'none', border: '1px solid var(--color-primary)', color: 'var(--color-text-primary)', background: 'var(--bg-base)', boxShadow: '0 0 0 3px rgba(26,74,58,0.1)' }}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
                />
                <button onClick={saveEdit} disabled={saving} style={{ padding: '0.375rem', borderRadius: '0.5rem', color: '#16a34a', cursor: 'pointer', background: 'none', border: 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f0fdf4'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                ><Check size={14} /></button>
                <button onClick={() => setEditing(false)} style={{ padding: '0.375rem', borderRadius: '0.5rem', color: 'var(--color-text-tertiary)', cursor: 'pointer', background: 'none', border: 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                ><X size={14} /></button>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {member.name || '名無しの冒険者'}
                </h3>
                <button onClick={() => { setNewName(member.name || ''); setEditing(true); }}
                  style={{ padding: '0.25rem', borderRadius: '0.25rem', flexShrink: 0, color: 'var(--color-text-tertiary)', cursor: 'pointer', background: 'none', border: 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'; }}
                ><Edit2 size={12} /></button>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>九州大学</span>
            {member.role === 'admin' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, padding: '0.125rem 0.625rem', borderRadius: '9999px', background: '#ecfdf5', color: '#059669' }}>
                <Shield size={10} />管理者
              </span>
            )}
            {member.joinDate && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                {new Date(member.joinDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' })}参加
              </span>
            )}
          </div>
        </div>
      </div>
      {member.tags && member.tags.length > 0 && (
        <div className="user-tags-desktop">
          {member.tags.slice(0, 4).map(tag => (
            <span key={tag} style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', borderRadius: '9999px', fontWeight: 500, color: 'var(--color-text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)' }}>
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
    <section className="hero-section" style={{
      background: 'radial-gradient(ellipse 80% 60% at 20% 100%, rgba(26,74,58,0.04), transparent), radial-gradient(ellipse 60% 40% at 80% 0%, rgba(200,149,108,0.06), transparent), var(--bg-base)',
      borderBottom: '1px solid var(--color-border)',
      marginTop: 'calc(-1 * var(--header-height))',
    }}>
      <div className="hero-inner" style={{ maxWidth: 'var(--content-max)', margin: '0 auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div className="animate-fade-in-up">
          <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Quest Board
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 7vw, 3.5rem)', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.2, letterSpacing: '0.02em', marginBottom: '1.25rem' }}>
            キャンパスの<br />
            <span style={{ color: 'var(--color-primary)', position: 'relative', display: 'inline-block' }}>
              冒険
              <span style={{ position: 'absolute', bottom: 4, left: 0, right: 0, height: 3, background: 'var(--color-accent)', borderRadius: 999, opacity: 0.6 }} />
            </span>
            が始まる。
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', lineHeight: 1.8, maxWidth: 400 }}>
            研究協力、業務委託、仲間探し ——<br />
            大学生活のあらゆる依頼が集まるクエスト掲示板
          </p>
        </div>
        <div className="hero-stats animate-fade-in-up delay-2">
          {[
            { num: String(approvedCount), label: '公開中のクエスト' },
            { num: '6', label: 'カテゴリ' },
            { num: '九大', label: '学内限定' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.num}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 500, whiteSpace: 'nowrap' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Main Page
   ============================================================ */
export default function Home() {
  return (
    <>
      <style>{STYLES}</style>
      <HeroSection />
      <div className="page-content" style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
        <MyQuestsBanner />
        <UserStatus />
        <UpcomingEvents />
        <QuestBoard />
      </div>
      <footer style={{ borderTop: '1px solid var(--color-border)', background: 'var(--bg-card)', marginTop: '2rem' }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: 'var(--bg-dark)', color: 'var(--color-accent)', fontSize: '0.875rem', fontWeight: 800, borderRadius: '0.5rem', flexShrink: 0 }}>G</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>Guild</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
            大学生のための依頼掲示板。研究協力、業務委託、仲間探しなど。
          </p>
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
            <small style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>九大ギルド © 2024 — All Rights Reserved</small>
          </div>
        </div>
      </footer>
    </>
  );
}

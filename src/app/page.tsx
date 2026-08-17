'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { useGuild } from '@/contexts/GuildContext';
import QuestBoard from '@/components/quest/QuestBoard';
import EventDetailModal from '@/components/events/EventDetailModal';
import { GuildEvent, eventStyle, fmtTimeRange } from '@/components/events/types';
import { Scroll, Clock, XCircle, Shield, LogIn, Edit2, Check, X, CalendarDays, MapPin, ArrowRight, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase-client';

/* ============================================================
   Responsive styles
   ============================================================ */
const STYLES = `
  .page-content  { padding: 3rem 2rem; }
  .hero-section  { padding-top: calc(var(--header-height) + 4rem); padding-bottom: 4rem; }
  .hero-inner    { padding: 0 2rem; }

  /* Guest hero: catch copy + login CTA side by side */
  .guest-hero-inner { display: flex; align-items: center; justify-content: space-between; gap: 3rem; flex-wrap: wrap; }
  .guest-hero-copy  { flex: 1; min-width: 280px; }
  .guest-hero-cta   { flex-shrink: 0; width: 460px; max-width: 100%; }

  /* Logged-in events hero */
  .events-hero-inner { display: flex; flex-direction: column; gap: 1rem; }

  .user-panel          { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; padding: 1.5rem 2rem; border-radius: 1rem; margin-bottom: 2rem; background: var(--bg-card); border: 1px solid var(--color-border); box-shadow: var(--shadow-card); }
  .user-panel-left     { display: flex; align-items: center; gap: 1.25rem; }
  .user-tags-desktop   { display: flex; flex-wrap: wrap; gap: 0.375rem; max-width: 280px; }

  @media (max-width: 768px) {
    .guest-hero-inner { flex-direction: column; align-items: flex-start; gap: 2rem; }
    .guest-hero-cta { width: 100%; }
  }
  @media (max-width: 640px) {
    .page-content  { padding: 1.5rem 1rem; }
    .hero-section  { padding-top: calc(var(--header-height) + 2rem); padding-bottom: 2rem; }
    .hero-inner    { padding: 0 1rem; }
    .guest-hero-inner { gap: 1.75rem; }
    .user-panel      { flex-direction: column; align-items: flex-start; padding: 1.25rem; gap: 1rem; }
    .user-panel-left { gap: 0.875rem; align-items: flex-start; }
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
   UserStatus — shown only when logged in
   ============================================================ */
function UserStatus() {
  const { member, updateProfile } = useGuild();
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
    width: 52, height: 52, borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--bg-dark)',
  };

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
                <button onClick={saveEdit} disabled={saving} style={{ padding: '0.375rem', borderRadius: '0.5rem', color: '#16a34a', cursor: 'pointer', background: 'none', border: 'none' }}><Check size={14} /></button>
                <button onClick={() => setEditing(false)} style={{ padding: '0.375rem', borderRadius: '0.5rem', color: 'var(--color-text-tertiary)', cursor: 'pointer', background: 'none', border: 'none' }}><X size={14} /></button>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {member.name || '名無しの冒険者'}
                </h3>
                <button onClick={() => { setNewName(member.name || ''); setEditing(true); }}
                  style={{ padding: '0.25rem', borderRadius: '0.25rem', flexShrink: 0, color: 'var(--color-text-tertiary)', cursor: 'pointer', background: 'none', border: 'none' }}
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
   GuestHero — catch copy + big login CTA (not logged in)
   ============================================================ */
function GuestHero() {
  const router = useRouter();
  return (
    <section className="hero-section" style={{
      background: 'radial-gradient(ellipse 80% 60% at 20% 100%, rgba(26,74,58,0.05), transparent), radial-gradient(ellipse 60% 40% at 80% 0%, rgba(200,149,108,0.07), transparent), var(--bg-base)',
      borderBottom: '1px solid var(--color-border)',
      marginTop: 'calc(-1 * var(--header-height))',
    }}>
      <div className="hero-inner guest-hero-inner" style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
        {/* Catch copy */}
        <div className="guest-hero-copy animate-fade-in-up">
          <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Kyudai Guild
          </span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 7vw, 3.5rem)', fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.2, letterSpacing: '0.02em', marginBottom: '1.25rem' }}>
            キャンパスの<br />
            <span style={{ color: 'var(--color-primary)', position: 'relative', display: 'inline-block' }}>
              冒険
              <span style={{ position: 'absolute', bottom: 4, left: 0, right: 0, height: 3, background: 'var(--color-accent)', borderRadius: 999, opacity: 0.6 }} />
            </span>
            が始まる。
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', lineHeight: 1.8, maxWidth: 420 }}>
            研究協力、業務委託、仲間探し、イベント ——<br />
            九州大学生のあらゆる活動が集まるプラットフォーム
          </p>
        </div>

        {/* Big login CTA */}
        <div className="guest-hero-cta animate-fade-in-up delay-2">
          <div style={{ borderRadius: '1.25rem', padding: '2.5rem', background: 'var(--bg-dark)', boxShadow: '0 12px 40px rgba(12,59,46,0.25)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-inverse)', fontFamily: 'var(--font-display)', marginBottom: '0.75rem' }}>
              ギルドに参加しよう
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'rgba(234,232,227,0.7)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              九大メールアドレスで登録すると、クエストへの応募・依頼の掲示・イベントの閲覧ができます。
            </p>
            <button onClick={() => router.push('/auth')}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', borderRadius: '0.75rem', fontSize: '0.9375rem', fontWeight: 700, background: 'var(--color-accent)', color: '#1f140f', cursor: 'pointer', border: 'none', transition: 'filter 0.2s, transform 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.08)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              <LogIn size={16} />ログイン / 新規登録
            </button>
            <p style={{ fontSize: '0.6875rem', color: 'rgba(234,232,227,0.5)', textAlign: 'center', marginTop: '0.875rem' }}>
              ※九州大学関係者のみ利用可能です
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   EventsHero — upcoming events list (logged in)
   ============================================================ */
function EventsHero() {
  const router = useRouter();
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GuildEvent | null>(null);

  useEffect(() => {
    fetch('/api/events?upcoming=5')
      .then(r => r.ok ? r.json() : [])
      .then(setEvents)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="hero-section" style={{
      background: 'radial-gradient(ellipse 80% 60% at 20% 100%, rgba(26,74,58,0.04), transparent), var(--bg-base)',
      borderBottom: '1px solid var(--color-border)',
      marginTop: 'calc(-1 * var(--header-height))',
    }}>
      <div className="hero-inner events-hero-inner" style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem' }}>
          <div className="animate-fade-in-up">
            <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
              Upcoming Events
            </span>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '0.02em' }}>
              近日開催のイベント
            </h1>
          </div>
          <button onClick={() => router.push('/events')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-primary)', cursor: 'pointer', background: 'none', border: 'none', flexShrink: 0, transition: 'gap 0.2s', whiteSpace: 'nowrap' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.gap = '0.625rem'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.gap = '0.375rem'; }}
          >カレンダーを見る<ArrowRight size={14} /></button>
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
            <div style={{ width: 28, height: 28, border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '9999px', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', borderRadius: '1rem', background: 'var(--bg-card)', border: '1px dashed var(--color-border-strong)' }}>
            <CalendarDays size={28} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>予定されているイベントはありません。</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {events.map(ev => {
              const c = eventStyle(ev);
              const d = new Date(ev.event_date);
              return (
                <button key={ev.id} onClick={() => setSelected(ev)}
                  style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', borderRadius: '0.875rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'box-shadow 0.2s, transform 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card-hover)'; (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)'; (e.currentTarget as HTMLElement).style.transform = 'translateX(0)'; }}
                >
                  {/* Date badge */}
                  <div style={{ width: 48, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.375rem', borderRadius: '0.625rem', background: 'var(--bg-base)', border: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>{d.toLocaleDateString('ja-JP', { month: 'short' })}</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1 }}>{d.getDate()}</span>
                    <span style={{ fontSize: '0.625rem', color: 'var(--color-text-tertiary)' }}>{d.toLocaleDateString('ja-JP', { weekday: 'short' })}</span>
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '9999px', background: c.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        <Clock size={11} style={{ color: 'var(--color-text-tertiary)' }} />{fmtTimeRange(ev)}
                      </span>
                      {ev.location && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <MapPin size={11} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />{ev.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && <EventDetailModal event={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </section>
  );
}

/* ============================================================
   LockedBoardNotice — shown instead of the board when logged out
   ============================================================ */
function LockedBoardNotice() {
  const router = useRouter();
  return (
    <div id="quest-board" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', borderRadius: '1rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ width: 52, height: 52, margin: '0 auto 1rem', borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)' }}>
        <Lock size={22} style={{ color: 'var(--color-text-tertiary)' }} />
      </div>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', marginBottom: '0.5rem' }}>
        クエスト掲示板はログインが必要です
      </h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
        依頼の内容には個人の連絡先が含まれることがあるため、<br />
        九州大学の在学生・関係者のみが閲覧できます。
      </p>
      <button onClick={() => router.push('/auth')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.75rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 700, background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', cursor: 'pointer', border: 'none', transition: 'background 0.2s' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; }}
      >
        <LogIn size={15} />ログイン / 新規登録
      </button>
    </div>
  );
}

/* ============================================================
   Main Page
   ============================================================ */
export default function Home() {
  const { isLoggedIn } = useGuild();

  return (
    <>
      <style>{STYLES}</style>

      {isLoggedIn ? <EventsHero /> : <GuestHero />}

      <div className="page-content" style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
        {isLoggedIn ? (
          <>
            <MyQuestsBanner />
            <UserStatus />
            <QuestBoard />
          </>
        ) : (
          <LockedBoardNotice />
        )}
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

'use client';
import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CalendarDays, Plus } from 'lucide-react';
import { useGuild } from '@/contexts/GuildContext';
import EventCalendar from '@/components/events/EventCalendar';
import CreateEventModal from '@/components/events/CreateEventModal';
import { GuildEvent } from '@/components/events/types';
import { readCache, writeCache } from '@/lib/client-cache';

const EVENTS_CACHE = 'events-all';
const EVENTS_CACHE_MAX_AGE = 5 * 60 * 1000;

const PAGE_STYLES = `
  .events-header { padding: 1.5rem 2rem; }
  .events-content { max-width: 1100px; margin: 0 auto; padding: 2rem; }
  /* 骨組みだけ先に出すための枠。本物のカレンダーと同じ寸法にしてある */
  .sk-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
  .sk-cell { min-height: 90px; border-right: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); padding: 0.375rem; }
  .sk-cell:nth-child(7n) { border-right: none; }
  .sk-bar { border-radius: 4px; background: var(--color-border); opacity: 0.55; animation: sk-pulse 1.4s ease-in-out infinite; }
  @keyframes sk-pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.7; } }
  @media (max-width: 640px) {
    .events-header { padding: 1.25rem 1rem; }
    .events-content { padding: 1.25rem 1rem; }
    .sk-cell { min-height: 56px; padding: 0.25rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sk-bar { animation: none; }
  }
`;

/**
 * 読み込み中に出す骨組み。
 * スピナーだと「何も無い時間」に見えるが、枠が先に出ていると
 * 待ち時間が同じでも体感は短くなる。本物のカレンダーと同じ寸法にして、
 * データが届いたときに要素が飛ばないようにしている。
 */
function CalendarSkeleton() {
  return (
    <div aria-busy="true" aria-label="読み込み中">
      {/* ツールバーの位置合わせ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
        <div className="sk-bar" style={{ width: 160, height: 28 }} />
        <div className="sk-bar" style={{ width: 180, height: 28 }} />
      </div>
      <div style={{ borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }}>
        <div className="sk-grid" style={{ borderBottom: '1px solid var(--color-border)' }}>
          {['月', '火', '水', '木', '金', '土', '日'].map((w, i) => (
            <div key={w} style={{
              padding: '0.5rem 0.375rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700,
              color: i === 5 ? '#2563eb' : i === 6 ? '#dc2626' : 'var(--color-text-secondary)',
              borderRight: i < 6 ? '1px solid var(--color-border)' : 'none',
            }}>{w}</div>
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, wi) => (
          <div key={wi} className="sk-grid">
            {Array.from({ length: 7 }).map((__, ci) => (
              <div key={ci} className="sk-cell">
                <div className="sk-bar" style={{ width: 16, height: 10, marginBottom: 6 }} />
                {/* まばらに帯を置いて、実際のカレンダーらしい見た目にする */}
                {(wi + ci) % 4 === 0 && <div className="sk-bar" style={{ height: 12, marginBottom: 3 }} />}
                {(wi + ci) % 7 === 0 && <div className="sk-bar" style={{ height: 12, width: '70%' }} />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EventsPage() {
  const { isAdmin, isLoggedIn } = useGuild();
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // 再取得のたびに骨組みへ戻すと画面がちらつくので、
  // すでに何か出ているときは表示を保ったまま裏で差し替える。
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
        writeCache(EVENTS_CACHE, null, data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // キャッシュがあれば先に描く。再取得は必ず走らせて差し替えるので、
    // 表示は最終的に必ずサーバーと一致する（stale-while-revalidate）。
    // 読み出しを effect 内に置くのは、ハイドレーションのズレを避けるため。
    const cached = readCache<GuildEvent[]>(EVENTS_CACHE, null, EVENTS_CACHE_MAX_AGE);
    if (cached) { setEvents(cached); setLoading(false); }
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div style={{ minHeight: '100vh' }}>
      <style>{PAGE_STYLES}</style>

      {/* Page Header */}
      <div className="events-header" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--color-border)', marginBottom: '0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--bg-dark)' }}>
              <CalendarDays size={18} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                イベントカレンダー
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>団体の予定・開催イベント一覧</p>
            </div>
          </div>

          {isAdmin && (
            <button onClick={() => setModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 600, padding: '0.625rem 1.25rem', borderRadius: '9999px', background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', cursor: 'pointer', transition: 'background 0.2s, transform 0.2s', border: 'none', flexShrink: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              <Plus size={14} />イベントを登録
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="events-content">
        {loading ? (
          <CalendarSkeleton />
        ) : (
          <EventCalendar events={events} isAdmin={isAdmin} onRefresh={fetchEvents} />
        )}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <CreateEventModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onCreated={fetchEvents}
          />
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

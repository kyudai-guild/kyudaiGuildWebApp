'use client';
import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CalendarDays, Plus } from 'lucide-react';
import { useGuild } from '@/contexts/GuildContext';
import EventCalendar from '@/components/events/EventCalendar';
import CreateEventModal from '@/components/events/CreateEventModal';
import { GuildEvent } from '@/components/events/types';
import { readCache, writeCache } from '@/lib/client-cache';
import { CalendarSkeleton, SKELETON_STYLES } from '@/components/ui/Skeleton';

const EVENTS_CACHE = 'events-all';
const EVENTS_CACHE_MAX_AGE = 5 * 60 * 1000;

const PAGE_STYLES = `
  .events-header { padding: 1.5rem 2rem; }
  .events-content { max-width: 1100px; margin: 0 auto; padding: 2rem; }
  @media (max-width: 640px) {
    .events-header { padding: 1.25rem 1rem; }
    .events-content { padding: 1.25rem 1rem; }
  }
` + SKELETON_STYLES;

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

    </div>
  );
}

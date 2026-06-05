'use client';
import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CalendarDays, Plus } from 'lucide-react';
import { useGuild } from '@/contexts/GuildContext';
import EventCalendar from '@/components/events/EventCalendar';
import CreateEventModal from '@/components/events/CreateEventModal';
import { GuildEvent } from '@/components/events/types';

const PAGE_STYLES = `
  .events-header { padding: 1.5rem 2rem; }
  .events-content { max-width: 1100px; margin: 0 auto; padding: 2rem; }
  @media (max-width: 640px) {
    .events-header { padding: 1.25rem 1rem; }
    .events-content { padding: 1.25rem 1rem; }
  }
`;

export default function EventsPage() {
  const { isAdmin, isLoggedIn } = useGuild();
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events');
      if (res.ok) setEvents(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

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
          <div style={{ textAlign: 'center', padding: '4rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 32, height: 32, border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '9999px', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>読み込み中...</p>
          </div>
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

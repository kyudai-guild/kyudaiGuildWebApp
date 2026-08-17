'use client';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CalendarDays, MapPin, Clock, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { GuildEvent, eventStyle, fmtTimeRange } from './types';
import EventDetailModal from './EventDetailModal';

const STYLES = `
  .upcoming-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  @media (max-width: 768px) { .upcoming-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 480px) { .upcoming-grid { grid-template-columns: 1fr; } }
`;

export default function UpcomingEvents() {
  const router = useRouter();
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [selected, setSelected] = useState<GuildEvent | null>(null);

  useEffect(() => {
    fetch('/api/events?upcoming=3')
      .then(r => r.ok ? r.json() : [])
      .then(setEvents)
      .catch(() => {});
  }, []);

  if (events.length === 0) return null;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <style>{STYLES}</style>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1rem', gap: '1rem' }}>
        <div>
          <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Upcoming Events
          </span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            近日開催のイベント
          </h2>
        </div>
        <button onClick={() => router.push('/events')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-primary)', cursor: 'pointer', background: 'none', border: 'none', flexShrink: 0, transition: 'gap 0.2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.gap = '0.625rem'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.gap = '0.375rem'; }}
        >すべて見る<ArrowRight size={14} /></button>
      </div>

      {/* Event cards */}
      <div className="upcoming-grid">
        {events.map((ev, i) => {
          const c = eventStyle(ev);
          const d = new Date(ev.event_date);
          return (
            <button key={ev.id} onClick={() => setSelected(ev)}
              style={{ display: 'flex', flexDirection: 'column', gap: '0', padding: 0, borderRadius: '1rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)', cursor: 'pointer', textAlign: 'left', overflow: 'hidden', transition: 'box-shadow 0.2s, transform 0.2s', width: '100%' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card-hover)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              {/* Color top bar */}
              <div style={{ height: 4, background: c.color }} />
              <div style={{ padding: '1rem' }}>
                {/* Date badge + category */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44, padding: '0.25rem', borderRadius: '0.5rem', background: 'var(--bg-base)', border: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>{d.toLocaleDateString('ja-JP', { month: 'short' })}</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1 }}>{d.getDate()}</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)' }}>{d.toLocaleDateString('ja-JP', { weekday: 'short' })}</span>
                  </div>
                  {ev.tags?.[0] && <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '9999px', color: c.color, background: c.bg }}>#{ev.tags[0]}</span>}
                </div>

                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.4, marginBottom: '0.625rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {ev.title}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    <Clock size={11} style={{ color: 'var(--color-text-tertiary)' }} />
                    {fmtTimeRange(ev)}
                  </span>
                  {ev.location && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <MapPin size={11} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                      {ev.location}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected && <EventDetailModal event={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}

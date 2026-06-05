'use client';
import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight as ChevronRight, List, Calendar, MapPin, Clock } from 'lucide-react';
import { GuildEvent, CATEGORY_COLORS, CATEGORIES, fmtTime } from './types';
import EventDetailModal from './EventDetailModal';

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];
const STYLES = `
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
  .cal-day-cell { min-height: 90px; padding: 0.375rem; border-right: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); }
  .cal-day-cell:nth-child(7n) { border-right: none; }
  .cal-event-pill { display: block; width: 100%; text-align: left; font-size: 0.6875rem; font-weight: 600; padding: 0.125rem 0.375rem; border-radius: 0.25rem; margin-bottom: 0.125rem; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border: none; transition: opacity 0.15s; }
  .cal-event-pill:hover { opacity: 0.8; }
  @media (max-width: 640px) {
    .cal-day-cell { min-height: 56px; padding: 0.25rem; }
    .cal-event-pill { font-size: 0; width: 8px; height: 8px; border-radius: 9999px; padding: 0; display: inline-block; margin: 0 1px; }
    .event-list-card { padding: 0.875rem 1rem; }
  }
`;

interface Props {
  events: GuildEvent[];
  onRefresh?: () => void;
  isAdmin?: boolean;
}

export default function EventCalendar({ events, isAdmin }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [catFilter, setCatFilter] = useState('すべて');
  const [selectedEvent, setSelectedEvent] = useState<GuildEvent | null>(null);

  // Navigation
  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else { setMonth(m => m - 1); } };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else { setMonth(m => m + 1); } };

  // Filter events for current month
  const filtered = useMemo(() => {
    return events.filter(e => {
      const d = new Date(e.event_date);
      const matchMonth = viewMode === 'calendar'
        ? (d.getFullYear() === year && d.getMonth() === month)
        : true;
      const matchCat = catFilter === 'すべて' || e.category === catFilter;
      return matchMonth && matchCat;
    });
  }, [events, year, month, catFilter, viewMode]);

  // Build calendar grid (42 cells = 6 weeks)
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    // 月曜始まり: 0=Mon,...,6=Sun
    const startDow = (firstDay.getDay() + 6) % 7; // convert Sun=0 to Mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = Array(startDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  // Map day → events
  const eventsByDay = useMemo(() => {
    const map: Record<number, GuildEvent[]> = {};
    filtered.forEach(e => {
      const d = new Date(e.event_date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(e);
      }
    });
    return map;
  }, [filtered, year, month]);

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  // ───── Render ─────
  return (
    <div>
      <style>{STYLES}</style>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={prevMonth} style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.5rem', border: '1px solid var(--color-border)', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; }}
          ><ChevronLeft size={16} /></button>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)', minWidth: 120, textAlign: 'center' }}>
            {year}年{month + 1}月
          </h2>
          <button onClick={nextMonth} style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.5rem', border: '1px solid var(--color-border)', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; }}
          ><ChevronRight size={16} /></button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}
            style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid var(--color-border)', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
          >今月</button>
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: '0.625rem', overflow: 'hidden' }}>
          {(['calendar', 'list'] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: viewMode === mode ? 'var(--bg-dark)' : 'var(--bg-card)',
                color: viewMode === mode ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
              }}
            >
              {mode === 'calendar' ? <><Calendar size={13} />カレンダー</> : <><List size={13} />リスト</>}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1.25rem' }}>
        {['すべて', ...CATEGORIES].map(cat => {
          const active = catFilter === cat;
          const style = cat !== 'すべて' ? CATEGORY_COLORS[cat] : null;
          return (
            <button key={cat} onClick={() => setCatFilter(cat)}
              style={{ padding: '0.25rem 0.875rem', fontSize: '0.8125rem', fontWeight: 500, borderRadius: '9999px', border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                background: active ? (style ? style.bg : 'var(--bg-dark)') : 'var(--bg-card)',
                color: active ? (style ? style.color : 'var(--color-text-inverse)') : 'var(--color-text-secondary)',
                borderColor: active ? (style ? style.color : 'var(--bg-dark)') : 'var(--color-border)',
              }}
            >{cat}</button>
          );
        })}
      </div>

      {/* ── CALENDAR GRID ── */}
      {viewMode === 'calendar' && (
        <div style={{ borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--bg-card)' }}>
          {/* Day headers */}
          <div className="cal-grid" style={{ borderBottom: '1px solid var(--color-border)' }}>
            {WEEKDAYS.map((w, i) => (
              <div key={w} style={{
                padding: '0.5rem 0.375rem', textAlign: 'center',
                fontSize: '0.75rem', fontWeight: 700,
                color: i === 5 ? '#2563eb' : i === 6 ? '#dc2626' : 'var(--color-text-secondary)',
                borderRight: i < 6 ? '1px solid var(--color-border)' : 'none',
              }}>{w}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="cal-grid">
            {calendarDays.map((day, idx) => {
              const dow = idx % 7; // 0=Mon
              const dayEvents = day ? (eventsByDay[day] ?? []) : [];
              return (
                <div key={idx} className="cal-day-cell" style={{
                  background: day && isToday(day) ? 'rgba(26,74,58,0.04)' : 'transparent',
                }}>
                  {day && (
                    <>
                      <div style={{
                        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '9999px', marginBottom: '0.25rem',
                        fontSize: '0.75rem', fontWeight: isToday(day) ? 800 : 500,
                        background: isToday(day) ? 'var(--color-primary)' : 'transparent',
                        color: isToday(day) ? 'var(--color-text-inverse)' : (dow === 5 ? '#2563eb' : dow === 6 ? '#dc2626' : 'var(--color-text-primary)'),
                      }}>{day}</div>
                      {dayEvents.map(ev => {
                        const c = CATEGORY_COLORS[ev.category] ?? CATEGORY_COLORS['その他'];
                        return (
                          <button key={ev.id} className="cal-event-pill"
                            style={{ background: c.bg, color: c.color }}
                            onClick={() => setSelectedEvent(ev)}
                          >{ev.title}</button>
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', borderRadius: '1rem', border: '1px dashed var(--color-border)' }}>
              <Calendar size={32} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>この期間のイベントはありません。</p>
            </div>
          ) : (
            (() => {
              // Group by month
              const groups: Record<string, GuildEvent[]> = {};
              filtered
                .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
                .forEach(ev => {
                  const d = new Date(ev.event_date);
                  const key = `${d.getFullYear()}年${d.getMonth() + 1}月`;
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(ev);
                });
              return Object.entries(groups).map(([label, evs]) => (
                <div key={label} style={{ marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                    {label}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {evs.map(ev => {
                      const c = CATEGORY_COLORS[ev.category] ?? CATEGORY_COLORS['その他'];
                      const d = new Date(ev.event_date);
                      return (
                        <button key={ev.id} className="event-list-card" onClick={() => setSelectedEvent(ev)}
                          style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', borderRadius: '0.875rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)', cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.2s, transform 0.2s', width: '100%' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card-hover)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-card)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                        >
                          {/* Date badge */}
                          <div style={{ width: 48, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.375rem', borderRadius: '0.625rem', background: 'var(--bg-base)', border: '1px solid var(--color-border)' }}>
                            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                              {d.toLocaleDateString('ja-JP', { month: 'short' })}
                            </span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', lineHeight: 1 }}>{d.getDate()}</span>
                            <span style={{ fontSize: '0.625rem', color: 'var(--color-text-tertiary)' }}>
                              {d.toLocaleDateString('ja-JP', { weekday: 'short' })}
                            </span>
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: '9999px', color: c.color, background: c.bg }}>{ev.category}</span>
                              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{ev.title}</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                <Clock size={11} />{fmtTime(ev.event_date)}{ev.event_end_date && ` 〜 ${fmtTime(ev.event_end_date)}`}
                              </span>
                              {ev.location && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                  <MapPin size={11} />{ev.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight size={14} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ));
            })()
          )}
        </div>
      )}

      <AnimatePresence>
        {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      </AnimatePresence>
    </div>
  );
}

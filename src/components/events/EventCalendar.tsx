'use client';
import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight as ChevronRight, List, Calendar, MapPin, Clock } from 'lucide-react';
import { GuildEvent, eventStyle, fmtTimeRange } from './types';
import EventDetailModal from './EventDetailModal';

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];
const STYLES = `
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
  .cal-week { position: relative; --cal-bar-top: 32px; --cal-lane-h: 22px; --cal-bar-h: 20px; --cal-min: 90px; }
  .cal-day-cell { padding: 0.375rem; border-right: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); }
  .cal-day-cell:nth-child(7n) { border-right: none; }
  /* 連続する予定は週単位で1本のバーとして表示する（レーン割り当ては JS 側） */
  .cal-event-bar { position: absolute; text-align: left; font-size: 0.6875rem; font-weight: 600; height: var(--cal-bar-h); line-height: var(--cal-bar-h); padding: 0 6px; border: none; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: opacity 0.15s; }
  .cal-event-bar:hover { opacity: 0.8; }
  @media (max-width: 640px) {
    .cal-week { --cal-bar-top: 26px; --cal-lane-h: 12px; --cal-bar-h: 10px; --cal-min: 56px; }
    .cal-day-cell { padding: 0.25rem; }
    .cal-event-bar { font-size: 0; padding: 0; }
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
  const [showPast, setShowPast] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GuildEvent | null>(null);

  // リストは全期間が対象。既定では終了済みを隠し、必要なときだけ過去も出す
  const listEvents = useMemo(() => {
    if (showPast) return events;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return events.filter(e => new Date(e.event_end_date ?? e.event_date) >= startOfToday);
  }, [events, showPast]);

  // Navigation
  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else { setMonth(m => m - 1); } };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else { setMonth(m => m + 1); } };

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

  // 週ごとに分割
  const weeks = useMemo(() => {
    const w: (number | null)[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) w.push(calendarDays.slice(i, i + 7));
    return w;
  }, [calendarDays]);

  /**
   * 週ごとのイベント帯。
   * 複数日の予定は、その週で覆う列範囲（startCol〜endCol）を1本のバーとして描く。
   * 同じ週に重なる予定同士は「レーン」（縦の段）を割り当ててぶつからないようにする。
   */
  type Segment = { ev: GuildEvent; startCol: number; endCol: number; isStart: boolean; isEnd: boolean; lane: number };
  const weekSegments: Segment[][] = useMemo(() => {
    return weeks.map(week => {
      const raw: Omit<Segment, 'lane'>[] = [];
      events.forEach(ev => {
        const s = new Date(ev.event_date);
        s.setHours(0, 0, 0, 0);
        const rawEnd = new Date(ev.event_end_date ?? ev.event_date);
        rawEnd.setHours(0, 0, 0, 0);
        const e = rawEnd < s ? s : rawEnd; // 不正な範囲は開始日のみ扱い
        let startCol = -1;
        let endCol = -1;
        let isStart = false;
        let isEnd = false;
        week.forEach((day, col) => {
          if (!day) return;
          const d = new Date(year, month, day);
          if (d >= s && d <= e) {
            if (startCol === -1) startCol = col;
            endCol = col;
            if (d.getTime() === s.getTime()) isStart = true;
            if (d.getTime() === e.getTime()) isEnd = true;
          }
        });
        if (startCol !== -1) raw.push({ ev, startCol, endCol, isStart, isEnd });
      });
      // 左から・長い順に詰めると、複数日の帯が上の段にまとまって見やすい
      raw.sort((a, b) =>
        a.startCol - b.startCol
        || (b.endCol - b.startCol) - (a.endCol - a.startCol)
        || new Date(a.ev.event_date).getTime() - new Date(b.ev.event_date).getTime()
      );
      const laneEnds: number[] = []; // レーンごとの「最後に使った列」
      return raw.map(sg => {
        let lane = laneEnds.findIndex(end => end < sg.startCol);
        if (lane === -1) { lane = laneEnds.length; laneEnds.push(sg.endCol); }
        else { laneEnds[lane] = sg.endCol; }
        return { ...sg, lane };
      });
    });
  }, [weeks, events, year, month]);

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  // ───── Render ─────
  return (
    <div>
      <style>{STYLES}</style>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {/* Month navigation（リスト表示は全期間を並べるので月移動を出さない） */}
        {viewMode === 'calendar' ? (
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
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.625rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {showPast ? 'すべての予定' : 'これからの予定'}
            </h2>
            <button onClick={() => setShowPast(v => !v)}
              style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid var(--color-border)', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
            >{showPast ? 'これから以降のみ' : '過去も表示'}</button>
          </div>
        )}

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

          {/* Day cells（週単位でラップし、イベント帯を重ねて描く） */}
          {weeks.map((week, wi) => {
            const segs = weekSegments[wi];
            const laneCount = segs.reduce((m, s) => Math.max(m, s.lane + 1), 0);
            const minH = `max(var(--cal-min), calc(var(--cal-bar-top) + ${laneCount} * var(--cal-lane-h) + 6px))`;
            return (
              <div key={wi} className="cal-week">
                <div className="cal-grid">
                  {week.map((day, ci) => (
                    <div key={ci} className="cal-day-cell" style={{
                      minHeight: minH,
                      background: day && isToday(day) ? 'rgba(26,74,58,0.04)' : 'transparent',
                    }}>
                      {day && (
                        <div style={{
                          width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: '9999px',
                          fontSize: '0.75rem', fontWeight: isToday(day) ? 800 : 500,
                          background: isToday(day) ? 'var(--color-primary)' : 'transparent',
                          color: isToday(day) ? 'var(--color-text-inverse)' : (ci === 5 ? '#2563eb' : ci === 6 ? '#dc2626' : 'var(--color-text-primary)'),
                        }}>{day}</div>
                      )}
                    </div>
                  ))}
                </div>
                {segs.map(sg => {
                  const c = eventStyle(sg.ev);
                  const left = (sg.startCol / 7) * 100;
                  const width = ((sg.endCol - sg.startCol + 1) / 7) * 100;
                  // 実際の開始/終了だけ角を丸め、週またぎの続き部分は角を落として「続いている」ことを示す
                  const rL = sg.isStart ? '6px' : '0';
                  const rR = sg.isEnd ? '6px' : '0';
                  return (
                    <button key={`${sg.ev.id}-${wi}`} className="cal-event-bar"
                      title={sg.ev.title}
                      style={{
                        top: `calc(var(--cal-bar-top) + ${sg.lane} * var(--cal-lane-h))`,
                        left: `calc(${left}% + ${sg.isStart ? 3 : 0}px)`,
                        width: `calc(${width}% - ${(sg.isStart ? 3 : 0) + (sg.isEnd ? 3 : 0)}px)`,
                        background: c.bg, color: c.color,
                        borderRadius: `${rL} ${rR} ${rR} ${rL}`,
                      }}
                      onClick={() => setSelectedEvent(sg.ev)}
                    >{(sg.isStart || sg.startCol === 0) ? sg.ev.title : ''}</button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <div>
          {listEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', borderRadius: '1rem', border: '1px dashed var(--color-border)' }}>
              <Calendar size={32} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
                {showPast ? '登録されているイベントはありません。' : 'これから開催されるイベントはありません。'}
              </p>
            </div>
          ) : (
            (() => {
              // Group by month
              const groups: Record<string, GuildEvent[]> = {};
              [...listEvents]
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
                      const c = eventStyle(ev);
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
                              <span style={{ width: 10, height: 10, borderRadius: '9999px', background: c.color, flexShrink: 0 }} />
                              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{ev.title}</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                <Clock size={11} />{fmtTimeRange(ev)}
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

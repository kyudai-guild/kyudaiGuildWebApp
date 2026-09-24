'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { CalendarDays } from 'lucide-react';
import { useGuild } from '@/contexts/GuildContext';
import EventCalendar from '@/components/events/EventCalendar';
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
  const { isAdmin, isLoggedIn, member } = useGuild();
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [loading, setLoading] = useState(true);
  // writeCache 時点で最新のIDを読みたいので ref に持つ
  const memberIdForCache = useRef<string | null>(null);

  // 再取得のたびに骨組みへ戻すと画面がちらつくので、
  // すでに何か出ているときは表示を保ったまま裏で差し替える。
  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
        writeCache(EVENTS_CACHE, memberIdForCache.current, data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // キャッシュは「誰のものか」が確定してから読む。
  // 管理者だけは未承認のイベントも見えるため、共通の鍵にすると
  // 一般ユーザーに未承認イベントが一瞬見えてしまう。必ずIDを混ぜる。
  // 読み出しを effect 内に置くのは、ハイドレーションのズレを避けるため。
  useEffect(() => {
    memberIdForCache.current = member.id;
    const cached = readCache<GuildEvent[]>(EVENTS_CACHE, member.id, EVENTS_CACHE_MAX_AGE);
    if (!cached) return;
    setEvents(prev => (prev.length > 0 ? prev : cached));
    setLoading(false);
  }, [member.id]);

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

          {/* イベントの登録・編集・削除は管理画面（/admin のイベント管理）に集約した */}
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


    </div>
  );
}

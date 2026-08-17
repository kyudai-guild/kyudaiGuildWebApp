'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Shield, CheckCircle2, XCircle, ChevronDown, ChevronUp, Users, Tag, Calendar, ArrowLeft, AlertCircle, CalendarDays, MapPin, Scroll } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGuild } from '@/contexts/GuildContext';
import { GuildEvent, CATEGORY_COLORS, fmtDateLong, fmtTime } from '@/components/events/types';
import EventDetailModal from '@/components/events/EventDetailModal';
import { ADMIN_QUEST_STATUS as STATUS } from '@/components/quest/status';

interface AdminQuest {
  id: string; title: string; description: string; quest_type: string;
  max_applicants: number; reward: string; tags: string[]; status: string;
  listing_duration_type: string; listing_duration_weeks: number | null;
  listing_end_date: string | null; effective_end_date: string | null;
  rejection_reason: string | null; reviewed_at: string | null;
  created_at: string; creator: { display_name: string } | null;
  application_count: number;
}

const S = {
  page: { minHeight: '100vh' } as React.CSSProperties,
  pageHeader: { background: 'var(--bg-card)', borderBottom: '1px solid var(--color-border)', padding: 'clamp(1rem, 4vw, 1.5rem) clamp(1rem, 4vw, 2rem)', marginBottom: '1.5rem' } as React.CSSProperties,
  inner: { maxWidth: 900, margin: '0 auto' } as React.CSSProperties,
  content: { maxWidth: 900, margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem) 3rem' } as React.CSSProperties,
  backBtn: { display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 500, marginBottom: '1rem', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--color-text-tertiary)', transition: 'color 0.2s' } as React.CSSProperties,
  filterRow: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem' } as React.CSSProperties,
  stack: { display: 'flex', flexDirection: 'column', gap: '0.75rem' } as React.CSSProperties,
  card: { borderRadius: '1rem', overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' } as React.CSSProperties,
  cardExpanded: { padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' } as React.CSSProperties,
  metaRow: { display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' } as React.CSSProperties,
  metaItem: { display: 'flex', alignItems: 'center', gap: '0.375rem' } as React.CSSProperties,
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: '0.375rem' } as React.CSSProperties,
  btnRow: { display: 'flex', gap: '0.5rem' } as React.CSSProperties,
};

type Tab = 'quests' | 'events';

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, isLoggedIn } = useGuild();
  const [tab, setTab] = useState<Tab>('quests');

  // ── Quest state ──
  const [quests, setQuests] = useState<AdminQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Event state ──
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState('approved');
  const [selectedEvent, setSelectedEvent] = useState<GuildEvent | null>(null);

  const fetchQuests = useCallback(async () => {
    try { const res = await fetch('/api/quests'); if (res.ok) setQuests(await res.json()); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  const fetchEvents = useCallback(async () => {
    try { const res = await fetch('/api/events'); if (res.ok) setEvents(await res.json()); }
    catch (e) { console.error(e); } finally { setEventsLoading(false); }
  }, []);

  useEffect(() => { if (isLoggedIn) { fetchQuests(); fetchEvents(); } }, [isLoggedIn, fetchQuests, fetchEvents]);

  const handleReview = async (questId: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) { setActionError('リジェクト理由を入力してください。'); return; }
    setActionLoading(true); setActionError(null);
    try {
      const res = await fetch(`/api/quests/${questId}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, rejection_reason: action === 'reject' ? rejectionReason : undefined }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || '審査処理に失敗しました。'); }
      setReviewingId(null); setRejectionReason(''); await fetchQuests();
    } catch (err: any) { setActionError(err.message); } finally { setActionLoading(false); }
  };

  const filtered = filter === 'all' ? quests : quests.filter(q => q.status === filter);
  const counts = { all: quests.length, pending: quests.filter(q => q.status === 'pending').length, approved: quests.filter(q => q.status === 'approved').length, rejected: quests.filter(q => q.status === 'rejected').length };

  const eventFiltered = eventFilter === 'all' ? events : events.filter(e => e.status === eventFilter);
  const eventCounts = { all: events.length, approved: events.filter(e => e.status === 'approved').length };

  const centeredMsg = (children: React.ReactNode) => (
    <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>{children}</div>
  );

  if (!isLoggedIn) return centeredMsg(<p style={{ color: 'var(--color-text-tertiary)' }}>ログインが必要です。</p>);
  if (!isAdmin) return centeredMsg(
    <>
      <Shield size={48} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 1rem', opacity: 0.3 }} />
      <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>管理者権限が必要です。</p>
    </>
  );

  const tabBtn = (key: Tab, label: string, Icon: React.ElementType, badge: number) => {
    const active = tab === key;
    return (
      <button onClick={() => setTab(key)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer', border: 'none', borderBottom: '2px solid', background: 'none', transition: 'all 0.2s',
          color: active ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
          borderBottomColor: active ? 'var(--color-primary)' : 'transparent',
        }}
      >
        <Icon size={16} />{label}
        {badge > 0 && (
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, minWidth: 18, height: 18, padding: '0 0.3rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', background: '#d97706', color: '#fff' }}>{badge}</span>
        )}
      </button>
    );
  };

  return (
    <div style={S.page}>
      <div style={S.pageHeader}>
        <div style={S.inner}>
          <button onClick={() => router.push('/')} style={S.backBtn}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'; }}
          ><ArrowLeft size={14} />ホームへ戻る</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--bg-dark)' }}>
              <Shield size={18} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>管理者ダッシュボード</h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>クエスト・イベントの管理</p>
            </div>
          </div>
        </div>
      </div>

      <div style={S.content}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
          {tabBtn('quests', 'クエスト審査', Scroll, counts.pending)}
          {tabBtn('events', 'イベント管理', CalendarDays, 0)}
        </div>

        {/* ══════════ QUEST TAB ══════════ */}
        {tab === 'quests' && (
          <>
            <div style={S.filterRow}>
              {(['pending','approved','rejected','all'] as const).map(key => {
                const cfg = key === 'all' ? { label: 'すべて' } : STATUS[key];
                const active = filter === key;
                return (
                  <button key={key} onClick={() => setFilter(key)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 1rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '9999px', border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', background: active ? 'var(--bg-dark)' : 'var(--bg-card)', color: active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)', borderColor: active ? 'var(--bg-dark)' : 'var(--color-border)' }}
                  >{cfg.label}<span style={{ fontSize: '0.75rem', opacity: 0.6 }}>({counts[key]})</span></button>
                );
              })}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '5rem 0' }}>
                <div style={{ width: 32, height: 32, border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '9999px', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: '1rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)' }}>
                <Shield size={32} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>
                  {filter === 'pending' ? '審査待ちのクエストはありません。' : `${STATUS[filter]?.label || 'この条件の'}クエストはありません。`}
                </p>
              </div>
            ) : (
              <div style={S.stack}>
                {filtered.map((quest, i) => {
                  const st = STATUS[quest.status] || STATUS.pending;
                  const { Icon: StIcon } = st;
                  const isExpanded = expandedId === quest.id;
                  const isReviewing = reviewingId === quest.id;
                  return (
                    <motion.div key={quest.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} style={S.card}>
                      <div style={{ padding: '1.25rem', cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : quest.id)}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '9999px', color: st.color, background: st.bg }}>
                                <StIcon size={10} />{st.label}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{quest.quest_type}</span>
                            </div>
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{quest.title}</h3>
                            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--color-text-tertiary)' }}>
                              掲示者: {quest.creator?.display_name || '不明'} / 申請日: {new Date(quest.created_at).toLocaleDateString('ja-JP')}
                            </p>
                          </div>
                          {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                            <div style={S.cardExpanded}>
                              <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--bg-base)', fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                                {quest.description}
                              </div>
                              <div style={S.metaRow}>
                                <span style={S.metaItem}><Users size={13} style={{ color: 'var(--color-primary)' }} />募集: {quest.max_applicants}人</span>
                                {quest.reward && <span style={S.metaItem}><Tag size={13} style={{ color: 'var(--color-accent)' }} />{quest.reward}</span>}
                                <span style={S.metaItem}><Calendar size={13} style={{ color: 'var(--color-text-tertiary)' }} />
                                  {quest.listing_duration_type === 'weeks' ? `${quest.listing_duration_weeks}週間` : quest.listing_end_date ? `${new Date(quest.listing_end_date).toLocaleDateString('ja-JP')}まで` : '未設定'}
                                </span>
                              </div>
                              {quest.tags && quest.tags.length > 0 && (
                                <div style={{ ...S.tagRow, marginBottom: '0.75rem' }}>
                                  {quest.tags.map(tag => <span key={tag} style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', borderRadius: '9999px', color: 'var(--color-text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)' }}>#{tag}</span>)}
                                </div>
                              )}
                              {quest.status === 'rejected' && quest.rejection_reason && (
                                <div style={{ padding: '1rem', borderRadius: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', marginBottom: '0.75rem' }}>
                                  <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: '#dc2626' }}>リジェクト理由:</p>
                                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{quest.rejection_reason}</p>
                                </div>
                              )}
                              {quest.status === 'pending' && (
                                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                                  {actionError && isReviewing && (
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', borderRadius: '0.75rem', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 500, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                                      <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />{actionError}
                                    </div>
                                  )}
                                  {isReviewing ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                        リジェクト理由 <span style={{ color: '#dc2626' }}>*</span>
                                      </label>
                                      <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                                        style={{ width: '100%', fontSize: '0.875rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', outline: 'none', resize: 'none', minHeight: 64, background: 'var(--bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
                                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,74,58,0.1)'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                                        placeholder="リジェクトする理由を記載してください..."
                                      />
                                      <div style={S.btnRow}>
                                        <button onClick={() => { setReviewingId(null); setRejectionReason(''); setActionError(null); }}
                                          style={{ flex: 1, padding: '0.625rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                                        >キャンセル</button>
                                        <button onClick={() => handleReview(quest.id, 'reject')} disabled={actionLoading}
                                          style={{ flex: 1, padding: '0.625rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.5 : 1, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                                        >{actionLoading ? '処理中...' : 'リジェクト'}</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={S.btnRow}>
                                      <button onClick={() => handleReview(quest.id, 'approve')} disabled={actionLoading}
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.625rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.5 : 1, background: '#ecfdf5', color: '#059669', border: '1px solid #bbf7d0' }}
                                      ><CheckCircle2 size={14} />{actionLoading ? '処理中...' : '承認する'}</button>
                                      <button onClick={() => { setReviewingId(quest.id); setActionError(null); }}
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.625rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                                      ><XCircle size={14} />リジェクト</button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════ EVENT TAB ══════════ */}
        {tab === 'events' && (
          <>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
              ※イベントの登録は <button onClick={() => router.push('/events')} style={{ color: 'var(--color-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>イベントカレンダー</button> ページの「イベントを登録」から行えます。
            </p>
            <div style={S.filterRow}>
              {(['approved','all'] as const).map(key => {
                const label = key === 'all' ? 'すべて' : '公開中';
                const active = eventFilter === key;
                return (
                  <button key={key} onClick={() => setEventFilter(key)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 1rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '9999px', border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', background: active ? 'var(--bg-dark)' : 'var(--bg-card)', color: active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)', borderColor: active ? 'var(--bg-dark)' : 'var(--color-border)' }}
                  >{label}<span style={{ fontSize: '0.75rem', opacity: 0.6 }}>({eventCounts[key]})</span></button>
                );
              })}
            </div>

            {eventsLoading ? (
              <div style={{ textAlign: 'center', padding: '5rem 0' }}>
                <div style={{ width: 32, height: 32, border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '9999px', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
              </div>
            ) : eventFiltered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: '1rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)' }}>
                <CalendarDays size={32} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>登録済みのイベントはありません。</p>
              </div>
            ) : (
              <div style={S.stack}>
                {eventFiltered.map((ev, i) => {
                  const c = CATEGORY_COLORS[ev.category] ?? CATEGORY_COLORS['その他'];
                  return (
                    <motion.button key={ev.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      onClick={() => setSelectedEvent(ev)}
                      style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                    >
                      <div style={{ width: 4, alignSelf: 'stretch', borderRadius: '9999px', background: c.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: '9999px', color: c.color, background: c.bg }}>{ev.category}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{fmtDateLong(ev.event_date)} {fmtTime(ev.event_date)}</span>
                        </div>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{ev.title}</h3>
                        {ev.location && (
                          <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--color-text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <MapPin size={11} />{ev.location}
                          </p>
                        )}
                      </div>
                      <ChevronDown size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0, transform: 'rotate(-90deg)' }} />
                    </motion.button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

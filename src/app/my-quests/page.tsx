'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Scroll, XCircle, AlertCircle, Users, Tag, Calendar, ChevronDown, ChevronUp, ArrowLeft, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MY_QUEST_STATUS as STATUS } from '@/components/quest/status';

interface Application {
  id: string; message: string | null; status: string; applied_at: string;
  applicant: { display_name: string; email: string };
}
interface MyQuest {
  id: string; title: string; description: string; quest_type: string;
  max_applicants: number; reward: string; tags: string[]; status: string;
  rejection_reason: string | null; reviewed_at: string | null;
  reviewer: { display_name: string } | null;
  effective_end_date: string | null; created_at: string;
  applications: Application[];
}

const S = {
  page: { minHeight: '100vh' } as React.CSSProperties,
  pageHeader: { background: 'var(--bg-card)', borderBottom: '1px solid var(--color-border)', padding: 'clamp(1rem, 4vw, 1.5rem) clamp(1rem, 4vw, 2rem)', marginBottom: '1.5rem' } as React.CSSProperties,
  inner: { maxWidth: 900, margin: '0 auto' } as React.CSSProperties,
  backBtn: { display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 500, marginBottom: '1rem', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--color-text-tertiary)', transition: 'color 0.2s' } as React.CSSProperties,
  titleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' } as React.CSSProperties,
  iconBox: { width: 40, height: 40, borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--bg-dark)' } as React.CSSProperties,
  titleGroup: { display: 'flex', alignItems: 'center', gap: '0.75rem' } as React.CSSProperties,
  content: { maxWidth: 900, margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem) 3rem' } as React.CSSProperties,
  filterRow: { display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.25rem' } as React.CSSProperties,
  alertBanner: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' } as React.CSSProperties,
  spinner: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center', padding: '5rem 0' } as React.CSSProperties,
  emptyBox: { textAlign: 'center', padding: '4rem 2rem', borderRadius: '1rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)' } as React.CSSProperties,
  stack: { display: 'flex', flexDirection: 'column', gap: '0.75rem' } as React.CSSProperties,
  card: { borderRadius: '1rem', overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' } as React.CSSProperties,
  cardHeader: { padding: '1.25rem', cursor: 'pointer' } as React.CSSProperties,
  cardExpanded: { padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' } as React.CSSProperties,
  row: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' } as React.CSSProperties,
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: '0.375rem' } as React.CSSProperties,
  metaRow: { display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' } as React.CSSProperties,
  metaItem: { display: 'flex', alignItems: 'center', gap: '0.375rem' } as React.CSSProperties,
  rejectionBox: { padding: '1rem', borderRadius: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', marginTop: '0.75rem' } as React.CSSProperties,
  applicantCard: { padding: '1rem', borderRadius: '0.75rem', background: 'var(--bg-base)', border: '1px solid var(--color-border)' } as React.CSSProperties,
};

export default function MyQuestsPage() {
  const router = useRouter();
  const [quests, setQuests] = useState<MyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/my-quests').then(r => r.ok ? r.json() : []).then(setQuests).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? quests : quests.filter(q => q.status === filter);
  const counts = { all: quests.length, pending: quests.filter(q => q.status === 'pending').length, approved: quests.filter(q => q.status === 'approved').length, rejected: quests.filter(q => q.status === 'rejected').length };

  const filterBtn = (key: string) => {
    const cfg = key === 'all' ? { label: 'すべて' } : STATUS[key];
    const active = filter === key;
    return (
      <button key={key} onClick={() => setFilter(key)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 1rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '9999px', border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
          background: active ? 'var(--bg-dark)' : 'var(--bg-card)',
          color: active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
          borderColor: active ? 'var(--bg-dark)' : 'var(--color-border)',
        }}
      >{cfg.label}<span style={{ fontSize: '0.75rem', opacity: 0.6 }}>({counts[key as keyof typeof counts]})</span></button>
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
          <div style={S.titleRow}>
            <div style={S.titleGroup}>
              <div style={S.iconBox}><Scroll size={18} style={{ color: 'var(--color-accent)' }} /></div>
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>マイクエスト</h1>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>申請したクエストの一覧・応募者の確認</p>
              </div>
            </div>
            <button onClick={() => router.push('/#quest-board')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 600, padding: '0.625rem 1.25rem', borderRadius: '9999px', background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', cursor: 'pointer', transition: 'background 0.2s, transform 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            ><Plus size={14} />新しく申請</button>
          </div>
        </div>
      </div>

      <div style={S.content}>
        <div style={S.filterRow}>{(['all','pending','approved','rejected'] as const).map(filterBtn)}</div>

        {counts.rejected > 0 && filter !== 'rejected' && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            style={S.alertBanner} onClick={() => setFilter('rejected')}
          ><AlertCircle size={14} style={{ flexShrink: 0 }} />リジェクトされたクエストが {counts.rejected} 件あります。理由を確認してください。</motion.div>
        )}

        {loading ? (
          <div style={S.spinner}>
            <div style={{ width: 32, height: 32, border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '9999px', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>読み込み中...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={S.emptyBox}>
            <Scroll size={32} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '1rem', color: 'var(--color-text-tertiary)' }}>
              {filter === 'all' ? 'まだクエストを申請していません。' : `${STATUS[filter]?.label || ''}のクエストはありません。`}
            </p>
            {filter === 'all' && (
              <button onClick={() => router.push('/')}
                style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0.625rem 1.25rem', borderRadius: '9999px', background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', cursor: 'pointer' }}
              >クエストを申請する</button>
            )}
          </div>
        ) : (
          <div style={S.stack}>
            {filtered.map((quest, i) => {
              const st = STATUS[quest.status] || STATUS.pending;
              const { Icon: StIcon } = st;
              const isExpanded = expandedId === quest.id;
              const appCount = quest.applications?.length ?? 0;
              return (
                <motion.div key={quest.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} style={S.card}>
                  <div style={S.cardHeader} onClick={() => setExpandedId(isExpanded ? null : quest.id)}>
                    <div style={S.row}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '9999px', color: st.color, background: st.bg }}>
                            <StIcon size={10} />{st.label}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{quest.quest_type}</span>
                        </div>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{quest.title}</h3>
                        <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--color-text-tertiary)' }}>
                          申請日: {new Date(quest.created_at).toLocaleDateString('ja-JP')}
                          {quest.reviewed_at && ` / 審査日: ${new Date(quest.reviewed_at).toLocaleDateString('ja-JP')}`}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        {appCount > 0 && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '9999px', background: 'var(--bg-dark)', color: 'var(--color-text-inverse)' }}>
                            応募 {appCount}件
                          </span>
                        )}
                        {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--color-text-tertiary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--color-text-tertiary)' }} />}
                      </div>
                    </div>
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                        <div style={S.cardExpanded}>
                          <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>{quest.description}</p>
                          <div style={S.metaRow}>
                            <span style={S.metaItem}><Users size={13} style={{ color: 'var(--color-primary)' }} />応募: {appCount}/{quest.max_applicants}人</span>
                            {quest.reward && <span style={S.metaItem}><Tag size={13} style={{ color: 'var(--color-accent)' }} />{quest.reward}</span>}
                            {quest.effective_end_date && <span style={S.metaItem}><Calendar size={13} style={{ color: 'var(--color-text-tertiary)' }} />期限: {new Date(quest.effective_end_date).toLocaleDateString('ja-JP')}</span>}
                          </div>
                          {quest.tags && quest.tags.length > 0 && (
                            <div style={{ ...S.tagRow, marginTop: '0.75rem' }}>
                              {quest.tags.map(tag => (
                                <span key={tag} style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', borderRadius: '9999px', color: 'var(--color-text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)' }}>#{tag}</span>
                              ))}
                            </div>
                          )}
                          {quest.status === 'rejected' && quest.rejection_reason && (
                            <div style={S.rejectionBox}>
                              <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: '#dc2626' }}><XCircle size={13} />リジェクト理由</p>
                              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{quest.rejection_reason}</p>
                              {quest.reviewer && <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--color-text-tertiary)' }}>審査者: {quest.reviewer.display_name}</p>}
                            </div>
                          )}
                          {quest.applications && quest.applications.length > 0 && (
                            <div style={{ marginTop: '1rem' }}>
                              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-text-primary)' }}>
                                <Users size={14} style={{ color: 'var(--color-primary)' }} />応募者一覧
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {quest.applications.map(app => (
                                  <div key={app.id} style={S.applicantCard}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{app.applicant?.display_name || '不明'}</p>
                                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{new Date(app.applied_at).toLocaleDateString('ja-JP')}</p>
                                    </div>
                                    {app.message && <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>{app.message}</p>}
                                  </div>
                                ))}
                              </div>
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
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

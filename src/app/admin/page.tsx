'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Shield, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, Users, Tag, Calendar, ArrowLeft, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGuild } from '@/contexts/GuildContext';

interface AdminQuest {
  id: string; title: string; description: string; quest_type: string;
  max_applicants: number; reward: string; tags: string[]; status: string;
  listing_duration_type: string; listing_duration_weeks: number | null;
  listing_end_date: string | null; effective_end_date: string | null;
  rejection_reason: string | null; reviewed_at: string | null;
  created_at: string; creator: { display_name: string } | null;
  application_count: number;
}

const STATUS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:  { label: '審査待ち', color: '#d97706', bg: '#fffbeb', icon: Clock },
  approved: { label: '承認済み', color: '#059669', bg: '#ecfdf5', icon: CheckCircle2 },
  rejected: { label: 'リジェクト', color: '#dc2626', bg: '#fef2f2', icon: XCircle },
};

const PAGE_HEADER_STYLE = {
  background: 'var(--bg-card)',
  borderBottom: '1px solid var(--color-border)',
  padding: '1.5rem 2rem',
  marginBottom: '1.5rem',
} as React.CSSProperties;

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, isLoggedIn } = useGuild();
  const [quests, setQuests] = useState<AdminQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => { if (isLoggedIn) fetchQuests(); }, [isLoggedIn]);

  const fetchQuests = async () => {
    try {
      const res = await fetch('/api/quests');
      if (res.ok) setQuests(await res.json());
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleReview = async (questId: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) { setActionError('リジェクト理由を入力してください。'); return; }
    setActionLoading(true); setActionError(null);
    try {
      const res = await fetch(`/api/quests/${questId}/review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejection_reason: action === 'reject' ? rejectionReason : undefined }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || '審査処理に失敗しました。'); }
      setReviewingId(null); setRejectionReason(''); await fetchQuests();
    } catch (err: any) { setActionError(err.message); } finally { setActionLoading(false); }
  };

  const filtered = filter === 'all' ? quests : quests.filter(q => q.status === filter);
  const counts = {
    all: quests.length,
    pending: quests.filter(q => q.status === 'pending').length,
    approved: quests.filter(q => q.status === 'approved').length,
    rejected: quests.filter(q => q.status === 'rejected').length,
  };

  if (!isLoggedIn) return (
    <div className="max-w-4xl mx-auto px-6 py-20 text-center">
      <p style={{ color: 'var(--color-text-tertiary)' }}>ログインが必要です。</p>
    </div>
  );
  if (!isAdmin) return (
    <div className="max-w-4xl mx-auto px-6 py-20 text-center">
      <Shield size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--color-text-tertiary)' }} />
      <p className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>管理者権限が必要です。</p>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div style={PAGE_HEADER_STYLE}>
        <div className="max-w-4xl mx-auto">
          <button onClick={() => router.push('/')} className="flex items-center gap-1.5 text-sm font-medium mb-4 transition-colors"
            style={{ color: 'var(--color-text-tertiary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'; }}
          ><ArrowLeft size={14} />ホームへ戻る</button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-dark)' }}>
              <Shield size={18} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>管理者ダッシュボード</h1>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>クエストの審査・承認・リジェクト</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(key => {
            const cfg = key === 'all' ? { label: 'すべて', color: 'var(--color-primary)', bg: 'var(--bg-secondary)' } : STATUS[key];
            return (
              <button key={key} onClick={() => setFilter(key)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all whitespace-nowrap"
                style={filter === key
                  ? { background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', borderColor: 'var(--bg-dark)' }
                  : { background: 'var(--bg-card)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }
                }
              >{cfg.label}<span className="text-xs opacity-60">({counts[key]})</span></button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--bg-card)' }}>
            <Shield size={32} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--color-text-tertiary)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-tertiary)' }}>
              {filter === 'pending' ? '審査待ちのクエストはありません。' : `${STATUS[filter]?.label || 'この条件の'}クエストはありません。`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((quest, i) => {
              const st = STATUS[quest.status] || STATUS.pending;
              const StIcon = st.icon;
              const isExpanded = expandedId === quest.id;
              const isReviewing = reviewingId === quest.id;
              return (
                <motion.div key={quest.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
                >
                  <div className="p-5 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : quest.id)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: st.color, background: st.bg }}>
                            <StIcon size={10} />{st.label}
                          </span>
                          <span className="text-xs font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{quest.quest_type}</span>
                        </div>
                        <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{quest.title}</h3>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                          掲示者: {quest.creator?.display_name || '不明'} / 申請日: {new Date(quest.created_at).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                      {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-5 pb-5 space-y-4 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
                          <div className="p-4 rounded-xl text-sm leading-relaxed" style={{ background: 'var(--bg-base)', color: 'var(--color-text-secondary)' }}>
                            {quest.description}
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            <span className="flex items-center gap-1.5"><Users size={13} style={{ color: 'var(--color-primary)' }} />募集: {quest.max_applicants}人</span>
                            {quest.reward && <span className="flex items-center gap-1.5"><Tag size={13} style={{ color: 'var(--color-accent)' }} />{quest.reward}</span>}
                            <span className="flex items-center gap-1.5"><Calendar size={13} style={{ color: 'var(--color-text-tertiary)' }} />
                              {quest.listing_duration_type === 'weeks' ? `${quest.listing_duration_weeks}週間` : quest.listing_end_date ? `${new Date(quest.listing_end_date).toLocaleDateString('ja-JP')}まで` : '未設定'}
                            </span>
                          </div>

                          {quest.tags && quest.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {quest.tags.map(tag => (
                                <span key={tag} className="text-xs px-2.5 py-1 rounded-full" style={{ color: 'var(--color-text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)' }}>#{tag}</span>
                              ))}
                            </div>
                          )}

                          {quest.status === 'rejected' && quest.rejection_reason && (
                            <div className="p-4 rounded-xl text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                              <p className="font-semibold mb-1" style={{ color: '#dc2626' }}>リジェクト理由:</p>
                              <p style={{ color: 'var(--color-text-secondary)' }}>{quest.rejection_reason}</p>
                            </div>
                          )}

                          {quest.status === 'pending' && (
                            <div className="space-y-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                              {actionError && isReviewing && (
                                <div className="flex items-start gap-2 p-3 rounded-xl text-sm font-medium" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                                  <AlertCircle size={14} className="mt-0.5 shrink-0" />{actionError}
                                </div>
                              )}
                              {isReviewing ? (
                                <div className="space-y-3">
                                  <label className="block text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                    リジェクト理由 <span style={{ color: '#dc2626' }}>*</span>
                                  </label>
                                  <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                                    className="w-full text-sm rounded-xl px-4 py-3 outline-none resize-none"
                                    style={{ background: 'var(--bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', minHeight: 64 }}
                                    onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(26,74,58,0.1)'; }}
                                    onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                                    placeholder="リジェクトする理由を記載してください..."
                                  />
                                  <div className="flex gap-2">
                                    <button onClick={() => { setReviewingId(null); setRejectionReason(''); setActionError(null); }}
                                      className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                                      style={{ background: 'var(--bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                                    >キャンセル</button>
                                    <button onClick={() => handleReview(quest.id, 'reject')} disabled={actionLoading}
                                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                                      style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                                    >{actionLoading ? '処理中...' : 'リジェクト'}</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <button onClick={() => handleReview(quest.id, 'approve')} disabled={actionLoading}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                                    style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #bbf7d0' }}
                                  ><CheckCircle2 size={14} />{actionLoading ? '処理中...' : '承認する'}</button>
                                  <button onClick={() => { setReviewingId(quest.id); setActionError(null); }}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                    style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
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
      </div>
    </div>
  );
}

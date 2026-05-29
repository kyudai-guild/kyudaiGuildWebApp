'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Scroll, Clock, CheckCircle2, XCircle, AlertCircle, Users, Tag, Calendar, ChevronDown, ChevronUp, ArrowLeft, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

const STATUS: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:  { label: '審査中',    color: '#d97706', bg: '#fffbeb', icon: Clock },
  approved: { label: '承認済み',  color: '#059669', bg: '#ecfdf5', icon: CheckCircle2 },
  rejected: { label: 'リジェクト', color: '#dc2626', bg: '#fef2f2', icon: XCircle },
  closed:   { label: '終了',      color: '#6b7280', bg: '#f9fafb', icon: XCircle },
};

const PAGE_HEADER_STYLE = {
  background: 'var(--bg-card)',
  borderBottom: '1px solid var(--color-border)',
  padding: '1.5rem 2rem',
  marginBottom: '1.5rem',
} as React.CSSProperties;

export default function MyQuestsPage() {
  const router = useRouter();
  const [quests, setQuests] = useState<MyQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/my-quests')
      .then(r => r.ok ? r.json() : [])
      .then(setQuests)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? quests : quests.filter(q => q.status === filter);
  const counts = {
    all: quests.length,
    pending: quests.filter(q => q.status === 'pending').length,
    approved: quests.filter(q => q.status === 'approved').length,
    rejected: quests.filter(q => q.status === 'rejected').length,
  };

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
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-dark)' }}>
                <Scroll size={18} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>マイクエスト</h1>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>申請したクエストの一覧・応募者の確認</p>
              </div>
            </div>
            <button onClick={() => router.push('/#quest-board')}
              className="flex items-center gap-1.5 text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:-translate-y-px"
              style={{ background: 'var(--bg-dark)', color: 'var(--color-text-inverse)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; }}
            ><Plus size={14} /><span className="hidden sm:inline">新しく申請</span></button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-8">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(key => {
            const cfg = key === 'all' ? { label: 'すべて' } : STATUS[key];
            const Icon = key !== 'all' ? STATUS[key].icon : null;
            return (
              <button key={key} onClick={() => setFilter(key)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all whitespace-nowrap"
                style={filter === key
                  ? { background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', borderColor: 'var(--bg-dark)' }
                  : { background: 'var(--bg-card)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }
                }
              >
                {Icon && <Icon size={12} />}{cfg.label}
                <span className="text-xs opacity-60">({counts[key]})</span>
              </button>
            );
          })}
        </div>

        {/* Rejection Alert */}
        {counts.rejected > 0 && filter !== 'rejected' && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl mb-4 text-sm font-medium cursor-pointer transition-colors"
            style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
            onClick={() => setFilter('rejected')}
          >
            <AlertCircle size={14} className="shrink-0" />
            リジェクトされたクエストが {counts.rejected} 件あります。理由を確認してください。
          </motion.div>
        )}

        {loading ? (
          <div className="text-center py-20 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>読み込み中...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border" style={{ borderColor: 'var(--color-border)', background: 'var(--bg-card)' }}>
            <Scroll size={32} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--color-text-tertiary)' }} />
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--color-text-tertiary)' }}>
              {filter === 'all' ? 'まだクエストを申請していません。' : `${STATUS[filter]?.label || ''}のクエストはありません。`}
            </p>
            {filter === 'all' && (
              <button onClick={() => router.push('/')}
                className="text-sm font-semibold px-5 py-2.5 rounded-full transition-all"
                style={{ background: 'var(--bg-dark)', color: 'var(--color-text-inverse)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; }}
              >クエストを申請する</button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((quest, i) => {
              const st = STATUS[quest.status] || STATUS.pending;
              const StIcon = st.icon;
              const isExpanded = expandedId === quest.id;
              const appCount = quest.applications?.length ?? 0;
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
                          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{quest.quest_type}</span>
                        </div>
                        <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{quest.title}</h3>
                        <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                          申請日: {new Date(quest.created_at).toLocaleDateString('ja-JP')}
                          {quest.reviewed_at && ` / 審査日: ${new Date(quest.reviewed_at).toLocaleDateString('ja-JP')}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {appCount > 0 && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-dark)', color: 'var(--color-text-inverse)' }}>
                            応募 {appCount}件
                          </span>
                        )}
                        {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--color-text-tertiary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--color-text-tertiary)' }} />}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-5 pb-5 space-y-4 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{quest.description}</p>

                          <div className="flex flex-wrap gap-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            <span className="flex items-center gap-1.5"><Users size={13} style={{ color: 'var(--color-primary)' }} />応募: {appCount}/{quest.max_applicants}人</span>
                            {quest.reward && <span className="flex items-center gap-1.5"><Tag size={13} style={{ color: 'var(--color-accent)' }} />{quest.reward}</span>}
                            {quest.effective_end_date && (
                              <span className="flex items-center gap-1.5"><Calendar size={13} style={{ color: 'var(--color-text-tertiary)' }} />期限: {new Date(quest.effective_end_date).toLocaleDateString('ja-JP')}</span>
                            )}
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
                              <p className="flex items-center gap-1.5 font-semibold mb-2" style={{ color: '#dc2626' }}>
                                <XCircle size={13} />リジェクト理由
                              </p>
                              <p style={{ color: 'var(--color-text-secondary)' }}>{quest.rejection_reason}</p>
                              {quest.reviewer && (
                                <p className="text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>審査者: {quest.reviewer.display_name}</p>
                              )}
                            </div>
                          )}

                          {quest.applications && quest.applications.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
                                <Users size={14} style={{ color: 'var(--color-primary)' }} />応募者一覧
                              </h4>
                              <div className="space-y-2">
                                {quest.applications.map(app => (
                                  <div key={app.id} className="p-4 rounded-xl" style={{ background: 'var(--bg-base)', border: '1px solid var(--color-border)' }}>
                                    <div className="flex justify-between items-start">
                                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{app.applicant?.display_name || '不明'}</p>
                                      <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{new Date(app.applied_at).toLocaleDateString('ja-JP')}</p>
                                    </div>
                                    {app.message && (
                                      <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{app.message}</p>
                                    )}
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
    </div>
  );
}

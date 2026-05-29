'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, Send, Users, Tag, Calendar, ArrowLeft, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGuild } from '@/contexts/GuildContext';

interface AdminQuest {
  id: string;
  title: string;
  description: string;
  quest_type: string;
  max_applicants: number;
  reward: string;
  tags: string[];
  status: string;
  listing_duration_type: string;
  listing_duration_weeks: number | null;
  listing_end_date: string | null;
  effective_end_date: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  creator: { display_name: string } | null;
  application_count: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: '審査待ち', color: '#f59e0b', icon: Clock },
  approved: { label: '承認済み', color: '#10b981', icon: CheckCircle2 },
  rejected: { label: 'リジェクト', color: '#ef4444', icon: XCircle },
};

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

  useEffect(() => {
    if (isLoggedIn) {
      fetchQuests();
    }
  }, [isLoggedIn]);

  const fetchQuests = async () => {
    try {
      const res = await fetch('/api/quests');
      if (res.ok) {
        const data = await res.json();
        setQuests(data);
      }
    } catch (err) {
      console.error('Error fetching quests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (questId: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) {
      setActionError('リジェクト理由を入力してください。');
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/quests/${questId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          rejection_reason: action === 'reject' ? rejectionReason : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '審査処理に失敗しました。');
      }

      setReviewingId(null);
      setRejectionReason('');
      await fetchQuests();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredQuests = filter === 'all' ? quests : quests.filter(q => q.status === filter);

  const statusCounts = {
    all: quests.length,
    pending: quests.filter(q => q.status === 'pending').length,
    approved: quests.filter(q => q.status === 'approved').length,
    rejected: quests.filter(q => q.status === 'rejected').length,
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-[#8b7355]">ログインが必要です。</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Shield size={48} className="text-[#8b7355] mx-auto mb-4 opacity-40" />
        <p className="text-[#8b7355] font-bold">管理者権限が必要です。</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/')} className="text-[#8b7355] hover:text-[var(--gold-light)] transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-rpg font-black text-[var(--gold-light)] flex items-center gap-2" style={{ textShadow: '2px 2px 0 var(--border-inner)' }}>
            <Shield size={20} />
            管理者ダッシュボード
          </h1>
          <p className="text-xs text-[#8b7355]">クエストの審査・管理</p>
        </div>
      </div>

      {/* フィルター */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(key => {
          const config = key === 'all' ? { label: 'すべて', color: 'var(--gold)' } : STATUS_CONFIG[key];
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold border transition-all whitespace-nowrap ${
                filter === key
                  ? 'bg-[var(--gold-dark)] text-white border-[var(--gold-dark)]'
                  : 'border-[rgba(139,115,85,0.3)] text-[#8b7355] hover:border-[var(--gold-dark)]'
              }`}
            >
              {config.label}
              <span className="text-[10px] opacity-70">({statusCounts[key]})</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-20"><p className="text-[#8b7355] text-sm">読み込み中...</p></div>
      ) : filteredQuests.length === 0 ? (
        <div className="text-center py-20 rpg-card">
          <Shield size={32} className="text-[#8b7355] mx-auto mb-4 opacity-40" />
          <p className="text-[#8b7355] text-sm font-bold">
            {filter === 'pending' ? '審査待ちのクエストはありません。' : `${STATUS_CONFIG[filter]?.label || 'この条件の'}クエストはありません。`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuests.map((quest, i) => {
            const statusConf = STATUS_CONFIG[quest.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConf.icon;
            const isExpanded = expandedId === quest.id;
            const isReviewing = reviewingId === quest.id;

            return (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rpg-card overflow-hidden"
              >
                <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : quest.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold"
                          style={{ color: statusConf.color, background: `${statusConf.color}15`, border: `1px solid ${statusConf.color}30` }}
                        >
                          <StatusIcon size={10} />
                          {statusConf.label}
                        </span>
                        <span className="text-[10px] text-[#8b7355]">{quest.quest_type}</span>
                      </div>
                      <h3 className="text-sm font-bold text-[var(--gold-light)]">{quest.title}</h3>
                      <p className="text-[10px] text-[#8b7355] mt-1">
                        掲示者: {quest.creator?.display_name || '不明'} /
                        申請日: {new Date(quest.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-[#8b7355]" /> : <ChevronDown size={16} className="text-[#8b7355]" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3 border-t border-[rgba(139,115,85,0.15)] pt-3">
                        <div className="bg-[rgba(0,0,0,0.2)] p-3 rounded-sm border border-[rgba(139,115,85,0.1)]">
                          <p className="text-xs text-[#cfbeaf] whitespace-pre-wrap">{quest.description}</p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <span className="text-[10px] text-[#cfbeaf] flex items-center gap-1">
                            <Users size={10} className="text-[var(--gold)]" />
                            募集: {quest.max_applicants}人
                          </span>
                          {quest.reward && (
                            <span className="text-[10px] text-[#cfbeaf] flex items-center gap-1">
                              <Tag size={10} className="text-[var(--gold)]" />
                              {quest.reward}
                            </span>
                          )}
                          <span className="text-[10px] text-[#cfbeaf] flex items-center gap-1">
                            <Calendar size={10} className="text-[var(--gold)]" />
                            {quest.listing_duration_type === 'weeks'
                              ? `${quest.listing_duration_weeks}週間`
                              : quest.listing_end_date
                                ? `${new Date(quest.listing_end_date).toLocaleDateString('ja-JP')}まで`
                                : '未設定'}
                          </span>
                        </div>

                        {quest.tags && quest.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {quest.tags.map(tag => (
                              <span key={tag} className="text-[10px] text-[var(--gold-light)] bg-[rgba(139,115,85,0.1)] px-2 py-0.5 rounded-sm border border-[rgba(139,115,85,0.2)]">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {quest.status === 'rejected' && quest.rejection_reason && (
                          <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-sm">
                            <p className="text-[10px] font-bold text-red-400 mb-1">リジェクト理由:</p>
                            <p className="text-xs text-[#cfbeaf]">{quest.rejection_reason}</p>
                          </div>
                        )}

                        {/* 審査ボタン（pendingのみ） */}
                        {quest.status === 'pending' && (
                          <div className="space-y-3 pt-2 border-t border-[rgba(139,115,85,0.2)]">
                            {actionError && isReviewing && (
                              <div className="p-2 bg-red-950/50 border border-red-500/50 rounded-sm flex items-start gap-2 text-red-400 text-xs font-bold">
                                <AlertCircle size={12} className="mt-0.5" />
                                <p>{actionError}</p>
                              </div>
                            )}

                            {isReviewing ? (
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-[#cfbeaf]">リジェクト理由 <span className="text-red-500">*</span></label>
                                <textarea
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  className="w-full bg-[rgba(139,115,85,0.1)] border border-[rgba(139,115,85,0.3)] rounded-sm px-3 py-2 text-sm text-[#cfbeaf] outline-none focus:border-[var(--gold-dark)] min-h-[60px]"
                                  placeholder="リジェクトする理由を記載してください..."
                                />
                                <div className="flex gap-2">
                                  <button onClick={() => { setReviewingId(null); setRejectionReason(''); setActionError(null); }}
                                    className="flex-1 py-2 bg-[rgba(139,115,85,0.1)] border border-[rgba(139,115,85,0.3)] text-[#cfbeaf] font-bold text-xs rounded-sm"
                                  >
                                    キャンセル
                                  </button>
                                  <button onClick={() => handleReview(quest.id, 'reject')} disabled={actionLoading}
                                    className="flex-1 py-2 bg-red-900/80 text-red-200 font-bold text-xs rounded-sm hover:bg-red-800 transition-colors disabled:opacity-50"
                                  >
                                    {actionLoading ? '処理中...' : 'リジェクトする'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button onClick={() => handleReview(quest.id, 'approve')} disabled={actionLoading}
                                  className="flex-1 py-2 bg-emerald-900/80 text-emerald-200 font-bold text-xs rounded-sm hover:bg-emerald-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                                >
                                  <CheckCircle2 size={14} />
                                  {actionLoading ? '処理中...' : '承認する'}
                                </button>
                                <button onClick={() => { setReviewingId(quest.id); setActionError(null); }}
                                  className="flex-1 py-2 bg-red-900/80 text-red-200 font-bold text-xs rounded-sm hover:bg-red-800 transition-colors flex items-center justify-center gap-1"
                                >
                                  <XCircle size={14} />
                                  リジェクト
                                </button>
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
  );
}

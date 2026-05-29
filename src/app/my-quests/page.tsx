'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scroll, Clock, CheckCircle2, XCircle, AlertCircle,
  Users, Tag, Calendar, ChevronDown, ChevronUp, ArrowLeft, Plus,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Application {
  id: string;
  message: string | null;
  status: string;
  applied_at: string;
  applicant: { display_name: string; email: string };
}

interface MyQuest {
  id: string;
  title: string;
  description: string;
  quest_type: string;
  max_applicants: number;
  reward: string;
  tags: string[];
  status: string;
  rejection_reason: string | null;
  reviewed_at: string | null;
  reviewer: { display_name: string } | null;
  effective_end_date: string | null;
  created_at: string;
  applications: Application[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:  { label: '審査中',    color: '#f59e0b', icon: Clock },
  approved: { label: '承認済み',  color: '#10b981', icon: CheckCircle2 },
  rejected: { label: 'リジェクト', color: '#ef4444', icon: XCircle },
  closed:   { label: '終了',      color: '#6b7280', icon: XCircle },
};

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

  const filteredQuests = filter === 'all' ? quests : quests.filter(q => q.status === filter);

  const statusCounts = {
    all:      quests.length,
    pending:  quests.filter(q => q.status === 'pending').length,
    approved: quests.filter(q => q.status === 'approved').length,
    rejected: quests.filter(q => q.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen">
      {/* ページヘッダー */}
      <div className="bg-[var(--bg-card)] border-b-4 border-[var(--border-outer)] px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-xs text-[#8b7355] hover:text-[var(--gold-light)] transition-colors mb-4 font-bold"
          >
            <ArrowLeft size={14} />
            ホームへ戻る
          </button>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-[var(--bg-base)] border-2 border-[var(--border-outer)] shadow-[inset_2px_2px_0_rgba(0,0,0,0.15)]">
                <Scroll size={18} className="text-[var(--gold-light)]" />
              </div>
              <div>
                <h1 className="font-rpg font-black text-xl text-[var(--gold-light)]" style={{ textShadow: '2px 2px 0 var(--border-inner)' }}>
                  マイクエスト
                </h1>
                <p className="text-[10px] text-[#8b7355] font-bold">申請したクエストの一覧・応募者の確認</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/#quest-board')}
              className="flex items-center gap-1.5 px-3 py-2 bg-[var(--gold-dark)] text-white text-xs font-bold rounded-sm shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] hover:brightness-110 transition-all"
            >
              <Plus size={13} />
              <span className="hidden sm:inline">新しく申請</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* フィルター */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(key => {
            const cfg = key === 'all'
              ? { label: 'すべて', color: 'var(--gold)' }
              : STATUS_CONFIG[key];
            const Icon = key !== 'all' ? STATUS_CONFIG[key].icon : null;
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
                {Icon && <Icon size={11} />}
                {cfg.label}
                <span className="text-[10px] opacity-70">({statusCounts[key]})</span>
              </button>
            );
          })}
        </div>

        {/* リジェクト通知 */}
        {statusCounts.rejected > 0 && filter !== 'rejected' && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-950/40 border border-red-500/30 rounded-sm flex items-center gap-2 text-xs text-red-400 font-bold cursor-pointer hover:bg-red-950/60 transition-colors"
            onClick={() => setFilter('rejected')}
          >
            <AlertCircle size={14} className="flex-shrink-0" />
            リジェクトされたクエストが {statusCounts.rejected} 件あります。理由を確認してください。
          </motion.div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-[var(--gold-dark)] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-[#8b7355] text-sm">読み込み中...</p>
          </div>
        ) : filteredQuests.length === 0 ? (
          <div className="text-center py-20 rpg-card">
            <Scroll size={32} className="text-[#8b7355] mx-auto mb-4 opacity-40" />
            <p className="text-[#8b7355] text-sm font-bold">
              {filter === 'all' ? 'まだクエストを申請していません。' : `${STATUS_CONFIG[filter]?.label || ''}のクエストはありません。`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => router.push('/')}
                className="mt-4 px-4 py-2 bg-[var(--gold-dark)] text-white text-xs font-bold rounded-sm hover:brightness-110 transition-all shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)]"
              >
                クエストを申請する
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQuests.map((quest, i) => {
              const statusConf = STATUS_CONFIG[quest.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusConf.icon;
              const isExpanded = expandedId === quest.id;
              const newApplicants = quest.applications?.length ?? 0;

              return (
                <motion.div
                  key={quest.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rpg-card overflow-hidden"
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : quest.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className="flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-bold"
                            style={{ color: statusConf.color, background: `${statusConf.color}15`, border: `1px solid ${statusConf.color}30` }}
                          >
                            <StatusIcon size={10} />
                            {statusConf.label}
                          </span>
                          <span className="text-[10px] text-[#8b7355]">{quest.quest_type}</span>
                        </div>
                        <h3 className="text-sm font-bold text-[var(--gold-light)]">{quest.title}</h3>
                        <p className="text-[10px] text-[#8b7355] mt-1">
                          申請日: {new Date(quest.created_at).toLocaleDateString('ja-JP')}
                          {quest.reviewed_at && ` / 審査日: ${new Date(quest.reviewed_at).toLocaleDateString('ja-JP')}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {newApplicants > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-[var(--gold-dark)] text-white">
                            応募 {newApplicants}件
                          </span>
                        )}
                        {isExpanded
                          ? <ChevronUp size={16} className="text-[#8b7355]" />
                          : <ChevronDown size={16} className="text-[#8b7355]" />
                        }
                      </div>
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
                          <p className="text-xs text-[#cfbeaf] whitespace-pre-wrap leading-relaxed">{quest.description}</p>

                          <div className="flex flex-wrap gap-3">
                            <span className="text-[10px] text-[#cfbeaf] flex items-center gap-1">
                              <Users size={10} className="text-[var(--gold)]" />
                              応募: {newApplicants}/{quest.max_applicants}人
                            </span>
                            {quest.reward && (
                              <span className="text-[10px] text-[#cfbeaf] flex items-center gap-1">
                                <Tag size={10} className="text-[var(--gold)]" />
                                {quest.reward}
                              </span>
                            )}
                            {quest.effective_end_date && (
                              <span className="text-[10px] text-[#cfbeaf] flex items-center gap-1">
                                <Calendar size={10} className="text-[var(--gold)]" />
                                期限: {new Date(quest.effective_end_date).toLocaleDateString('ja-JP')}
                              </span>
                            )}
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
                              <p className="text-[10px] font-bold text-red-400 mb-1 flex items-center gap-1">
                                <XCircle size={11} /> リジェクト理由
                              </p>
                              <p className="text-xs text-[#cfbeaf]">{quest.rejection_reason}</p>
                              {quest.reviewer && (
                                <p className="text-[10px] text-[#8b7355] mt-2">
                                  審査者: {quest.reviewer.display_name}
                                </p>
                              )}
                            </div>
                          )}

                          {quest.applications && quest.applications.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-[var(--gold-light)] mb-2 flex items-center gap-1">
                                <Users size={12} />応募者一覧
                              </h4>
                              <div className="space-y-2">
                                {quest.applications.map(app => (
                                  <div key={app.id} className="p-3 bg-[rgba(0,0,0,0.2)] rounded-sm border border-[rgba(139,115,85,0.1)]">
                                    <div className="flex justify-between items-start">
                                      <p className="text-xs font-bold text-[#cfbeaf]">{app.applicant?.display_name || '不明'}</p>
                                      <p className="text-[10px] text-[#8b7355]">{new Date(app.applied_at).toLocaleDateString('ja-JP')}</p>
                                    </div>
                                    {app.message && (
                                      <p className="text-[10px] text-[#cfbeaf] mt-2 bg-[rgba(139,115,85,0.05)] p-2 rounded-sm leading-relaxed">
                                        {app.message}
                                      </p>
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

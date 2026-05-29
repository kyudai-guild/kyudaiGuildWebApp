'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scroll, Plus, Users, Tag, Calendar, Clock, MapPin, Send, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useGuild, Quest } from '@/contexts/GuildContext';
import CreateQuestModal from './CreateQuestModal';

const QUEST_TYPE_COLORS: Record<string, string> = {
  '仲間探し': '#3b82f6',
  '研究協力': '#8b5cf6',
  '業務委託': '#f59e0b',
  'ボランティア募集': '#10b981',
  '雇用契約': '#ec4899',
  'その他': '#94a3b8',
};

function QuestDetailModal({ quest, onClose }: { quest: Quest; onClose: () => void }) {
  const { isLoggedIn, member } = useGuild();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isCreator = member.id === quest.creator_id;
  const isFull = quest.application_count >= quest.max_applicants;
  const isExpired = quest.effective_end_date && new Date(quest.effective_end_date) < new Date();
  const typeColor = QUEST_TYPE_COLORS[quest.quest_type] || '#94a3b8';

  const handleApply = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quests/${quest.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '応募に失敗しました。');
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[var(--bg-card)] border-2 border-[var(--border-outer)] rounded-sm shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold" style={{ color: typeColor, background: `${typeColor}15`, border: `1px solid ${typeColor}30` }}>
              {quest.quest_type}
            </span>
            <h2 className="text-lg font-black text-[var(--gold-light)] mt-2">{quest.title}</h2>
            <p className="text-[10px] text-[#8b7355] mt-1">
              掲示者: {quest.creator?.display_name || '不明'} / {new Date(quest.created_at).toLocaleDateString('ja-JP')}
            </p>
          </div>
          <button onClick={onClose} className="text-[#8b7355] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-[rgba(0,0,0,0.2)] p-4 rounded-sm border border-[rgba(139,115,85,0.15)]">
            <p className="text-sm text-[#cfbeaf] whitespace-pre-wrap leading-relaxed">{quest.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-xs text-[#cfbeaf]">
              <Users size={14} className="text-[var(--gold)]" />
              <span>募集: {quest.application_count}/{quest.max_applicants}人</span>
            </div>
            {quest.reward && (
              <div className="flex items-center gap-2 text-xs text-[#cfbeaf]">
                <Tag size={14} className="text-[var(--gold)]" />
                <span>報酬: {quest.reward}</span>
              </div>
            )}
            {quest.effective_end_date && (
              <div className="flex items-center gap-2 text-xs text-[#cfbeaf]">
                <Calendar size={14} className="text-[var(--gold)]" />
                <span>期限: {new Date(quest.effective_end_date).toLocaleDateString('ja-JP')}</span>
              </div>
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

          {error && (
            <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-sm flex items-start gap-2 text-red-400 text-xs font-bold">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success ? (
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-sm text-center">
              <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-emerald-400 font-bold">応募が完了しました</p>
              <p className="text-[10px] text-[#8b7355] mt-1">掲示者からの連絡をお待ちください。</p>
            </div>
          ) : isLoggedIn && !isCreator && !isFull && !isExpired && (
            <div className="space-y-3 pt-2 border-t border-[rgba(139,115,85,0.2)]">
              <label className="text-xs font-bold text-[#cfbeaf] block">応募メッセージ（任意）</label>
              <textarea
                value={message} onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-[rgba(139,115,85,0.1)] border border-[rgba(139,115,85,0.3)] rounded-sm px-3 py-2 text-sm text-[#cfbeaf] outline-none focus:border-[var(--gold-dark)] min-h-[60px]"
                placeholder="自己紹介やアピールなど..."
              />
              <button onClick={handleApply} disabled={loading}
                className="w-full py-3 bg-[var(--gold-dark)] text-white font-black text-sm rounded-sm hover:brightness-110 transition-all shadow-[inset_0_-3px_0_rgba(0,0,0,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={16} />
                {loading ? '応募中...' : 'この依頼に応募する'}
              </button>
            </div>
          )}

          {isFull && !success && (
            <div className="py-3 text-center text-xs font-bold text-[#8b7355] border border-[rgba(139,115,85,0.2)] rounded-sm bg-[rgba(0,0,0,0.2)]">
              定員に達しました
            </div>
          )}

          {isExpired && !success && (
            <div className="py-3 text-center text-xs font-bold text-red-400 border border-red-500/20 rounded-sm bg-red-950/20">
              掲示期間が終了しました
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export const QuestBoard: React.FC = () => {
  const { quests, isLoggedIn } = useGuild();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

  // 承認済みクエストのみ（APIが返すものをそのまま使う）
  const approvedQuests = quests.filter(q => q.status === 'approved');

  return (
    <section className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Scroll className="text-[var(--gold)]" size={20} />
          <h2 className="text-lg font-rpg font-bold text-[var(--gold-light)]">受注可能クエスト</h2>
        </div>
        {isLoggedIn && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--gold-dark)] text-white text-xs font-bold rounded-sm shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] hover:brightness-110 transition-all active:translate-y-px active:shadow-none"
          >
            <Plus size={14} />
            クエストを申請
          </button>
        )}
      </div>

      <CreateQuestModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <div className="space-y-3">
        {approvedQuests.length === 0 ? (
          <div className="text-center py-20 rpg-card">
            <Scroll size={32} className="text-[#8b7355] mx-auto mb-4 opacity-40" />
            <p className="text-[#8b7355] text-sm font-bold">現在、冒険者ギルドに依頼は届いていないようだ...</p>
            {isLoggedIn && (
              <p className="text-[#8b7355] text-xs mt-2 opacity-60">（新しいクエストを申請してみよう）</p>
            )}
          </div>
        ) : (
          approvedQuests.map((quest, i) => {
            const typeColor = QUEST_TYPE_COLORS[quest.quest_type] || '#94a3b8';
            const isFull = quest.application_count >= quest.max_applicants;

            return (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rpg-card p-4 cursor-pointer"
                onClick={() => setSelectedQuest(quest)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-sm flex items-center justify-center mt-0.5"
                    style={{ background: `${typeColor}15`, border: `1px solid ${typeColor}30` }}
                  >
                    <Users size={16} style={{ color: typeColor }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="text-sm font-bold text-[var(--gold-light)]">{quest.title}</h4>
                      <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: isFull ? '#8b7355' : typeColor }}>
                        {quest.application_count}/{quest.max_applicants}人
                      </span>
                    </div>
                    <p className="text-xs text-[#cfbeaf] mb-2 line-clamp-2">{quest.description}</p>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold"
                        style={{ color: typeColor, background: `${typeColor}15`, border: `1px solid ${typeColor}30` }}
                      >
                        {quest.quest_type}
                      </span>
                      {quest.reward && (
                        <span className="text-[10px] text-[#cfbeaf] flex items-center gap-1">
                          <Tag size={9} className="text-[var(--gold)]" />
                          {quest.reward}
                        </span>
                      )}
                      {quest.tags?.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] text-[#8b7355]">#{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {isFull && (
                  <div className="mt-2 py-1 text-center text-[10px] font-bold text-[#8b7355] border border-[rgba(139,115,85,0.2)] rounded-sm bg-[rgba(0,0,0,0.15)]">
                    定員に達しました
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {selectedQuest && (
          <QuestDetailModal quest={selectedQuest} onClose={() => setSelectedQuest(null)} />
        )}
      </AnimatePresence>
    </section>
  );
};

export default QuestBoard;

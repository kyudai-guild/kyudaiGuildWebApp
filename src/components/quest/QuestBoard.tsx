'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, Users, Tag, Calendar, X, AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { useGuild, Quest } from '@/contexts/GuildContext';
import CreateQuestModal from './CreateQuestModal';

const CATEGORIES = ['すべて', '仲間探し', '研究協力', '業務委託', 'ボランティア募集', '雇用契約', 'その他'];

const CATEGORY_STYLE: Record<string, { color: string; bg: string }> = {
  '仲間探し':     { color: '#2563eb', bg: '#eff6ff' },
  '研究協力':     { color: '#7c3aed', bg: '#f5f3ff' },
  '業務委託':     { color: '#d97706', bg: '#fffbeb' },
  'ボランティア募集': { color: '#059669', bg: '#ecfdf5' },
  '雇用契約':     { color: '#db2777', bg: '#fdf2f8' },
  'その他':       { color: '#6b7280', bg: '#f9fafb' },
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
  const catStyle = CATEGORY_STYLE[quest.quest_type] || CATEGORY_STYLE['その他'];

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(15,10,5,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl shadow-xl p-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-5">
          <div className="flex-1 min-w-0 pr-4">
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: catStyle.color, background: catStyle.bg }}>
              {quest.quest_type}
            </span>
            <h2 className="mt-2 text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{quest.title}</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              掲示者: {quest.creator?.display_name || '不明'} / {new Date(quest.created_at).toLocaleDateString('ja-JP')}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-tertiary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          ><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-base)', border: '1px solid var(--color-border)' }}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>{quest.description}</p>
          </div>

          <div className="flex flex-wrap gap-4">
            <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <Users size={14} style={{ color: 'var(--color-primary)' }} />
              {quest.application_count}/{quest.max_applicants}人
            </span>
            {quest.reward && (
              <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <Tag size={14} style={{ color: 'var(--color-accent)' }} />
                {quest.reward}
              </span>
            )}
            {quest.effective_end_date && (
              <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <Calendar size={14} style={{ color: 'var(--color-text-tertiary)' }} />
                期限: {new Date(quest.effective_end_date).toLocaleDateString('ja-JP')}
              </span>
            )}
          </div>

          {quest.tags && quest.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {quest.tags.map(tag => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ color: 'var(--color-text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)' }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg text-sm font-medium" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              <AlertCircle size={14} className="mt-0.5 shrink-0" />{error}
            </div>
          )}

          {success ? (
            <div className="p-4 rounded-xl text-center" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <CheckCircle2 size={24} style={{ color: '#16a34a' }} className="mx-auto mb-2" />
              <p className="text-sm font-semibold" style={{ color: '#16a34a' }}>応募が完了しました</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>掲示者からの連絡をお待ちください。</p>
            </div>
          ) : isLoggedIn && !isCreator && !isFull && !isExpired ? (
            <div className="space-y-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <label className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)', display: 'block' }}>応募メッセージ（任意）</label>
              <textarea
                value={message} onChange={e => setMessage(e.target.value)}
                className="w-full text-sm rounded-xl px-4 py-3 resize-none outline-none transition-all"
                style={{ background: 'var(--bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', minHeight: 80 }}
                onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(26,74,58,0.1)'; }}
                onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                placeholder="自己紹介やアピールなど..."
              />
              <button onClick={handleApply} disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'var(--bg-dark)', color: 'var(--color-text-inverse)' }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; }}
              >
                <Send size={15} />{loading ? '応募中...' : 'この依頼に応募する'}
              </button>
            </div>
          ) : isFull && !success ? (
            <div className="py-3 text-center text-sm font-medium rounded-xl" style={{ background: 'var(--bg-secondary)', color: 'var(--color-text-tertiary)' }}>
              定員に達しました
            </div>
          ) : isExpired && !success ? (
            <div className="py-3 text-center text-sm font-medium rounded-xl" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              掲示期間が終了しました
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

const QuestBoard: React.FC = () => {
  const { quests, isLoggedIn } = useGuild();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('すべて');

  const approved = quests.filter(q => q.status === 'approved');
  const filtered = approved.filter(q => {
    const matchCat = category === 'すべて' || q.quest_type === category;
    const matchSearch = q.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <section id="quest-board">
      {/* Section Header */}
      <div className="mb-8">
        <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Quest Board
        </span>
        <div className="flex items-end justify-between gap-4">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '0.02em' }}>
            クエスト掲示板
          </h2>
          {isLoggedIn && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:-translate-y-px shrink-0"
              style={{ background: 'var(--bg-dark)', color: 'var(--color-text-inverse)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; }}
            >
              <Plus size={14} />依頼を出す
            </button>
          )}
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>すべての公開依頼を閲覧できます</p>
      </div>

      {/* Search + Filters */}
      <div className="mb-8 pb-8 space-y-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-tertiary)' }} />
          <input
            type="text" placeholder="クエストを探す..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
            onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(26,74,58,0.1)'; }}
            onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className="px-4 py-1.5 text-sm font-medium rounded-full border transition-all"
              style={category === cat
                ? { background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', borderColor: 'var(--bg-dark)' }
                : { background: 'var(--bg-card)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }
              }
            >{cat}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed" style={{ borderColor: 'var(--color-border-strong)' }}>
          <p className="text-base mb-4" style={{ color: 'var(--color-text-tertiary)' }}>
            {approved.length === 0 ? '現在公開中のクエストはありません。' : '条件に合うクエストが見つかりません。'}
          </p>
          {(search || category !== 'すべて') && (
            <button onClick={() => { setSearch(''); setCategory('すべて'); }}
              className="text-sm font-semibold px-5 py-2 rounded-full border transition-all"
              style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
            >フィルタをリセット</button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {filtered.map((quest, i) => {
              const catStyle = CATEGORY_STYLE[quest.quest_type] || CATEGORY_STYLE['その他'];
              const isFull = quest.application_count >= quest.max_applicants;
              return (
                <article
                  key={quest.id}
                  onClick={() => setSelectedQuest(quest)}
                  className="animate-fade-in-up rounded-2xl p-5 sm:p-6 cursor-pointer relative overflow-hidden"
                  style={{
                    animationDelay: `${i * 80}ms`,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-card)',
                    transition: 'box-shadow 0.3s, transform 0.3s, border-color 0.3s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.boxShadow = 'var(--shadow-card-hover)';
                    el.style.transform = 'translateY(-2px)';
                    el.style.borderColor = 'var(--color-border-strong)';
                    const line = el.querySelector('.hover-line') as HTMLElement;
                    if (line) line.style.transform = 'scaleX(1)';
                    const title = el.querySelector('.card-title') as HTMLElement;
                    if (title) title.style.color = 'var(--color-primary)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.boxShadow = 'var(--shadow-card)';
                    el.style.transform = 'translateY(0)';
                    el.style.borderColor = 'var(--color-border)';
                    const line = el.querySelector('.hover-line') as HTMLElement;
                    if (line) line.style.transform = 'scaleX(0)';
                    const title = el.querySelector('.card-title') as HTMLElement;
                    if (title) title.style.color = 'var(--color-text-primary)';
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: catStyle.color, background: catStyle.bg }}>
                      {quest.quest_type}
                    </span>
                    <span className="text-xs font-medium" style={{ color: isFull ? 'var(--color-text-tertiary)' : catStyle.color }}>
                      {quest.application_count}/{quest.max_applicants}人
                    </span>
                  </div>

                  <h3 className="card-title text-base font-bold mb-2 leading-snug transition-colors" style={{ color: 'var(--color-text-primary)' }}>
                    {quest.title}
                  </h3>

                  <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                    {quest.description}
                  </p>

                  <div className="flex justify-between items-end pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide mb-0.5" style={{ color: 'var(--color-text-tertiary)' }}>依頼者</p>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{quest.creator?.display_name || '不明'}</p>
                    </div>
                    {quest.reward && (
                      <span className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>{quest.reward}</span>
                    )}
                  </div>

                  {isFull && (
                    <div className="mt-3 py-1.5 text-center text-xs font-medium rounded-lg" style={{ background: 'var(--bg-secondary)', color: 'var(--color-text-tertiary)' }}>
                      定員に達しました
                    </div>
                  )}

                  <div className="hover-line absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl" style={{ background: catStyle.color, transform: 'scaleX(0)', transformOrigin: 'left', transition: 'transform 0.5s cubic-bezier(0.4,0,0,1)' }} />
                </article>
              );
            })}
          </div>
          <p className="mt-6 text-right text-sm font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{filtered.length} 件のクエスト</p>
        </>
      )}

      <CreateQuestModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      <AnimatePresence>
        {selectedQuest && <QuestDetailModal quest={selectedQuest} onClose={() => setSelectedQuest(null)} />}
      </AnimatePresence>
    </section>
  );
};

export default QuestBoard;

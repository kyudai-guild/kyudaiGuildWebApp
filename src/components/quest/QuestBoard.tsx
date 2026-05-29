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
      <div style={{ marginBottom: '2rem' }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Quest Board
        </span>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '0.02em' }}>
            クエスト掲示板
          </h2>
          {isLoggedIn && (
            <button
              onClick={() => setModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 600, padding: '0.625rem 1.25rem', borderRadius: '9999px', background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', flexShrink: 0, transition: 'background 0.2s, transform 0.2s', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              <Plus size={14} />依頼を出す
            </button>
          )}
        </div>
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>すべての公開依頼を閲覧できます</p>
      </div>

      {/* Search + Filters */}
      <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Search */}
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-tertiary)' }} />
          <input
            type="text" placeholder="クエストを探す..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              fontSize: '0.875rem',
              paddingLeft: '2.5rem',
              paddingRight: '1rem',
              paddingTop: '0.625rem',
              paddingBottom: '0.625rem',
              borderRadius: '0.75rem',
              outline: 'none',
              background: 'var(--bg-card)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,74,58,0.1)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>
        {/* Category Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              style={{
                padding: '0.375rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                borderRadius: '9999px',
                border: '1px solid',
                transition: 'all 0.2s',
                cursor: 'pointer',
                ...(category === cat
                  ? { background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', borderColor: 'var(--bg-dark)' }
                  : { background: 'var(--bg-card)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }
                ),
              }}
              onMouseEnter={e => { if (category !== cat) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-strong)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; } }}
              onMouseLeave={e => { if (category !== cat) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; } }}
            >{cat}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: '1rem', border: '1px dashed var(--color-border-strong)' }}>
          <p style={{ fontSize: '1rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
            {approved.length === 0 ? '現在公開中のクエストはありません。' : '条件に合うクエストが見つかりません。'}
          </p>
          {(search || category !== 'すべて') && (
            <button onClick={() => { setSearch(''); setCategory('すべて'); }}
              style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0.5rem 1.25rem', borderRadius: '9999px', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-inverse)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; }}
            >フィルタをリセット</button>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {filtered.map((quest, i) => {
              const catStyle = CATEGORY_STYLE[quest.quest_type] || CATEGORY_STYLE['その他'];
              const isFull = quest.application_count >= quest.max_applicants;
              return (
                <article
                  key={quest.id}
                  onClick={() => setSelectedQuest(quest)}
                  className="animate-fade-in-up"
                  style={{
                    animationDelay: `${i * 80}ms`,
                    borderRadius: '1rem',
                    padding: '1.25rem 1.5rem',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '9999px', color: catStyle.color, background: catStyle.bg }}>
                      {quest.quest_type}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: isFull ? 'var(--color-text-tertiary)' : catStyle.color }}>
                      {quest.application_count}/{quest.max_applicants}人
                    </span>
                  </div>

                  <h3 className="card-title" style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.4, color: 'var(--color-text-primary)', transition: 'color 0.2s' }}>
                    {quest.title}
                  </h3>

                  <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {quest.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                    <div>
                      <p style={{ fontSize: '0.625rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem', color: 'var(--color-text-tertiary)' }}>依頼者</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{quest.creator?.display_name || '不明'}</p>
                    </div>
                    {quest.reward && (
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-accent)' }}>{quest.reward}</span>
                    )}
                  </div>

                  {isFull && (
                    <div style={{ marginTop: '0.75rem', padding: '0.375rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 500, borderRadius: '0.5rem', background: 'var(--bg-secondary)', color: 'var(--color-text-tertiary)' }}>
                      定員に達しました
                    </div>
                  )}

                  <div className="hover-line" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: catStyle.color, transform: 'scaleX(0)', transformOrigin: 'left', transition: 'transform 0.5s cubic-bezier(0.4,0,0,1)' }} />
                </article>
              );
            })}
          </div>
          <p style={{ marginTop: '1.5rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>{filtered.length} 件のクエスト</p>
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

'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, X, AlertCircle, CheckCircle2, Send, Calendar, MapPin, Wallet, Clock } from 'lucide-react';
import { useGuild, Quest } from '@/contexts/GuildContext';
import CreateQuestModal from './CreateQuestModal';
import OrgBadge from './OrgBadge';
import QuestDetails from './QuestDetails';
import { fmtSessionsShort, daysUntil, fmtDateJa } from '@/lib/quest-form';

const CATEGORIES = ['すべて', '仲間探し', '研究協力', '業務委託', 'ボランティア募集', '雇用契約', 'その他'];

const CATEGORY_STYLE: Record<string, { color: string; bg: string }> = {
  '仲間探し':     { color: '#2563eb', bg: '#eff6ff' },
  '研究協力':     { color: '#7c3aed', bg: '#f5f3ff' },
  '業務委託':     { color: '#d97706', bg: '#fffbeb' },
  'ボランティア募集': { color: '#059669', bg: '#ecfdf5' },
  '雇用契約':     { color: '#db2777', bg: '#fdf2f8' },
  'その他':       { color: '#6b7280', bg: '#f9fafb' },
};

/** 申込の締切の表示。近いほど目立たせる */
function deadlineLabel(date: string | null | undefined): { text: string; color: string } | null {
  const d = daysUntil(date);
  if (d === null || d < 0 || !date) return null;
  if (d === 0) return { text: '今日が申込の締切', color: '#dc2626' };
  if (d <= 3) return { text: `申込の締切まであと${d}日`, color: '#dc2626' };
  if (d <= 7) return { text: `申込の締切まであと${d}日`, color: '#d97706' };
  return { text: `申込の締切 ${fmtDateJa(date)}`, color: 'var(--color-text-tertiary)' };
}

/* クエストの詳細。スマホでは下から出るシートにし、応募の操作を常に画面の下に置く
   （詳細は長いので、一番下までスクロールしないと応募ボタンが出てこない状態を避ける） */
const DETAIL_STYLES = `
  .qd-overlay { align-items: center; padding: 1rem; }
  .qd-panel { max-height: 88dvh; border-radius: 1.25rem; }
  @media (max-width: 560px) {
    .qd-overlay { align-items: flex-end; padding: 0; }
    .qd-panel { max-height: 92dvh; border-radius: 1.25rem 1.25rem 0 0; }
  }
`;

function QuestDetailModal({ quest, onClose }: { quest: Quest; onClose: () => void }) {
  const { isLoggedIn, member } = useGuild();
  const [message, setMessage] = useState('');
  const [composing, setComposing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isCreator = member.id === quest.creator_id;
  // 定員は「承認した人数」で数える（見送った応募は枠を消費しない）
  const isFull = (quest.accepted_count ?? 0) >= quest.max_applicants;
  const isExpired = quest.effective_end_date && new Date(quest.effective_end_date) < new Date();
  const canApply = isLoggedIn && !isCreator && !isFull && !isExpired;
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
      setComposing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const primaryBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', borderRadius: '0.75rem', fontSize: '0.9375rem', fontWeight: 700, background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', border: 'none', cursor: 'pointer' };
  const hasFooter = success || canApply || isFull || isExpired;

  return (
    <div className="qd-overlay"
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'center', background: 'rgba(15,10,5,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <style>{DETAIL_STYLES}</style>
      <motion.div className="qd-panel"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.2 }}
        style={{ position: 'relative', width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: '0 12px 40px rgba(31,20,15,0.12)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 閉じるボタンはスクロールしても常に見える位置に置く */}
        <button onClick={onClose} aria-label="閉じる"
          style={{ position: 'absolute', top: '0.625rem', right: '0.625rem', zIndex: 2, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9999, cursor: 'pointer', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.92)', border: 'none', boxShadow: 'var(--shadow-sm)' }}
        ><X size={18} /></button>

        {/* 本文（ここだけスクロールする） */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem', paddingRight: '2.5rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '9999px', color: catStyle.color, background: catStyle.bg }}>
              {quest.quest_type}
            </span>
            <h2 style={{ marginTop: '0.5rem', fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>{quest.title}</h2>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--color-text-tertiary)' }}>
              掲示者: {quest.creator?.display_name || '不明'} / {new Date(quest.created_at).toLocaleDateString('ja-JP')}
            </p>
            {/* どの団体からの依頼か。個人の依頼では何も出さない */}
            {(quest.organization_name || quest.organization?.name) && (
              <div style={{ marginTop: '0.5rem' }}>
                <OrgBadge name={quest.organization_name ?? quest.organization?.name} />
              </div>
            )}
          </div>

          {/* 依頼書の内容。報酬は廃止。連絡先は依頼者が書いた「問い合わせ先」だけを出す
              （以前は九大メールを自動で出していたが、掲示者本人には見えず混乱のもとだった） */}
          <QuestDetails quest={quest} contactPreviewForCreator={isCreator} />
        </div>

        {/* 応募の操作（常に下に出す） */}
        {hasFooter && (
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem', padding: '0.875rem 1.25rem 1rem', borderTop: '1px solid var(--color-border)', background: 'var(--bg-card)' }}>
            {error && (
              <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.625rem 0.875rem', borderRadius: '0.75rem', fontSize: '0.8125rem', fontWeight: 500, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />{error}
              </div>
            )}

            {success ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <CheckCircle2 size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span>
                  <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#16a34a' }}>応募が完了しました</span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>承認されるとトークで連絡が取れるようになります。</span>
                </span>
              </div>
            ) : canApply && !composing ? (
              <button onClick={() => setComposing(true)} style={primaryBtn}>
                <Send size={15} />このクエストに応募する
              </button>
            ) : canApply ? (
              <>
                <label htmlFor="apply-message" style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  応募メッセージ（任意）
                </label>
                <textarea id="apply-message" autoFocus
                  value={message} onChange={e => setMessage(e.target.value)}
                  style={{ width: '100%', fontSize: '0.875rem', borderRadius: '0.75rem', padding: '0.75rem 1rem', resize: 'none', outline: 'none', background: 'var(--bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', minHeight: 80, maxHeight: '30dvh', boxSizing: 'border-box', lineHeight: 1.6 }}
                  placeholder="参加してみたい理由など"
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => { setComposing(false); setError(null); }} disabled={loading}
                    style={{ flex: '0 0 auto', padding: '0.875rem 1.125rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                  >やめる</button>
                  <button onClick={handleApply} disabled={loading}
                    style={{ ...primaryBtn, flex: 1, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
                  ><Send size={15} />{loading ? '応募中...' : '応募を送る'}</button>
                </div>
              </>
            ) : isFull ? (
              <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, borderRadius: '0.75rem', background: 'var(--bg-secondary)', color: 'var(--color-text-tertiary)' }}>
                定員に達しました
              </div>
            ) : (
              <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: 500, borderRadius: '0.75rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                掲示期間が終了しました
              </div>
            )}
          </div>
        )}
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
  // 団体名や場所でも探せるようにする（「和太鼓」「伊都」などで引けるように）
  const needle = search.trim().toLowerCase();
  const filtered = approved.filter(q => {
    const matchCat = category === 'すべて' || q.quest_type === category;
    const haystack = [q.title, q.organization_name ?? q.organization?.name, q.location, q.description, ...(q.tags ?? [])]
      .filter(Boolean).join(' ').toLowerCase();
    return matchCat && (!needle || haystack.includes(needle));
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
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>団体の活動を、一日だけ体験できるクエストです</p>
      </div>

      {/* Search + Filters */}
      <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Search */}
        <div style={{ position: 'relative', maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-tertiary)' }} />
          <input
            type="search" enterKeyHint="search" placeholder="クエスト名・団体名・場所で探す"
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
              const isFull = (quest.accepted_count ?? 0) >= quest.max_applicants;
              const when = fmtSessionsShort(quest.sessions);
              const deadline = deadlineLabel(quest.listing_end_date);
              return (
                <article
                  key={quest.id}
                  onClick={() => setSelectedQuest(quest)}
                  className="animate-fade-in-up"
                  style={{
                    // 件数が多いと下の方のカードが何秒も透明のままになるので、遅らせるのは最初の数枚だけ
                    animationDelay: `${Math.min(i, 6) * 60}ms`,
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
                  // ホバーの演出はマウスのときだけ。タッチではタップ後に浮いたまま残ってしまう
                  onPointerEnter={e => {
                    if (e.pointerType !== 'mouse') return;
                    const el = e.currentTarget as HTMLElement;
                    el.style.boxShadow = 'var(--shadow-card-hover)';
                    el.style.transform = 'translateY(-2px)';
                    el.style.borderColor = 'var(--color-border-strong)';
                    const line = el.querySelector('.hover-line') as HTMLElement;
                    if (line) line.style.transform = 'scaleX(1)';
                    const title = el.querySelector('.card-title') as HTMLElement;
                    if (title) title.style.color = 'var(--color-primary)';
                  }}
                  onPointerLeave={e => {
                    if (e.pointerType !== 'mouse') return;
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
                      定員 {quest.accepted_count ?? 0}/{quest.max_applicants}人
                    </span>
                  </div>

                  <h3 className="card-title" style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.4, color: 'var(--color-text-primary)', transition: 'color 0.2s' }}>
                    {quest.title}
                  </h3>

                  {/* 一日体験の判断材料になる日時・場所・参加費を先に出す。
                      旧形式（日程の無い）クエストは従来どおり説明文を出す */}
                  {when ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Calendar size={12} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />{when}</span>
                      {quest.location && <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}><MapPin size={12} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />{quest.location}</span>}
                      {quest.participation_fee && <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Wallet size={12} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />参加費 {quest.participation_fee}</span>}
                      {deadline && !isFull && <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600, color: deadline.color }}><Clock size={12} style={{ flexShrink: 0 }} />{deadline.text}</span>}
                    </div>
                  ) : quest.description ? (
                    <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {quest.description}
                    </p>
                  ) : null}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.625rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem', color: 'var(--color-text-tertiary)' }}>主催</p>
                      {(quest.organization_name || quest.organization?.name) ? (
                        <div style={{ marginTop: '0.25rem' }}>
                          <OrgBadge name={quest.organization_name ?? quest.organization?.name} />
                        </div>
                      ) : (
                        // 団体必須化より前の旧形式のクエストは掲示者名を出す
                        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{quest.creator?.display_name || '不明'}</p>
                      )}
                    </div>
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

      {modalOpen && <CreateQuestModal isOpen onClose={() => setModalOpen(false)} />}

      <AnimatePresence>
        {selectedQuest && <QuestDetailModal quest={selectedQuest} onClose={() => setSelectedQuest(null)} />}
      </AnimatePresence>
    </section>
  );
};

export default QuestBoard;

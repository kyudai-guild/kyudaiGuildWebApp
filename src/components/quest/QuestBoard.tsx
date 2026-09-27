'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Plus, X, AlertCircle, CheckCircle2, Send, Calendar, MapPin, Wallet, Clock, Building2, Repeat, ChevronRight, ChevronUp } from 'lucide-react';
import { useGuild, Quest } from '@/contexts/GuildContext';
import CreateQuestModal from './CreateQuestModal';
import OrgBadge from './OrgBadge';
import QuestDetails from './QuestDetails';
import { daysUntil, fmtDateJa, fmtWhen, isListingClosed, TBD_TEXT } from '@/lib/quest-form';
import { QUEST_TYPES, questTypeStyle, questFields } from '@/lib/quest-types';

/* 種別の絞り込み。スマホでは折り返さず横にスクロールさせる（種別が多く、何行にもなるため） */
const FILTER_STYLES = `
  .qb-search-row { display: flex; gap: 0.625rem; align-items: stretch; }
  .qb-search-row > .qb-search { flex: 1 1 auto; max-width: 400px; position: relative; }
  .qb-search-row > .qb-org { flex: 0 1 260px; position: relative; }
  @media (max-width: 640px) {
    .qb-search-row { flex-direction: column; }
    .qb-search-row > .qb-search, .qb-search-row > .qb-org { max-width: none; flex: 1 1 auto; }
  }
  .qb-cats { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  /* 常設クエストの列。画面の端まで流して「まだ続く」ことを見せる */
  .qb-ongoing-rail { display: flex; gap: 0.75rem; overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x proximity; padding-bottom: 0.5rem; scrollbar-width: thin; }
  .qb-ongoing-rail > * { flex: 0 0 auto; width: 260px; scroll-snap-align: start; }
  @media (max-width: 640px) {
    .qb-ongoing-rail { margin: 0 -1rem; padding-left: 1rem; padding-right: 1rem; }
    .qb-ongoing-rail > * { width: 230px; }
  }
  .qb-cats > button { flex-shrink: 0; white-space: nowrap; }
  @media (max-width: 640px) {
    .qb-cats { flex-wrap: nowrap; overflow-x: auto; margin: 0 -1rem; padding: 0 1rem 0.25rem; scrollbar-width: none; }
    .qb-cats::-webkit-scrollbar { display: none; }
  }
`;

/** クエストの分野のバッジ（複数）。1つ目が主な分野 */
function FieldBadges({ quest, size = 'md' }: { quest: Quest; size?: 'sm' | 'md' }) {
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '0.25rem' }}>
      {questFields(quest).map(label => {
        const c = questTypeStyle(label);
        return (
          <span key={label} style={{ display: 'inline-flex', alignItems: 'center', fontSize: size === 'sm' ? '0.6875rem' : '0.75rem', fontWeight: 700, padding: size === 'sm' ? '0.1875rem 0.5rem' : '0.25rem 0.625rem', borderRadius: '9999px', color: c.color, background: c.bg }}>
            {label}
          </span>
        );
      })}
    </span>
  );
}

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
  const isFull = quest.max_applicants != null && (quest.accepted_count ?? 0) >= quest.max_applicants;
  const isExpired = isListingClosed(quest);
  const canApply = isLoggedIn && !isCreator && !isFull && !isExpired;
  const catStyle = questTypeStyle(quest.quest_type);

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
            <FieldBadges quest={quest} />
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
  const [orgFilter, setOrgFilter] = useState('');   // 空 = すべての団体

  const approved = quests.filter(q => q.status === 'approved' && !isListingClosed(q));
  const [showAllOngoing, setShowAllOngoing] = useState(false);
  const orgOf = (q: Quest) => q.organization_name ?? q.organization?.name ?? '';
  const matchField = (q: Quest) => category === 'すべて' || questFields(q).includes(category);
  const matchOrg = (q: Quest) => !orgFilter || orgOf(q) === orgFilter;

  // 分野の候補: 選んでいる団体の中で、掲示中のクエストがある分野だけ（押して0件、を避ける）
  const inOrg = approved.filter(matchOrg);
  const fieldCounts = QUEST_TYPES
    .map(t => ({ label: t.label, n: inOrg.filter(q => questFields(q).includes(t.label)).length }))
    .filter(t => t.n > 0 || t.label === category);
  const categories = [{ label: 'すべて', n: inOrg.length }, ...fieldCounts];

  // 団体の候補: 選んでいる分野の中で、掲示中のクエストがある団体（件数の多い順）。
  // 団体が増えてもボタンが並ばないよう、プルダウンにする
  const orgCounts = new Map<string, number>();
  for (const q of approved.filter(matchField)) {
    const name = orgOf(q);
    if (name) orgCounts.set(name, (orgCounts.get(name) ?? 0) + 1);
  }
  if (orgFilter && !orgCounts.has(orgFilter)) orgCounts.set(orgFilter, 0);
  const orgOptions = [...orgCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja'));

  // 団体名や場所でも探せるようにする（「和太鼓」「伊都」などで引けるように）
  const needle = search.trim().toLowerCase();
  const filtered = approved.filter(q => {
    const haystack = [q.title, orgOf(q), q.location, q.description, ...questFields(q), ...(q.tags ?? [])]
      .filter(Boolean).join(' ').toLowerCase();
    return matchField(q) && matchOrg(q) && (!needle || haystack.includes(needle));
  });
  const filtering = !!search || category !== 'すべて' || !!orgFilter;
  const resetFilters = () => { setSearch(''); setCategory('すべて'); setOrgFilter(''); };

  // クエストのカード（通常の一覧と、常設クエストを「すべて見る」ときの一覧で使う）
  const renderCard = (quest: Quest, i: number) => {
    const catStyle = questTypeStyle(quest.quest_type);
    const isFull = quest.max_applicants != null && (quest.accepted_count ?? 0) >= quest.max_applicants;
    const when = fmtWhen(quest);
    const deadline = quest.is_ongoing ? null : deadlineLabel(quest.listing_end_date);
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
            <FieldBadges quest={quest} size="sm" />
            <span style={{ fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap', color: isFull ? 'var(--color-text-tertiary)' : catStyle.color }}>
              {quest.is_ongoing ? '随時募集' : quest.max_applicants ? `定員 ${quest.accepted_count ?? 0}/${quest.max_applicants}人` : '定員なし'}
            </span>
          </div>

          <h3 className="card-title" style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.4, color: 'var(--color-text-primary)', transition: 'color 0.2s' }}>
            {quest.title}
          </h3>

          {/* 一日体験の判断材料になる日時・場所・参加費を先に出す。日程・場所が未定なら「未定」と出す */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '1rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Calendar size={12} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />{when}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}><MapPin size={12} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />{quest.location || TBD_TEXT}</span>
              {quest.participation_fee && <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Wallet size={12} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />参加費 {quest.participation_fee}</span>}
              {deadline && !isFull && <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600, color: deadline.color }}><Clock size={12} style={{ flexShrink: 0 }} />{deadline.text}</span>}
            </div>

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
  };

  // 常設クエストの小さなカード（横スクロールの列用）
  const renderOngoingCard = (quest: Quest) => {
    const c = questTypeStyle(quest.quest_type);
    return (
      <button key={quest.id} onClick={() => setSelectedQuest(quest)}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left', padding: '0.875rem 1rem', borderRadius: '0.875rem', cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)', borderTop: `3px solid ${c.color}` }}>
        <FieldBadges quest={quest} size="sm" />
        <span style={{ fontSize: '0.9375rem', fontWeight: 700, lineHeight: 1.4, color: 'var(--color-text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{quest.title}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
          <Repeat size={12} style={{ color: c.color, flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{quest.schedule_note || '随時募集'}</span>
        </span>
        {(quest.organization_name || quest.organization?.name) && <OrgBadge name={quest.organization_name ?? quest.organization?.name} />}
      </button>
    );
  };

  const ongoing = filtered.filter(q => q.is_ongoing);
  const dated = filtered.filter(q => !q.is_ongoing);
  const sectionTitle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' };
  const countBadge: React.CSSProperties = { fontSize: '0.75rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: 9999, background: 'var(--bg-secondary)', color: 'var(--color-text-secondary)' };

  return (
    <section id="quest-board">
      {/* Section Header */}
      <div style={{ marginBottom: '2rem' }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          Quest Board
        </span>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 6vw, 2rem)', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
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
        <style>{FILTER_STYLES}</style>
        {/* 検索と団体の絞り込み */}
        <div className="qb-search-row">
        <div className="qb-search">
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
        {orgOptions.length > 0 && (
          <div className="qb-org">
            <Building2 size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: orgFilter ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }} />
            <select value={orgFilter} onChange={e => setOrgFilter(e.target.value)} aria-label="団体で絞り込む"
              style={{ width: '100%', height: '100%', minHeight: 42, fontSize: '0.875rem', paddingLeft: '2.375rem', paddingRight: '0.75rem', borderRadius: '0.75rem', outline: 'none', cursor: 'pointer',
                background: orgFilter ? '#f2f7f4' : 'var(--bg-card)', border: `1px solid ${orgFilter ? '#cfe3d8' : 'var(--color-border)'}`,
                color: orgFilter ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontWeight: orgFilter ? 700 : 400 }}>
              <option value="">すべての団体</option>
              {orgOptions.map(([name, n]) => <option key={name} value={name}>{name}（{n}）</option>)}
            </select>
          </div>
        )}
        </div>
        {/* 分野の絞り込み */}
        <div className="qb-cats">
          {categories.map(({ label: cat, n }) => (
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
            >{cat}<span style={{ marginLeft: '0.25rem', fontSize: '0.75rem', opacity: 0.6 }}>{n}</span></button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: '1rem', border: '1px dashed var(--color-border-strong)' }}>
          <p style={{ fontSize: '1rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
            {approved.length === 0 ? '現在公開中のクエストはありません。' : '条件に合うクエストが見つかりません。'}
          </p>
          {filtering && (
            <button onClick={resetFilters}
              style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0.5rem 1.25rem', borderRadius: '9999px', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-inverse)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; }}
            >絞り込みを解除</button>
          )}
        </div>
      ) : (
        <>
          {/* 常設クエスト（期限なし・随時募集）。通常の一覧と混ぜると、ずっと上に残り続けて
              期間限定のクエストが埋もれるので別の枠にする。横に流す1列にして縦の場所を取らず、
              「すべて見る」で一覧に広げられるようにする */}
          {ongoing.length > 0 && (
            <section aria-label="常設クエスト" style={{ marginBottom: '2rem', padding: '1rem 1rem 0.75rem', borderRadius: '1rem', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={sectionTitle}><Repeat size={16} style={{ color: 'var(--color-primary)' }} />いつでも参加できる常設クエスト<span style={{ ...countBadge, background: 'var(--bg-card)' }}>{ongoing.length}</span></h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.125rem' }}>締切がなく、継続して参加者を募集しています</p>
                </div>
                {ongoing.length > 1 && (
                  <button onClick={() => setShowAllOngoing(v => !v)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0' }}>
                    {showAllOngoing ? <>たたむ<ChevronUp size={14} /></> : <>すべて見る<ChevronRight size={14} /></>}
                  </button>
                )}
              </div>
              {showAllOngoing ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', paddingBottom: '0.5rem' }}>
                  {ongoing.map((q, i) => renderCard(q, i))}
                </div>
              ) : (
                <div className="qb-ongoing-rail">{ongoing.map(renderOngoingCard)}</div>
              )}
            </section>
          )}

          {dated.length > 0 && (
            <>
              {ongoing.length > 0 && (
                <h3 style={{ ...sectionTitle, marginBottom: '1rem' }}><Calendar size={16} style={{ color: 'var(--color-primary)' }} />日程のあるクエスト<span style={countBadge}>{dated.length}</span></h3>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {dated.map((q, i) => renderCard(q, i))}
              </div>
            </>
          )}
          <p style={{ marginTop: '1.5rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>
            {filtered.length} 件のクエスト{ongoing.length > 0 && `（うち常設 ${ongoing.length}件）`}
            {filtering && <button onClick={resetFilters} style={{ marginLeft: '0.75rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>絞り込みを解除</button>}
          </p>
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

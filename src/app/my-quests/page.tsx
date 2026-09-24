'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Scroll, XCircle, AlertCircle, Users, Tag, Calendar, ChevronDown, ChevronUp, ArrowLeft, Plus, CheckCircle2, Heart, UserRound, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGuild } from '@/contexts/GuildContext';
import { MY_QUEST_STATUS as STATUS } from '@/components/quest/status';
import UserProfileModal from '@/components/member/UserProfileModal';
import ThanksModal from '@/components/quest/ThanksModal';
import OrgBadge from '@/components/quest/OrgBadge';
import QuestDetails from '@/components/quest/QuestDetails';
import type { QuestSession, ScheduleRow } from '@/lib/quest-form';
import { CardListSkeleton, SkeletonStyles } from '@/components/ui/Skeleton';
import { readCache, writeCache } from '@/lib/client-cache';

const POSTED_CACHE = 'my-quests-posted';
const CACHE_MAX_AGE = 3 * 60 * 1000;

interface Application {
  id: string; message: string | null; status: string; applied_at: string;
  applicant_id: string;
  applicant: { display_name: string };
}
interface MyQuest {
  id: string; title: string; description: string; quest_type: string;
  max_applicants: number; tags: string[]; status: string;
  rejection_reason: string | null; reviewed_at: string | null;
  reviewer: { display_name: string } | null;
  effective_end_date: string | null; created_at: string;
  organization_name: string | null;
  organization: { id: string; name: string; is_active: boolean } | null;
  // 依頼書の項目（v19）
  sessions?: QuestSession[]; location?: string | null; participation_fee?: string | null;
  belongings?: string | null; schedule?: ScheduleRow[]; requirements?: string | null;
  org_intro?: string | null; appeal?: string | null; photo_path?: string | null;
  preferred_contact?: string | null; listing_end_date?: string | null;
  // 掲示しない担当者情報。掲示した本人にだけ返る（RLS）。1対1の埋め込みなので配列で来ることもある
  private_details?: { receiver_name: string; receiver_contact: string } | { receiver_name: string; receiver_contact: string }[] | null;
  applications: Application[];
}
interface AppliedItem {
  id: string; status: string; applied_at: string;
  quest: {
    id: string; title: string; quest_type: string; status: string; organization_name: string | null;
    completed_at: string | null; preferred_contact: string | null;
    creator: { display_name: string } | null;
  } | null;
}

const APP_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: '検討中',     color: '#d97706', bg: '#fffbeb' },
  accepted: { label: 'マッチ成立', color: '#059669', bg: '#ecfdf5' },
  rejected: { label: '見送り',     color: '#6b7280', bg: '#f9fafb' },
};

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
  // 操作したボタンはページの下の方にあることが多い。上に固定して、スクロールしていても見えるようにする
  alertBanner: { position: 'sticky', top: 'calc(var(--header-height) + 0.5rem)', zIndex: 20, boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' } as React.CSSProperties,
  spinner: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', textAlign: 'center', padding: '5rem 0' } as React.CSSProperties,
  emptyBox: { textAlign: 'center', padding: '4rem 2rem', borderRadius: '1rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)' } as React.CSSProperties,
  stack: { display: 'flex', flexDirection: 'column', gap: '0.75rem' } as React.CSSProperties,
  card: { borderRadius: '1rem', overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' } as React.CSSProperties,
  cardHeader: { padding: '1.25rem', cursor: 'pointer' } as React.CSSProperties,
  cardExpanded: { padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' } as React.CSSProperties,
  row: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' } as React.CSSProperties,
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: '0.375rem' } as React.CSSProperties,
  metaRow: { display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' } as React.CSSProperties,
  metaItem: { display: 'flex', alignItems: 'center', gap: '0.375rem' } as React.CSSProperties,
  rejectionBox: { padding: '1rem', borderRadius: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', marginTop: '0.75rem' } as React.CSSProperties,
  applicantCard: { padding: '1rem', borderRadius: '0.75rem', background: 'var(--bg-base)', border: '1px solid var(--color-border)' } as React.CSSProperties,
  // スマホで押しやすい高さ（36px）を確保する
  smallBtn: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, padding: '0.375rem 0.875rem', minHeight: 36, borderRadius: '9999px', cursor: 'pointer', border: '1px solid var(--color-border)', background: 'var(--bg-card)', color: 'var(--color-text-secondary)', transition: 'all 0.2s' } as React.CSSProperties,
  primarySmallBtn: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, padding: '0.375rem 0.875rem', minHeight: 36, borderRadius: '9999px', cursor: 'pointer', border: 'none', background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', transition: 'background 0.2s' } as React.CSSProperties,
};

export default function MyQuestsPage() {
  const router = useRouter();
  const { member } = useGuild();
  const [view, setView] = useState<'posted' | 'applied'>('posted');
  const [quests, setQuests] = useState<MyQuest[]>([]);
  const [appliedItems, setAppliedItems] = useState<AppliedItem[]>([]);
  const [appliedMore, setAppliedMore] = useState(false);
  const [loading, setLoading] = useState(true);
  // 「応募した依頼」は別に持つ。掲示側をキャッシュで先に描いたときに、
  // まだ取得中の応募一覧を「0件」と見せないため。
  const [appliedLoading, setAppliedLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [thanksTarget, setThanksTarget] = useState<{ questId: string; questTitle: string; recipientName: string; recipientId?: string } | null>(null);

  // writeCache 時点で最新のIDを読みたいので ref に持つ（依存配列を増やさない）
  const memberIdForCache = useRef<string | null>(null);

  const loadPosted = useCallback(() => {
    return fetch('/api/my-quests')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setQuests(data);
        writeCache(POSTED_CACHE, memberIdForCache.current, data);
      })
      .catch(() => {});
  }, []);
  const loadApplied = useCallback((offset = 0) => {
    return fetch(`/api/profile/history?role=applied&offset=${offset}`)
      .then(r => r.ok ? r.json() : { items: [], hasMore: false })
      .then(data => {
        setAppliedItems(prev => offset === 0 ? data.items : [...prev, ...data.items]);
        setAppliedMore(data.hasMore);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    loadPosted().finally(() => setLoading(false));
    loadApplied().finally(() => setAppliedLoading(false));
  }, [loadPosted, loadApplied]);

  // この画面を開いた＝リジェクトを実際に目にした、とみなして確認済みにする。
  // 以降ホーム画面のバナーには出ない。
  // 記録に失敗してもこの画面の表示には影響しないので、黙って見送る。
  useEffect(() => {
    fetch('/api/my-quests/seen', { method: 'POST' }).catch(() => {});
  }, []);

  // キャッシュは「誰のものか」が確定してから読む。自分の依頼は本人にしか
  // 見せてはいけないので、鍵にIDを必ず混ぜる。
  // 応募状況はキャッシュしない（承認待ちの件数がずれると判断を誤るため）。
  useEffect(() => {
    memberIdForCache.current = member.id;
    if (member.isVisitor) return;
    const cached = readCache<MyQuest[]>(POSTED_CACHE, member.id, CACHE_MAX_AGE);
    if (!cached) return;
    setQuests(prev => (prev.length > 0 ? prev : cached));
    setLoading(false);
  }, [member.id, member.isVisitor]);

  const reviewApplication = async (appId: string, action: 'accept' | 'reject', name?: string) => {
    // 見送りは取り消せない。「承認する」の隣にあり、スマホでは押し間違えやすい
    if (action === 'reject' && !confirm(`${name ?? 'この方'}さんの応募を見送りますか？\nこの操作は取り消せません。`)) return;
    setBusy(true); setActionError(null);
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.warning) setActionError(data.warning);
      await loadPosted();
    } catch (e: any) {
      setActionError(e.message || '操作に失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  const completeQuest = async (questId: string) => {
    if (!confirm('このクエストの完了を報告しますか？\n完了すると、掲示板から外れて新しい応募を受け付けなくなります。')) return;
    setBusy(true); setActionError(null);
    try {
      const res = await fetch(`/api/quests/${questId}/complete`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error);
      await loadPosted();
    } catch (e: any) {
      setActionError(e.message || '完了報告に失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  const sendThanks = async (message: string) => {
    if (!thanksTarget) return;
    const res = await fetch(`/api/quests/${thanksTarget.questId}/thanks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, recipient_id: thanksTarget.recipientId }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
  };

  const filtered = filter === 'all' ? quests : quests.filter(q => q.status === filter);
  const counts: Record<string, number> = {
    all: quests.length,
    pending: quests.filter(q => q.status === 'pending').length,
    approved: quests.filter(q => q.status === 'approved').length,
    completed: quests.filter(q => q.status === 'completed').length,
    rejected: quests.filter(q => q.status === 'rejected').length,
  };

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
      >{cfg.label}<span style={{ fontSize: '0.75rem', opacity: 0.6 }}>({counts[key]})</span></button>
    );
  };

  const appliedStatusBadge = (item: AppliedItem) => {
    const st = item.quest?.status === 'completed' && item.status === 'accepted'
      ? { label: '完了', color: '#0f766e', bg: '#f0fdfa' }
      : APP_STATUS[item.status] ?? APP_STATUS.pending;
    return <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '9999px', color: st.color, background: st.bg }}>{st.label}</span>;
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
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>依頼の管理・応募状況の確認</p>
              </div>
            </div>
            <button onClick={() => router.push('/#quest-board')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 600, padding: '0.625rem 1.25rem', borderRadius: '9999px', background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', cursor: 'pointer', transition: 'background 0.2s, transform 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            ><Plus size={14} />新しく申請</button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
            {([['posted', '掲示した依頼'], ['applied', '応募した依頼']] as const).map(([key, label]) => (
              <button key={key} onClick={() => setView(key)}
                style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0.5rem 1.25rem', borderRadius: '9999px', cursor: 'pointer', transition: 'all 0.2s',
                  background: view === key ? 'var(--bg-dark)' : 'var(--bg-base)',
                  color: view === key ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                  border: view === key ? '1px solid var(--bg-dark)' : '1px solid var(--color-border)' }}
              >{label}{key === 'applied' && appliedItems.length > 0 && <span style={{ fontSize: '0.75rem', opacity: 0.6 }}> ({appliedItems.length})</span>}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={S.content}>
        {actionError && (
          <div style={S.alertBanner} onClick={() => setActionError(null)}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />{actionError}（押すと閉じます）
          </div>
        )}

        {loading ? (
          <CardListSkeleton rows={3} lines={2} />
        ) : view === 'posted' ? (
          <>
            <div style={S.filterRow}>{(['all', 'pending', 'approved', 'completed', 'rejected'] as const).map(filterBtn)}</div>

            {counts.rejected > 0 && filter !== 'rejected' && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                style={S.alertBanner} onClick={() => setFilter('rejected')}
              ><AlertCircle size={14} style={{ flexShrink: 0 }} />リジェクトされたクエストが {counts.rejected} 件あります。理由を確認してください。</motion.div>
            )}

            {filtered.length === 0 ? (
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
                  const acceptedApps = (quest.applications ?? []).filter(a => a.status === 'accepted');
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
                              <OrgBadge
                                name={quest.organization_name ?? quest.organization?.name}
                                inactive={quest.organization?.is_active === false}
                              />
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
                              <QuestDetails
                                quest={{ ...quest, accepted_count: quest.applications.filter(a => a.status === 'accepted').length }}
                                privateDetails={Array.isArray(quest.private_details) ? quest.private_details[0] ?? null : quest.private_details ?? null}
                                contactPreviewForCreator
                              />
                              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', margin: '0.75rem 0 0' }}>
                                応募 {appCount}件{quest.effective_end_date ? ` ・ 掲示は${new Date(quest.effective_end_date).toLocaleDateString('ja-JP')}まで` : ''}
                              </p>
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
                                    {quest.applications.map(app => {
                                      const ast = APP_STATUS[app.status] ?? APP_STATUS.pending;
                                      return (
                                        <div key={app.id} style={S.applicantCard}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{app.applicant?.display_name || '不明'}</p>
                                              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: '9999px', color: ast.color, background: ast.bg }}>{ast.label}</span>
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{new Date(app.applied_at).toLocaleDateString('ja-JP')}</p>
                                          </div>
                                          {app.message && <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>{app.message}</p>}
                                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                                            <button style={S.smallBtn} onClick={() => setProfileUserId(app.applicant_id)}>
                                              <UserRound size={12} />プロフィールを見る
                                            </button>
                                            {quest.status === 'approved' && app.status === 'pending' && (
                                              <>
                                                <button style={S.primarySmallBtn} disabled={busy} onClick={() => reviewApplication(app.id, 'accept')}>
                                                  <CheckCircle2 size={12} />承認する
                                                </button>
                                                <button style={S.smallBtn} disabled={busy} onClick={() => reviewApplication(app.id, 'reject', app.applicant?.display_name)}>
                                                  <XCircle size={12} />見送る
                                                </button>
                                              </>
                                            )}
                                            {app.status === 'accepted' && (
                                              <button style={{ ...S.smallBtn, color: 'var(--color-primary)', borderColor: '#cfe3d8', background: '#f2f7f4' }}
                                                onClick={() => router.push('/talks')}>
                                                💬 トークで連絡
                                              </button>
                                            )}
                                            {quest.status === 'completed' && app.status === 'accepted' && (
                                              <button style={{ ...S.primarySmallBtn, background: 'var(--color-accent)' }}
                                                onClick={() => setThanksTarget({ questId: quest.id, questTitle: quest.title, recipientName: app.applicant?.display_name ?? '応募者', recipientId: app.applicant_id })}>
                                                <Heart size={12} />感謝をおくる
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {quest.status === 'approved' && (
                                <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '0.75rem', background: '#f2f7f4', border: '1px solid #cfe3d8' }}>
                                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.625rem' }}>
                                    依頼が終わったら完了報告をしてください。完了すると感謝の言葉を送り合えます。
                                    {acceptedApps.length === 0 && ' （マッチ成立前でも完了・取り下げできます）'}
                                  </p>
                                  <button style={S.primarySmallBtn} disabled={busy} onClick={() => completeQuest(quest.id)}>
                                    <CheckCircle2 size={12} />完了報告する
                                  </button>
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
          </>
        ) : (
          /* ===== 応募した依頼 ===== */
          /* 掲示側をキャッシュで先に描いたときは、こちらがまだ取得中のことがある。
             件数0の空表示を出すと「応募していない」と誤解させるので骨組みにする。 */
          appliedLoading ? (
            <CardListSkeleton rows={2} lines={2} />
          ) : appliedItems.length === 0 ? (
            <div style={S.emptyBox}>
              <Send size={32} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 1rem', opacity: 0.3 }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '1rem', color: 'var(--color-text-tertiary)' }}>まだクエストに応募していません。</p>
              <button onClick={() => router.push('/#quest-board')}
                style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0.625rem 1.25rem', borderRadius: '9999px', background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', cursor: 'pointer', border: 'none' }}
              >掲示板を見る</button>
            </div>
          ) : (
            <div style={S.stack}>
              {appliedItems.filter(a => a.quest).map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} style={{ ...S.card, padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.375rem' }}>
                    {appliedStatusBadge(item)}
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{item.quest!.quest_type}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>応募日: {new Date(item.applied_at).toLocaleDateString('ja-JP')}</span>
                  </div>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{item.quest!.title}</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>
                    主催: {item.quest!.organization_name ?? item.quest!.creator?.display_name ?? '不明'}
                  </p>
                  {item.status === 'accepted' && (
                    <div style={{ marginTop: '0.75rem', padding: '0.875rem 1rem', borderRadius: '0.75rem', background: '#f2f7f4', border: '1px solid #cfe3d8' }}>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>🎉 マッチングが成立しました。トークルームで依頼者と連絡できます。</p>
                      <button style={S.primarySmallBtn} onClick={() => router.push('/talks')}>💬 トークを開く</button>
                    </div>
                  )}
                  {item.status === 'accepted' && item.quest!.status === 'completed' && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <button style={{ ...S.primarySmallBtn, background: 'var(--color-accent)' }}
                        onClick={() => setThanksTarget({ questId: item.quest!.id, questTitle: item.quest!.title, recipientName: item.quest!.creator?.display_name ?? '依頼者' })}>
                        <Heart size={12} />依頼者に感謝をおくる
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
              {appliedMore && (
                <button onClick={() => loadApplied(appliedItems.length)}
                  style={{ margin: '0.5rem auto 0', fontSize: '0.8125rem', fontWeight: 600, padding: '0.625rem 1.5rem', borderRadius: '9999px', cursor: 'pointer', color: 'var(--color-text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--color-border)' }}
                >もっと見る</button>
              )}
            </div>
          )
        )}
      </div>

      {profileUserId && <UserProfileModal userId={profileUserId} onClose={() => setProfileUserId(null)} />}
      {thanksTarget && (
        <ThanksModal questTitle={thanksTarget.questTitle} recipientName={thanksTarget.recipientName}
          onSend={sendThanks} onClose={() => setThanksTarget(null)} />
      )}
      <SkeletonStyles />
    </div>
  );
}

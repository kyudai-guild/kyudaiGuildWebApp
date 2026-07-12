'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Scroll, XCircle, AlertCircle, Users, Tag, Calendar, ChevronDown, ChevronUp, ArrowLeft, Plus, CheckCircle2, Heart, UserRound, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MY_QUEST_STATUS as STATUS } from '@/components/quest/status';
import UserProfileModal from '@/components/member/UserProfileModal';
import ThanksModal from '@/components/quest/ThanksModal';

interface Application {
  id: string; message: string | null; status: string; applied_at: string;
  applicant_id: string;
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
interface AppliedItem {
  id: string; status: string; applied_at: string;
  quest: {
    id: string; title: string; quest_type: string; status: string; reward: string;
    completed_at: string | null; contact_email_public: boolean; preferred_contact: string | null;
    creator: { display_name: string; email: string } | null;
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
  alertBanner: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' } as React.CSSProperties,
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
  smallBtn: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, padding: '0.375rem 0.875rem', borderRadius: '9999px', cursor: 'pointer', border: '1px solid var(--color-border)', background: 'var(--bg-card)', color: 'var(--color-text-secondary)', transition: 'all 0.2s' } as React.CSSProperties,
  primarySmallBtn: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, padding: '0.375rem 0.875rem', borderRadius: '9999px', cursor: 'pointer', border: 'none', background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', transition: 'background 0.2s' } as React.CSSProperties,
};

export default function MyQuestsPage() {
  const router = useRouter();
  const [view, setView] = useState<'posted' | 'applied'>('posted');
  const [quests, setQuests] = useState<MyQuest[]>([]);
  const [appliedItems, setAppliedItems] = useState<AppliedItem[]>([]);
  const [appliedMore, setAppliedMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [thanksTarget, setThanksTarget] = useState<{ questId: string; questTitle: string; recipientName: string; recipientId?: string } | null>(null);

  const loadPosted = useCallback(() => {
    return fetch('/api/my-quests').then(r => r.ok ? r.json() : []).then(setQuests).catch(() => {});
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
    Promise.all([loadPosted(), loadApplied()]).finally(() => setLoading(false));
  }, [loadPosted, loadApplied]);

  const reviewApplication = async (appId: string, action: 'accept' | 'reject') => {
    setBusy(true); setActionError(null);
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await loadPosted();
    } catch (e: any) {
      setActionError(e.message || '操作に失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  const completeQuest = async (questId: string) => {
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
            <AlertCircle size={14} style={{ flexShrink: 0 }} />{actionError}（クリックで閉じる）
          </div>
        )}

        {loading ? (
          <div style={S.spinner}>
            <div style={{ width: 32, height: 32, border: '2px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '9999px', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>読み込み中...</p>
          </div>
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
                              <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>{quest.description}</p>
                              <div style={S.metaRow}>
                                <span style={S.metaItem}><Users size={13} style={{ color: 'var(--color-primary)' }} />応募: {appCount}/{quest.max_applicants}人</span>
                                {quest.reward && <span style={S.metaItem}><Tag size={13} style={{ color: 'var(--color-accent)' }} />{quest.reward}</span>}
                                {quest.effective_end_date && <span style={S.metaItem}><Calendar size={13} style={{ color: 'var(--color-text-tertiary)' }} />期限: {new Date(quest.effective_end_date).toLocaleDateString('ja-JP')}</span>}
                              </div>
                              {quest.tags && quest.tags.length > 0 && (
                                <div style={{ ...S.tagRow, marginTop: '0.75rem' }}>
                                  {quest.tags.map(tag => (
                                    <span key={tag} style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', borderRadius: '9999px', color: 'var(--color-text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)' }}>#{tag}</span>
                                  ))}
                                </div>
                              )}
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
                                                <button style={S.smallBtn} disabled={busy} onClick={() => reviewApplication(app.id, 'reject')}>
                                                  <XCircle size={12} />見送る
                                                </button>
                                              </>
                                            )}
                                            {app.status === 'accepted' && app.applicant?.email && (
                                              <a href={`mailto:${app.applicant.email}`} style={{ ...S.smallBtn, textDecoration: 'none', color: 'var(--color-primary)', borderColor: '#cfe3d8', background: '#f2f7f4' }}>
                                                ✉ {app.applicant.email}
                                              </a>
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
          appliedItems.length === 0 ? (
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
                    依頼者: {item.quest!.creator?.display_name ?? '不明'}{item.quest!.reward ? ` ・ ${item.quest!.reward}` : ''}
                  </p>
                  {item.status === 'accepted' && (
                    <div style={{ marginTop: '0.75rem', padding: '0.875rem 1rem', borderRadius: '0.75rem', background: '#f2f7f4', border: '1px solid #cfe3d8' }}>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.375rem' }}>🎉 マッチングが成立しました。依頼者と連絡を取りましょう。</p>
                      {item.quest!.preferred_contact && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                          依頼者の希望連絡先: <b style={{ color: 'var(--color-text-primary)' }}>{item.quest!.preferred_contact}</b>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>（まずはこちらへ連絡してください）</span>
                        </p>
                      )}
                      {item.quest!.creator?.email && (
                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                          メール: <a href={`mailto:${item.quest!.creator.email}`} style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>{item.quest!.creator.email}</a>
                        </p>
                      )}
                      <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: '0.375rem' }}>※あなたの九大メールも依頼者に開示されています。</p>
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

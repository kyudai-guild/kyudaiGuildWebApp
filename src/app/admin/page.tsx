'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Shield, CheckCircle2, XCircle, ChevronDown, ChevronUp, Users, Tag, Calendar, ArrowLeft, AlertCircle, CalendarDays, MapPin, Scroll, Building2, Search, Plus, Trash2, Pencil, Inbox, BellRing } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGuild } from '@/contexts/GuildContext';
import { GuildEvent, eventStyle, fmtDateLong, fmtTimeRange } from '@/components/events/types';
import EventDetailModal from '@/components/events/EventDetailModal';
import CreateEventModal from '@/components/events/CreateEventModal';
import { ADMIN_QUEST_STATUS as STATUS } from '@/components/quest/status';
import OrgBadge from '@/components/quest/OrgBadge';
import QuestDetails from '@/components/quest/QuestDetails';
import type { QuestSession, ScheduleRow } from '@/lib/quest-form';
import { CardListSkeleton, RowListSkeleton, SkeletonStyles } from '@/components/ui/Skeleton';
import { isSubmitEnter } from '@/lib/keyboard';

interface AdminQuest {
  id: string; title: string; description: string | null; quest_type: string;
  max_applicants: number; tags: string[]; status: string;
  listing_duration_type: string; listing_duration_weeks: number | null;
  listing_end_date: string | null; effective_end_date: string | null;
  rejection_reason: string | null; reviewed_at: string | null;
  created_at: string; creator: { display_name: string } | null;
  application_count: number;
  organization_id: string | null; organization_name: string | null;
  organization: { id: string; name: string; is_active: boolean } | null;
  // 依頼書の項目（v19）
  sessions?: QuestSession[]; location?: string | null; participation_fee?: string | null;
  belongings?: string | null; schedule?: ScheduleRow[]; requirements?: string | null;
  org_intro?: string | null; appeal?: string | null; photo_path?: string | null;
  preferred_contact?: string | null; accepted_count?: number;
  // 掲示しない受け入れ担当者（運営の取得時だけ付く）
  private_details?: { receiver_name: string; receiver_contact: string } | null;
}

interface Organization { id: string; name: string; description: string | null; sort_order: number; is_active: boolean; member_count: number; }
interface OrgMember { id: string; display_name: string | null; email: string | null; role: 'member' | 'manager'; created_at: string; }
interface AdminUser { id: string; display_name: string | null; email: string | null; role: string; organizations: { id: string; name: string }[]; }
interface OrgRequest {
  id: string; organization_id: string | null; requested_name: string | null;
  message: string | null; status: string; review_note: string | null;
  created_at: string; reviewed_at: string | null;
  organization: { id: string; name: string } | null;
  applicant: { id: string; display_name: string | null; email: string | null } | null;
}

/*
 * 管理画面だけの配色（ダーク）。
 * 既存の部品はすべて CSS 変数で色を指定しているので、この範囲だけ変数を
 * 上書きすれば、部品を書き直さずに管理画面全体が切り替わる。
 * 一般の画面と見た目がはっきり違うことで、「いま運営として操作している」ことが分かる。
 * ここで開くモーダル（イベント登録など）も、この範囲の中に描画されるので同じ配色になる。
 */
const ADMIN_THEME = `
  .admin-theme {
    color-scheme: dark;
    --bg-base: #0f1714;
    --bg-secondary: #1a2622;
    --bg-tertiary: #24332d;
    --bg-card: #15201c;
    --bg-card-hover: #1b2823;
    --color-primary: #86cfab;
    --bg-dark: #2f6f57;
    --bg-dark-hover: #3a8266;
    --color-text-primary: #eef2ef;
    --color-text-secondary: #b7c2bc;
    --color-text-tertiary: #84928b;
    --color-text-inverse: #f5f7f6;
    --color-border: rgba(255, 255, 255, 0.1);
    --color-border-strong: rgba(255, 255, 255, 0.18);
    --shadow-card: 0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.04);
    --notice-warn-bg: rgba(245, 158, 11, 0.12);
    --notice-warn-border: rgba(251, 191, 36, 0.35);
    --notice-warn-title: #fcd34d;
    --notice-danger-bg: rgba(239, 68, 68, 0.12);
    --notice-danger-border: rgba(248, 113, 113, 0.35);
    --notice-danger-title: #fca5a5;
    background: var(--bg-base);
    color: var(--color-text-primary);
  }
`;

const S = {
  page: { minHeight: '100vh' } as React.CSSProperties,
  pageHeader: { background: 'var(--bg-card)', borderBottom: '1px solid var(--color-border)', padding: 'clamp(1rem, 4vw, 1.5rem) clamp(1rem, 4vw, 2rem)', marginBottom: '1.5rem' } as React.CSSProperties,
  inner: { maxWidth: 900, margin: '0 auto' } as React.CSSProperties,
  content: { maxWidth: 900, margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem) 3rem' } as React.CSSProperties,
  backBtn: { display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 500, marginBottom: '1rem', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--color-text-tertiary)', transition: 'color 0.2s' } as React.CSSProperties,
  filterRow: { display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem' } as React.CSSProperties,
  stack: { display: 'flex', flexDirection: 'column', gap: '0.75rem' } as React.CSSProperties,
  card: { borderRadius: '1rem', overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' } as React.CSSProperties,
  cardExpanded: { padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' } as React.CSSProperties,
  metaRow: { display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' } as React.CSSProperties,
  metaItem: { display: 'flex', alignItems: 'center', gap: '0.375rem' } as React.CSSProperties,
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: '0.375rem' } as React.CSSProperties,
  btnRow: { display: 'flex', gap: '0.5rem' } as React.CSSProperties,
};

type Tab = 'quests' | 'events' | 'orgs' | 'orgRequests';

const ORG_REQ_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: '審査待ち', color: '#d97706', bg: '#fffbeb' },
  approved: { label: '承認済み', color: '#059669', bg: '#ecfdf5' },
  rejected: { label: '却下',     color: '#6b7280', bg: '#f9fafb' },
};

export default function AdminPage() {
  const router = useRouter();
  const { isAdmin, isLoggedIn } = useGuild();
  const [tab, setTab] = useState<Tab>('quests');

  // ── Quest state ──
  const [quests, setQuests] = useState<AdminQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // 審査は成功したがメール通知に失敗した場合の警告（握り潰さず運営に見せる）
  const [actionWarning, setActionWarning] = useState<string | null>(null);

  // ── Event state ──
  const [events, setEvents] = useState<GuildEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState('approved');
  const [selectedEvent, setSelectedEvent] = useState<GuildEvent | null>(null);

  // ── 団体管理 state（state はタブごとに prefix を分けて混線させない）──
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [orgBusy, setOrgBusy] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDesc, setNewOrgDesc] = useState('');
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [editOrgName, setEditOrgName] = useState('');
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<AdminUser[]>([]);
  const [userSearching, setUserSearching] = useState(false);

  // ── 所属申請 state ──
  const [orgReqs, setOrgReqs] = useState<OrgRequest[]>([]);
  const [orgReqsLoading, setOrgReqsLoading] = useState(true);
  const [orgReqFilter, setOrgReqFilter] = useState('pending');
  const [orgReqError, setOrgReqError] = useState<string | null>(null);
  const [orgReqBusy, setOrgReqBusy] = useState(false);
  const [rejectingReqId, setRejectingReqId] = useState<string | null>(null);
  const [reqNote, setReqNote] = useState('');
  // タブのバッジ用。一覧を絞り込んでも数字がぶれないよう別に持つ。
  const [pendingOrgReqCount, setPendingOrgReqCount] = useState(0);

  // ── イベントの登録・編集・削除 ──
  const [eventModal, setEventModal] = useState<{ mode: 'new' } | { mode: 'edit'; event: GuildEvent } | null>(null);
  const [eventBusy, setEventBusy] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);

  // ── 運営設定（Slack通知のON/OFF）──
  const [slackOn, setSlackOn] = useState(true);
  const [settingsReady, setSettingsReady] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const fetchQuests = useCallback(async () => {
    try { const res = await fetch('/api/quests'); if (res.ok) setQuests(await res.json()); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  const fetchEvents = useCallback(async () => {
    try { const res = await fetch('/api/events'); if (res.ok) setEvents(await res.json()); }
    catch (e) { console.error(e); } finally { setEventsLoading(false); }
  }, []);

  const fetchOrgs = useCallback(async () => {
    try { const res = await fetch('/api/organizations'); if (res.ok) setOrgs((await res.json()).organizations ?? []); }
    catch (e) { console.error(e); } finally { setOrgsLoading(false); }
  }, []);

  const fetchOrgReqs = useCallback(async (status: string) => {
    setOrgReqsLoading(true);
    try {
      const res = await fetch(`/api/organization-requests?status=${status}`);
      if (res.ok) {
        const data: OrgRequest[] = await res.json();
        setOrgReqs(data);
        // 審査待ちを含む取得のときだけバッジを更新する
        if (status === 'pending') setPendingOrgReqCount(data.length);
        else if (status === 'all') setPendingOrgReqCount(data.filter(r => r.status === 'pending').length);
      }
    }
    catch (e) { console.error(e); } finally { setOrgReqsLoading(false); }
  }, []);

  useEffect(() => { if (isLoggedIn) { fetchQuests(); fetchEvents(); } }, [isLoggedIn, fetchQuests, fetchEvents]);

  // 管理者専用API。isAdmin は profiles を非同期で読んでから true になるので、
  // 依存配列から落とすと永久に取得されない。
  useEffect(() => { if (isLoggedIn && isAdmin) fetchOrgs(); }, [isLoggedIn, isAdmin, fetchOrgs]);
  useEffect(() => { if (isLoggedIn && isAdmin) fetchOrgReqs(orgReqFilter); }, [isLoggedIn, isAdmin, orgReqFilter, fetchOrgReqs]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) return;
      const d = await res.json();
      setSlackOn(d.slack_notifications !== false);
      setSettingsReady(true);
    } catch (e) { console.error(e); }
  }, []);

  // この effect は fetchSettings の宣言より後に置くこと。
  // 依存配列はレンダリング中に評価されるため、前に置くと
  // 「Cannot access 'fetchSettings' before initialization」で落ちる。
  useEffect(() => { if (isLoggedIn && isAdmin) fetchSettings(); }, [isLoggedIn, isAdmin, fetchSettings]);

  const toggleSlack = async () => {
    const next = !slackOn;
    setSlackOn(next); // 楽観的に反映し、失敗したら戻す
    setSettingsError(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slack_notifications: next }),
      });
      if (!res.ok) throw new Error((await res.json()).error || '設定の保存に失敗しました。');
    } catch (e: any) {
      setSlackOn(!next);
      setSettingsError(e.message);
    }
  };

  // イベントの削除。間違えて登録したものを消す用途なので、確認してから消す
  const deleteEvent = async (ev: GuildEvent) => {
    if (!confirm(`「${ev.title}」を削除しますか？\nこの操作は取り消せません。`)) return;
    setEventBusy(true); setEventError(null);
    try {
      const res = await fetch(`/api/events/${ev.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || '削除に失敗しました。');
      await fetchEvents();
    } catch (e: any) { setEventError(e.message); } finally { setEventBusy(false); }
  };

  const createOrg = async () => {
    const name = newOrgName.trim();
    if (!name) { setOrgError('団体名を入力してください。'); return; }
    setOrgBusy(true); setOrgError(null);
    try {
      const res = await fetch('/api/organizations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description: newOrgDesc, sort_order: orgs.length + 1 }) });
      if (!res.ok) throw new Error((await res.json()).error || '団体の追加に失敗しました。');
      setNewOrgName(''); setNewOrgDesc(''); await fetchOrgs();
    } catch (e: any) { setOrgError(e.message); } finally { setOrgBusy(false); }
  };

  const patchOrg = async (id: string, patch: Record<string, any>) => {
    setOrgBusy(true); setOrgError(null);
    try {
      const res = await fetch(`/api/organizations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      if (!res.ok) throw new Error((await res.json()).error || '団体の更新に失敗しました。');
      setEditingOrgId(null); await fetchOrgs();
    } catch (e: any) { setOrgError(e.message); } finally { setOrgBusy(false); }
  };

  const openOrg = async (id: string) => {
    if (expandedOrgId === id) { setExpandedOrgId(null); return; }
    setExpandedOrgId(id); setOrgMembers([]); setUserQuery(''); setUserResults([]); setMembersLoading(true); setOrgError(null);
    try { const res = await fetch(`/api/organizations/${id}/members`); if (res.ok) setOrgMembers(await res.json()); }
    catch (e) { console.error(e); } finally { setMembersLoading(false); }
  };

  const searchUsers = async () => {
    setUserSearching(true); setOrgError(null);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(userQuery)}`);
      if (res.ok) setUserResults((await res.json()).users ?? []);
    } catch (e) { console.error(e); } finally { setUserSearching(false); }
  };

  const grantOrg = async (orgId: string, profileId: string) => {
    setOrgBusy(true); setOrgError(null);
    try {
      const res = await fetch(`/api/organizations/${orgId}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile_id: profileId }) });
      if (!res.ok) throw new Error((await res.json()).error || '所属の付与に失敗しました。');
      const members = await fetch(`/api/organizations/${orgId}/members`);
      if (members.ok) setOrgMembers(await members.json());
      await fetchOrgs();
    } catch (e: any) { setOrgError(e.message); } finally { setOrgBusy(false); }
  };

  const setMemberRole = async (orgId: string, profileId: string, role: 'manager' | 'member') => {
    setOrgBusy(true); setOrgError(null);
    try {
      const res = await fetch(`/api/organizations/${orgId}/members`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile_id: profileId, role }) });
      if (!res.ok) throw new Error((await res.json()).error || '役割の変更に失敗しました。');
      setOrgMembers(prev => prev.map(m => (m.id === profileId ? { ...m, role } : m)));
    } catch (e: any) { setOrgError(e.message); } finally { setOrgBusy(false); }
  };

  const revokeOrg = async (orgId: string, profileId: string) => {
    setOrgBusy(true); setOrgError(null);
    try {
      const res = await fetch(`/api/organizations/${orgId}/members?profile_id=${profileId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || '所属の解除に失敗しました。');
      setOrgMembers(prev => prev.filter(m => m.id !== profileId));
      await fetchOrgs();
    } catch (e: any) { setOrgError(e.message); } finally { setOrgBusy(false); }
  };

  const reviewOrgReq = async (id: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !reqNote.trim()) { setOrgReqError('却下理由を入力してください。'); return; }
    setOrgReqBusy(true); setOrgReqError(null);
    try {
      const res = await fetch(`/api/organization-requests/${id}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, review_note: action === 'reject' ? reqNote : undefined }) });
      if (!res.ok) throw new Error((await res.json()).error || '審査処理に失敗しました。');
      setRejectingReqId(null); setReqNote('');
      await Promise.all([fetchOrgReqs(orgReqFilter), fetchOrgs()]);
    } catch (e: any) { setOrgReqError(e.message); } finally { setOrgReqBusy(false); }
  };

  const handleReview = async (questId: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectionReason.trim()) { setActionError('リジェクト理由を入力してください。'); return; }
    setActionLoading(true); setActionError(null); setActionWarning(null);
    try {
      const res = await fetch(`/api/quests/${questId}/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, rejection_reason: action === 'reject' ? rejectionReason : undefined }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || '審査処理に失敗しました。');
      if (d.mail_warning) setActionWarning(d.mail_warning);
      setReviewingId(null); setRejectionReason(''); await fetchQuests();
    } catch (err: any) { setActionError(err.message); } finally { setActionLoading(false); }
  };

  const filtered = filter === 'all' ? quests : quests.filter(q => q.status === filter);
  const counts = { all: quests.length, pending: quests.filter(q => q.status === 'pending').length, approved: quests.filter(q => q.status === 'approved').length, rejected: quests.filter(q => q.status === 'rejected').length };

  const eventFiltered = eventFilter === 'all' ? events : events.filter(e => e.status === eventFilter);
  const eventCounts = { all: events.length, approved: events.filter(e => e.status === 'approved').length };

  const centeredMsg = (children: React.ReactNode) => (
    <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>{children}</div>
  );

  if (!isLoggedIn) return centeredMsg(<p style={{ color: 'var(--color-text-tertiary)' }}>ログインが必要です。</p>);
  if (!isAdmin) return centeredMsg(
    <>
      <Shield size={48} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 1rem', opacity: 0.3 }} />
      <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>管理者権限が必要です。</p>
    </>
  );

  const tabBtn = (key: Tab, label: string, Icon: React.ElementType, badge: number) => {
    const active = tab === key;
    return (
      <button onClick={() => setTab(key)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer', border: 'none', borderBottom: '2px solid', background: 'none', transition: 'all 0.2s',
          color: active ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
          borderBottomColor: active ? 'var(--color-primary)' : 'transparent',
        }}
      >
        <Icon size={16} />{label}
        {badge > 0 && (
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, minWidth: 18, height: 18, padding: '0 0.3rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', background: '#d97706', color: '#fff' }}>{badge}</span>
        )}
      </button>
    );
  };

  return (
    <div className="admin-theme" style={S.page}>
      <style>{ADMIN_THEME}</style>
      {/* 管理者モードの帯。一般の画面との違いを一目で分かるようにする */}
      <div style={{ background: '#c8956c', color: '#1f140f', padding: '0.4375rem clamp(1rem, 4vw, 2rem)', fontSize: '0.8125rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textAlign: 'center' }}>
        <Shield size={14} />管理者モード — 運営だけが見られる画面です。ここでの操作は利用者に反映されます。
      </div>
      <div style={S.pageHeader}>
        <div style={S.inner}>
          <button onClick={() => router.push('/')} style={S.backBtn}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'; }}
          ><ArrowLeft size={14} />ホームへ戻る</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--bg-dark)' }}>
              <Shield size={18} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>管理者ダッシュボード</h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>クエスト・イベントの管理</p>
            </div>
          </div>
        </div>
      </div>

      <div style={S.content}>
        {/* 運営設定。動作確認の前後で触るものなので、タブより上の一番目立つ位置に置く */}
        <div style={{ ...S.card, padding: '0.875rem 1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                <BellRing size={14} style={{ color: 'var(--color-accent)' }} />Slackへの通知
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', lineHeight: 1.6, marginTop: '0.125rem' }}>
                {slackOn
                  ? 'クエストの申請と所属申請をSlackに通知します。'
                  : '停止中。動作確認が終わったら戻してください。'}
              </p>
            </div>
            <button onClick={toggleSlack} aria-label="Slack通知" disabled={!settingsReady}
              style={{ width: 44, height: 24, borderRadius: '9999px', border: 'none', cursor: settingsReady ? 'pointer' : 'not-allowed', position: 'relative', flexShrink: 0, opacity: settingsReady ? 1 : 0.4, background: slackOn ? 'var(--color-primary)' : 'var(--bg-tertiary)' }}>
              <span style={{ position: 'absolute', top: 2, left: slackOn ? 22 : 2, width: 20, height: 20, borderRadius: '9999px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
            </button>
          </div>

          {!slackOn && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.625rem 0.875rem', borderRadius: '0.625rem', marginTop: '0.75rem', fontSize: '0.8125rem', lineHeight: 1.7, background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706' }}>
              <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
              停止中に届いた申請はSlackに流れません。<b>この画面のバッジとメール通知は止まりません</b>ので、見落としはしません。
            </div>
          )}

          {settingsError && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.625rem 0.875rem', borderRadius: '0.625rem', marginTop: '0.75rem', fontSize: '0.8125rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />{settingsError}
            </div>
          )}
        </div>

        {/* Tabs（4つに増えたのでスマホ幅では横スクロールさせる） */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem', overflowX: 'auto' }}>
          {tabBtn('quests', 'クエスト審査', Scroll, counts.pending)}
          {tabBtn('orgRequests', '所属申請', Inbox, pendingOrgReqCount)}
          {tabBtn('orgs', '団体管理', Building2, 0)}
          {tabBtn('events', 'イベント管理', CalendarDays, 0)}
        </div>

        {/* ══════════ QUEST TAB ══════════ */}
        {tab === 'quests' && (
          <>
            {actionWarning && (
              <div onClick={() => setActionWarning(null)}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706' }}
              ><AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />{actionWarning}</div>
            )}
            <div style={S.filterRow}>
              {(['pending','approved','rejected','all'] as const).map(key => {
                const cfg = key === 'all' ? { label: 'すべて' } : STATUS[key];
                const active = filter === key;
                return (
                  <button key={key} onClick={() => setFilter(key)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 1rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '9999px', border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', background: active ? 'var(--bg-dark)' : 'var(--bg-card)', color: active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)', borderColor: active ? 'var(--bg-dark)' : 'var(--color-border)' }}
                  >{cfg.label}<span style={{ fontSize: '0.75rem', opacity: 0.6 }}>({counts[key]})</span></button>
                );
              })}
            </div>

            {loading ? (
              <CardListSkeleton rows={3} lines={2} />
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: '1rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)' }}>
                <Shield size={32} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>
                  {filter === 'pending' ? '審査待ちのクエストはありません。' : `${STATUS[filter]?.label || 'この条件の'}クエストはありません。`}
                </p>
              </div>
            ) : (
              <div style={S.stack}>
                {filtered.map((quest, i) => {
                  const st = STATUS[quest.status] || STATUS.pending;
                  const { Icon: StIcon } = st;
                  const isExpanded = expandedId === quest.id;
                  const isReviewing = reviewingId === quest.id;
                  return (
                    <motion.div key={quest.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} style={S.card}>
                      <div style={{ padding: '1.25rem', cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : quest.id)}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '9999px', color: st.color, background: st.bg }}>
                                <StIcon size={10} />{st.label}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{quest.quest_type}</span>
                              {/* どの団体からの申請か。団体未設定は『個人申請』と明示する */}
                              <OrgBadge
                                name={quest.organization_name ?? quest.organization?.name}
                                inactive={quest.organization?.is_active === false}
                                showPersonal
                              />
                            </div>
                            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{quest.title}</h3>
                            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--color-text-tertiary)' }}>
                              掲示者: {quest.creator?.display_name || '不明'} / 申請日: {new Date(quest.created_at).toLocaleDateString('ja-JP')}
                            </p>
                          </div>
                          {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }} />}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                            <div style={S.cardExpanded}>
                              {/* 依頼書の内容と、掲示しない受け入れ担当者（審査に必要なので運営には見せる） */}
                              <div style={{ marginBottom: '1rem' }}>
                                <QuestDetails quest={quest} privateDetails={quest.private_details ?? null} />
                              </div>
                              {!quest.private_details && quest.status === 'pending' && (
                                <p style={{ fontSize: '0.75rem', color: '#d97706', marginBottom: '0.75rem' }}>
                                  ※ 当日の受け入れ担当者が登録されていません（旧形式の申請）。
                                </p>
                              )}
                              {quest.status === 'rejected' && quest.rejection_reason && (
                                <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'var(--notice-danger-bg)', border: '1px solid var(--notice-danger-border)', marginBottom: '0.75rem' }}>
                                  <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--notice-danger-title)' }}>リジェクト理由:</p>
                                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{quest.rejection_reason}</p>
                                </div>
                              )}
                              {quest.status === 'pending' && (
                                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                                  {actionError && isReviewing && (
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', borderRadius: '0.75rem', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 500, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                                      <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />{actionError}
                                    </div>
                                  )}
                                  {isReviewing ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                        リジェクト理由 <span style={{ color: '#dc2626' }}>*</span>
                                      </label>
                                      <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                                        style={{ width: '100%', fontSize: '0.875rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', outline: 'none', resize: 'none', minHeight: 64, background: 'var(--bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
                                        onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,74,58,0.1)'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                                        placeholder="リジェクトする理由を記載してください..."
                                      />
                                      <div style={S.btnRow}>
                                        <button onClick={() => { setReviewingId(null); setRejectionReason(''); setActionError(null); }}
                                          style={{ flex: 1, padding: '0.625rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                                        >キャンセル</button>
                                        <button onClick={() => handleReview(quest.id, 'reject')} disabled={actionLoading}
                                          style={{ flex: 1, padding: '0.625rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.5 : 1, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                                        >{actionLoading ? '処理中...' : 'リジェクト'}</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={S.btnRow}>
                                      <button onClick={() => handleReview(quest.id, 'approve')} disabled={actionLoading}
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.625rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.5 : 1, background: '#ecfdf5', color: '#059669', border: '1px solid #bbf7d0' }}
                                      ><CheckCircle2 size={14} />{actionLoading ? '処理中...' : '承認する'}</button>
                                      <button onClick={() => { setReviewingId(quest.id); setActionError(null); }}
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.625rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                                      ><XCircle size={14} />リジェクト</button>
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
          </>
        )}

        {/* ══════════ ORG REQUEST TAB ══════════ */}
        {tab === 'orgRequests' && (
          <>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem', lineHeight: 1.7 }}>
              ユーザーから届いた所属団体の申請です。承認すると、その人はクエスト申請時に団体名を選べるようになります。
            </p>

            <div style={S.filterRow}>
              {(['pending', 'approved', 'rejected', 'all'] as const).map(key => {
                const label = key === 'all' ? 'すべて' : ORG_REQ_STATUS[key].label;
                const active = orgReqFilter === key;
                return (
                  <button key={key} onClick={() => { setOrgReqFilter(key); setRejectingReqId(null); setOrgReqError(null); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 1rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '9999px', border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', background: active ? 'var(--bg-dark)' : 'var(--bg-card)', color: active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)', borderColor: active ? 'var(--bg-dark)' : 'var(--color-border)' }}
                  >{label}</button>
                );
              })}
            </div>

            {orgReqError && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />{orgReqError}
              </div>
            )}

            {orgReqsLoading ? (
              <CardListSkeleton rows={3} lines={2} />
            ) : orgReqs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: '1rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)' }}>
                <Inbox size={32} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>
                  {orgReqFilter === 'pending' ? '審査待ちの所属申請はありません。' : '該当する申請はありません。'}
                </p>
              </div>
            ) : (
              <div style={S.stack}>
                {orgReqs.map((req, i) => {
                  const st = ORG_REQ_STATUS[req.status] ?? ORG_REQ_STATUS.pending;
                  const orgLabel = req.organization?.name ?? req.requested_name;
                  const isNewOrg = !req.organization_id && !!req.requested_name;
                  const isRejecting = rejectingReqId === req.id;
                  return (
                    <motion.div key={req.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} style={{ ...S.card, padding: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '9999px', color: st.color, background: st.bg }}>{st.label}</span>
                        <OrgBadge name={orgLabel} />
                        {isNewOrg && (
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.1875rem 0.625rem', borderRadius: '9999px', color: '#d97706', background: '#fffbeb' }}>新規団体</span>
                        )}
                      </div>

                      <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {req.applicant?.display_name || '名称未設定'}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.125rem' }}>
                        {req.applicant?.email} / 申請日: {new Date(req.created_at).toLocaleDateString('ja-JP')}
                      </p>

                      {req.message && (
                        <div style={{ padding: '0.875rem 1rem', borderRadius: '0.75rem', background: 'var(--bg-base)', fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--color-text-secondary)', margin: '0.75rem 0 0', whiteSpace: 'pre-wrap' }}>
                          {req.message}
                        </div>
                      )}

                      {req.status === 'rejected' && req.review_note && (
                        <div style={{ padding: '0.875rem 1rem', borderRadius: '0.75rem', background: 'var(--notice-danger-bg)', border: '1px solid var(--notice-danger-border)', marginTop: '0.75rem' }}>
                          <p style={{ fontWeight: 600, fontSize: '0.8125rem', marginBottom: '0.375rem', color: 'var(--notice-danger-title)' }}>却下理由:</p>
                          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{req.review_note}</p>
                        </div>
                      )}

                      {req.status === 'pending' && (
                        <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                          {isRejecting ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                却下理由 <span style={{ color: '#dc2626' }}>*</span>
                              </label>
                              <textarea value={reqNote} onChange={e => setReqNote(e.target.value)}
                                style={{ width: '100%', fontSize: '0.875rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', outline: 'none', resize: 'none', minHeight: 64, background: 'var(--bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', boxSizing: 'border-box' }}
                                onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,74,58,0.1)'; }}
                                onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                                placeholder="本人に表示されます。所属が確認できなかった理由などを記載してください..."
                              />
                              <div style={S.btnRow}>
                                <button onClick={() => { setRejectingReqId(null); setReqNote(''); setOrgReqError(null); }}
                                  style={{ flex: 1, padding: '0.625rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                                >キャンセル</button>
                                <button onClick={() => reviewOrgReq(req.id, 'reject')} disabled={orgReqBusy}
                                  style={{ flex: 1, padding: '0.625rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: orgReqBusy ? 'not-allowed' : 'pointer', opacity: orgReqBusy ? 0.5 : 1, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                                >{orgReqBusy ? '処理中...' : '却下する'}</button>
                              </div>
                            </div>
                          ) : (
                            <div style={S.btnRow}>
                              <button onClick={() => reviewOrgReq(req.id, 'approve')} disabled={orgReqBusy}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.625rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: orgReqBusy ? 'not-allowed' : 'pointer', opacity: orgReqBusy ? 0.5 : 1, background: '#ecfdf5', color: '#059669', border: '1px solid #bbf7d0' }}
                              ><CheckCircle2 size={14} />{orgReqBusy ? '処理中...' : '承認する'}</button>
                              <button onClick={() => { setRejectingReqId(req.id); setReqNote(''); setOrgReqError(null); }}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', padding: '0.625rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                              ><XCircle size={14} />却下</button>
                            </div>
                          )}
                          {isNewOrg && !isRejecting && (
                            <p style={{ fontSize: '0.75rem', marginTop: '0.625rem', color: 'var(--color-text-tertiary)' }}>
                              ※承認すると「{req.requested_name}」が団体として新しく登録されます。
                            </p>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════ ORG TAB ══════════ */}
        {tab === 'orgs' && (
          <>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem', lineHeight: 1.7 }}>
              団体を登録し、ユーザーに所属を付与します。団体は削除せず「無効」にします（過去のクエストの記録を壊さないため）。
            </p>

            {orgError && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />{orgError}
              </div>
            )}

            {/* 団体を追加 */}
            <div style={{ ...S.card, padding: '1.25rem', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>団体を追加</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <input type="text" value={newOrgName} onChange={e => setNewOrgName(e.target.value)} placeholder="団体名（例: 九州大学◯◯サークル）"
                  style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '0.625rem 0.875rem', fontSize: '0.875rem', color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,74,58,0.1)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <input type="text" value={newOrgDesc} onChange={e => setNewOrgDesc(e.target.value)} placeholder="説明（任意）"
                  style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '0.625rem 0.875rem', fontSize: '0.875rem', color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,74,58,0.1)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <button onClick={createOrg} disabled={orgBusy}
                  style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1.25rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600, cursor: orgBusy ? 'not-allowed' : 'pointer', opacity: orgBusy ? 0.5 : 1, background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', border: 'none' }}
                ><Plus size={14} />{orgBusy ? '処理中...' : '追加する'}</button>
              </div>
            </div>

            {orgsLoading ? (
              <CardListSkeleton rows={3} lines={2} />
            ) : orgs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: '1rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)' }}>
                <Building2 size={32} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>まだ団体が登録されていません。</p>
              </div>
            ) : (
              <div style={S.stack}>
                {orgs.map((org, i) => {
                  const isOpen = expandedOrgId === org.id;
                  const isEditing = editingOrgId === org.id;
                  return (
                    <motion.div key={org.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} style={{ ...S.card, opacity: org.is_active ? 1 : 0.6 }}>
                      <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {isEditing ? (
                            <input type="text" value={editOrgName} onChange={e => setEditOrgName(e.target.value)} autoFocus
                              style={{ width: '100%', background: 'var(--bg-base)', border: '1px solid var(--color-primary)', borderRadius: '0.5rem', padding: '0.375rem 0.625rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box' }}
                            />
                          ) : (
                            <>
                              <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                {org.name}{!org.is_active && <span style={{ fontSize: '0.6875rem', fontWeight: 600, marginLeft: '0.5rem', color: 'var(--color-text-tertiary)' }}>（無効）</span>}
                              </p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.125rem' }}>
                                {org.description ? `${org.description} / ` : ''}所属 {org.member_count}人
                              </p>
                            </>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                          {isEditing ? (
                            <>
                              <button onClick={() => patchOrg(org.id, { name: editOrgName })} disabled={orgBusy}
                                style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.375rem 0.75rem', borderRadius: '9999px', cursor: 'pointer', background: '#ecfdf5', color: '#059669', border: '1px solid #bbf7d0' }}
                              >保存</button>
                              <button onClick={() => setEditingOrgId(null)}
                                style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.375rem 0.75rem', borderRadius: '9999px', cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                              >取消</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { setEditingOrgId(org.id); setEditOrgName(org.name); }} title="名称を変更"
                                style={{ display: 'inline-flex', padding: '0.375rem', borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--color-text-tertiary)', background: 'none', border: 'none' }}
                              ><Pencil size={14} /></button>
                              <button onClick={() => patchOrg(org.id, { is_active: !org.is_active })} disabled={orgBusy}
                                style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.375rem 0.75rem', borderRadius: '9999px', cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                              >{org.is_active ? '無効にする' : '有効に戻す'}</button>
                              <button onClick={() => openOrg(org.id)} title="所属メンバー"
                                style={{ display: 'inline-flex', padding: '0.375rem', borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--color-text-tertiary)', background: 'none', border: 'none' }}
                              >{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                            </>
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                            <div style={S.cardExpanded}>
                              <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.625rem' }}>所属メンバー</p>
                              {membersLoading ? (
                                <RowListSkeleton rows={2} />
                              ) : orgMembers.length === 0 ? (
                                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>まだ誰も所属していません。</p>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1rem' }}>
                                  {orgMembers.map(m => (
                                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.625rem 0.875rem', borderRadius: '0.75rem', background: 'var(--bg-base)', border: '1px solid var(--color-border)' }}>
                                      <div style={{ minWidth: 0 }}>
                                        <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                          {m.display_name || '名称未設定'}
                                          {m.role === 'manager' && <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: '9999px', color: '#92400e', background: '#fef3c7' }}>団体長</span>}
                                        </p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{m.email}</p>
                                      </div>
                                      {/* 団体長の指名・解除は運営だけができる */}
                                      <button onClick={() => setMemberRole(org.id, m.id, m.role === 'manager' ? 'member' : 'manager')} disabled={orgBusy}
                                        style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.375rem 0.75rem', borderRadius: '9999px', cursor: orgBusy ? 'not-allowed' : 'pointer', flexShrink: 0, background: 'var(--bg-card)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                                      >{m.role === 'manager' ? '団体長を外す' : '団体長にする'}</button>
                                      <button onClick={() => revokeOrg(org.id, m.id)} disabled={orgBusy} title="所属を解除"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, padding: '0.375rem 0.75rem', borderRadius: '9999px', cursor: orgBusy ? 'not-allowed' : 'pointer', flexShrink: 0, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                                      ><Trash2 size={12} />解除</button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: '1rem 0 0.625rem' }}>ユーザーを追加</p>
                              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.625rem' }}>
                                <input type="text" value={userQuery} onChange={e => setUserQuery(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (isSubmitEnter(e)) searchUsers(); } }}
                                  placeholder="表示名・メールアドレスで検索"
                                  style={{ flex: 1, background: 'var(--bg-base)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '0.625rem 0.875rem', fontSize: '0.875rem', color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box' }}
                                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,74,58,0.1)'; }}
                                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                                />
                                <button onClick={searchUsers} disabled={userSearching}
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.75rem', cursor: userSearching ? 'not-allowed' : 'pointer', background: 'var(--bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                                ><Search size={14} />{userSearching ? '検索中' : '検索'}</button>
                              </div>
                              {userResults.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                  {userResults.map(u => {
                                    const already = u.organizations.some(o => o.id === org.id);
                                    return (
                                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.625rem 0.875rem', borderRadius: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)' }}>
                                        <div style={{ minWidth: 0 }}>
                                          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{u.display_name || '名称未設定'}</p>
                                          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{u.email}</p>
                                        </div>
                                        <button onClick={() => grantOrg(org.id, u.id)} disabled={orgBusy || already}
                                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, padding: '0.375rem 0.875rem', borderRadius: '9999px', cursor: orgBusy || already ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: already ? 0.5 : 1, background: '#ecfdf5', color: '#059669', border: '1px solid #bbf7d0' }}
                                        ><Plus size={12} />{already ? '所属済み' : '追加'}</button>
                                      </div>
                                    );
                                  })}
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
        )}

        {/* ══════════ EVENT TAB ══════════ */}
        {tab === 'events' && (
          <>
            {/* イベントの登録・編集・削除は管理画面に集約（カレンダー画面からは外した） */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>
                登録したイベントは、すぐにイベントカレンダーに公開されます。
              </p>
              <button onClick={() => setEventModal({ mode: 'new' })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 600, padding: '0.5rem 1.125rem', borderRadius: '9999px', background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', cursor: 'pointer', border: 'none' }}
              ><Plus size={14} />イベントを登録</button>
            </div>
            {eventError && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />{eventError}
              </div>
            )}
            <div style={S.filterRow}>
              {(['approved','all'] as const).map(key => {
                const label = key === 'all' ? 'すべて' : '公開中';
                const active = eventFilter === key;
                return (
                  <button key={key} onClick={() => setEventFilter(key)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 1rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '9999px', border: '1px solid', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', background: active ? 'var(--bg-dark)' : 'var(--bg-card)', color: active ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)', borderColor: active ? 'var(--bg-dark)' : 'var(--color-border)' }}
                  >{label}<span style={{ fontSize: '0.75rem', opacity: 0.6 }}>({eventCounts[key]})</span></button>
                );
              })}
            </div>

            {eventsLoading ? (
              <CardListSkeleton rows={3} lines={2} />
            ) : eventFiltered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: '1rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)' }}>
                <CalendarDays size={32} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>登録済みのイベントはありません。</p>
              </div>
            ) : (
              <div style={S.stack}>
                {eventFiltered.map((ev, i) => {
                  const c = eventStyle(ev);
                  return (
                    <motion.div key={ev.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      style={{ ...S.card, display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', textAlign: 'left', width: '100%' }}
                    >
                      <div style={{ width: 4, alignSelf: 'stretch', borderRadius: '9999px', background: c.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setSelectedEvent(ev)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{fmtDateLong(ev.event_date)}・{fmtTimeRange(ev)}</span>
                        </div>
                        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{ev.title}</h3>
                        {ev.location && (
                          <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--color-text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <MapPin size={11} />{ev.location}
                          </p>
                        )}
                        <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--color-text-tertiary)' }}>
                          主催: {ev.organizer_name?.trim() || '九大ギルド運営'}
                          {(ev.co_organizer_names ?? []).length > 0 && ` ／ 共催: ${(ev.co_organizer_names ?? []).join('・')}`}
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flexShrink: 0 }}>
                        <button onClick={() => setEventModal({ mode: 'edit', event: ev })}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, padding: '0.375rem 0.75rem', borderRadius: '9999px', cursor: 'pointer', background: 'var(--bg-card)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                        ><Pencil size={12} />編集</button>
                        <button onClick={() => deleteEvent(ev)} disabled={eventBusy}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, padding: '0.375rem 0.75rem', borderRadius: '9999px', cursor: eventBusy ? 'not-allowed' : 'pointer', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                        ><Trash2 size={12} />削除</button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {eventModal && (
          <CreateEventModal
            isOpen
            editing={eventModal.mode === 'edit' ? eventModal.event : null}
            onClose={() => setEventModal(null)}
            onCreated={fetchEvents}
          />
        )}
      </AnimatePresence>

      <SkeletonStyles />
    </div>
  );
}

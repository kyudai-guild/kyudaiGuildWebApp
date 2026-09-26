'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, ShieldCheck, Users, ChevronDown, ChevronUp, UserPlus, UserMinus } from 'lucide-react';
import { useGuild } from '@/contexts/GuildContext';
import { ChatSkeleton, SkeletonStyles } from '@/components/ui/Skeleton';
import { isSubmitEnter } from '@/lib/keyboard';
import { refreshBadges } from '@/lib/badges';

// 入力欄は内容に合わせて広がる。広がるのはこの高さ（約5行）まで
const INPUT_MAX_HEIGHT = 132;

interface TalkMessage {
  id: string; body: string; created_at: string; sender_id: string;
  sender: { display_name: string } | null;
}
interface RoomInfo {
  id: string;
  quest: { id: string; title: string; quest_type: string; status: string; creator_id: string } | null;
  members: { profile_id: string; profile: { display_name: string } | null }[];
}

const POLL_INTERVAL_MS = 5000;

type StaffCandidate = {
  profile_id: string; name: string | null; email: string | null; role: string;
  is_creator: boolean; in_room: boolean; locked: boolean;
};

/**
 * 掲示した団体のメンバーに出す「トークの人員」パネル。
 * 同じ団体のメンバーを、このクエストのトークに追加・削除できる（自分の参加も含む）。
 * メールアドレスは団体長にだけ返ってくる（団体長の管理画面と同じ範囲）。
 * 応募した学生は外せない（DB側でも拒否される）。
 */
function StaffPanel({ roomId, currentUserId, onChanged }: { roomId: string; currentUserId: string; onChanged: () => void }) {
  const [candidates, setCandidates] = useState<StaffCandidate[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/talks/${roomId}/staff`);
    if (!res.ok) { setCandidates(null); return; }  // 掲示した団体のメンバーでなければ何も出さない
    setCandidates((await res.json()).candidates ?? []);
  }, [roomId]);

  useEffect(() => { load(); }, [load]);

  if (!candidates) return null;

  const toggle = async (c: StaffCandidate) => {
    setBusy(true); setErr(null);
    try {
      const res = c.in_room
        ? await fetch(`/api/talks/${roomId}/staff?profile_id=${c.profile_id}`, { method: 'DELETE' })
        : await fetch(`/api/talks/${roomId}/staff`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile_id: c.profile_id }) });
      if (!res.ok) throw new Error((await res.json()).error || '変更に失敗しました。');
      await load();
      onChanged();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const inRoom = candidates.filter(c => c.in_room).length;

  return (
    <div style={{ borderBottom: '1px solid var(--color-border)', background: '#fffbeb' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.625rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 700, color: '#92400e', textAlign: 'left' }}>
        <Users size={14} />トークの人員 — 団体のメンバー {inRoom}人が参加中
        <span style={{ marginLeft: 'auto' }}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>
      {open && (
        <div style={{ padding: '0 1.25rem 0.875rem' }}>
          <p style={{ fontSize: '0.75rem', color: '#92400e', lineHeight: 1.6, marginBottom: '0.5rem' }}>
            このクエストのトークに入れる団体のメンバーを選べます。団体のメンバーなら誰でも変更できます（応募した学生は外せません）。
          </p>
          {err && <p style={{ fontSize: '0.75rem', color: '#dc2626', marginBottom: '0.5rem' }}>{err}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {candidates.map(c => (
              <div key={c.profile_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.4375rem 0.75rem', borderRadius: '0.625rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)' }}>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-primary)' }}>
                  <span style={{ fontSize: '0.8125rem' }}>
                    {c.name ?? c.email ?? '（不明）'}
                    {c.profile_id === currentUserId && '（あなた）'}
                    {c.role === 'manager' && '（団体長）'}
                    {c.is_creator && '（掲示した人）'}
                  </span>
                  {c.email && c.name && <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginLeft: '0.375rem' }}>{c.email}</span>}
                </span>
                {c.locked ? (
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>参加中（外せません）</span>
                ) : (
                  <button onClick={() => toggle(c)} disabled={busy}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.75rem', borderRadius: '9999px', cursor: busy ? 'not-allowed' : 'pointer', flexShrink: 0,
                      ...(c.in_room
                        ? { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }
                        : { background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', border: 'none' }) }}>
                    {c.in_room
                      ? <><UserMinus size={11} />{c.profile_id === currentUserId ? '抜ける' : '外す'}</>
                      : <><UserPlus size={11} />{c.profile_id === currentUserId ? '参加する' : '追加'}</>}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


export default function TalkRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { member } = useGuild();
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [messages, setMessages] = useState<TalkMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);
  const lastTsRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // スマホ（指で操作する端末）では Enter を改行にし、送信は送信ボタンで行う。
  // パソコンでは Enter で送信、Shift+Enter で改行。
  const touchRef = useRef(false);
  useEffect(() => {
    touchRef.current = window.matchMedia('(pointer: coarse)').matches;
  }, []);

  const autoSize = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, INPUT_MAX_HEIGHT)}px`;
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    });
  };

  const appendMessages = useCallback((items: TalkMessage[]) => {
    if (items.length === 0) return;
    setMessages(prev => {
      const known = new Set(prev.map(m => m.id));
      const fresh = items.filter(m => !known.has(m.id));
      if (fresh.length === 0) return prev;
      return [...prev, ...fresh];
    });
    lastTsRef.current = items[items.length - 1].created_at;
    scrollToBottom();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/talks/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (cancelled) return;
        setRoom(data.room);
        setMessages(data.messages);
        // メッセージが1件もない部屋でも更新を拾えるよう、起点を最古の時刻にしておく。
        // （以前は起点が無いとポーリングが一度も動かず、相手の最初のメッセージが
        //   再読み込みするまで表示されなかった）
        lastTsRef.current = data.messages.length > 0
          ? data.messages[data.messages.length - 1].created_at
          : new Date(0).toISOString();
        scrollToBottom();
        // 開いたことで既読になるので、トークの未読の数字を取り直す。
        // 既読の記録はサーバーが応答の後に書くため、少し待ってから
        setTimeout(refreshBadges, 1500);
      })
      .catch(() => setError('トークルームを開けませんでした。'))
      .finally(() => setLoading(false));

    const timer = setInterval(async () => {
      if (cancelled || !lastTsRef.current) return;
      try {
        const res = await fetch(`/api/talks/${id}?after=${encodeURIComponent(lastTsRef.current)}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) appendMessages(data.messages);
        }
      } catch { /* ポーリング失敗は無視して次回に任せる */ }
    }, POLL_INTERVAL_MS);

    return () => { cancelled = true; clearInterval(timer); };
  }, [id, appendMessages]);

  const reloadRoom = useCallback(async () => {
    const res = await fetch(`/api/talks/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setRoom(data.room);
    setMessages(data.messages);
    lastTsRef.current = data.messages.length > 0 ? data.messages[data.messages.length - 1].created_at : new Date(0).toISOString();
  }, [id]);

  const send = async () => {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true); setError(null);
    try {
      const res = await fetch(`/api/talks/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const msg = await res.json();
      appendMessages([msg]);
      setInput('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
    } catch (e: any) {
      setError(e.message || '送信に失敗しました。');
    } finally {
      setSending(false);
    }
  };

  const others = (room?.members ?? []).filter(m => m.profile_id !== member.id);
  // 団体のメンバーとして開いているが、まだ自分は参加していない
  const notMember = !!room && !room.members.some(m => m.profile_id === member.id);
  const headerName = others.map(m => m.profile?.display_name ?? '不明').join('、') || 'トーク';

  let lastDate = '';

  return (
    // 高さを画面に固定し、メッセージ欄だけをスクロールさせる。
    // min-height だとメッセージの分だけページが伸び、開いたときに最新まで送れず、
    // 入力欄もページの一番下まで行かないと出てこない。
    // dvh はスマホのアドレスバーの出入りに追従する高さ。
    <div style={{ height: 'calc(100dvh - var(--header-height))', display: 'flex', flexDirection: 'column', maxWidth: 760, margin: '0 auto', padding: 'clamp(0.5rem, 2vw, 1rem) clamp(0.5rem, 3vw, 1.5rem) clamp(0.5rem, 2vw, 1.5rem)' }}>
      <SkeletonStyles />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, borderRadius: '1rem', overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--bg-card)' }}>
          <button onClick={() => router.push('/talks')} aria-label="トーク一覧へ"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, margin: '-0.375rem 0 -0.375rem -0.5rem', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--color-text-tertiary)' }}
          ><ArrowLeft size={18} /></button>
          <span style={{ width: 36, height: 36, borderRadius: '9999px', flexShrink: 0, background: 'var(--bg-dark)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
            {headerName.charAt(0)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headerName}</p>
            {room?.quest && <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📌 {room.quest.title}</p>}
          </div>
        </div>

        <StaffPanel roomId={id} currentUserId={member.id} onChanged={reloadRoom} />

        {/* メッセージ */}
        <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', padding: 'clamp(0.75rem, 3vw, 1.25rem)', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', gap: '0.375rem', minHeight: 160 }}>
          {loading ? (
            <ChatSkeleton rows={4} />
          ) : notMember ? (
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '2rem 1rem', lineHeight: 1.8 }}>
              あなたはこのトークに参加していません。<br />
              上の「トークの人員」を開いて、自分の「参加する」を押すと、内容を見てやり取りできます。
            </p>
          ) : messages.length === 0 ? (
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '2rem 0' }}>
              マッチングが成立しました🎉 まずは挨拶を送ってみましょう。
            </p>
          ) : (
            messages.map(m => {
              const mine = m.sender_id === member.id;
              const d = new Date(m.created_at);
              const dateStr = d.toLocaleDateString('ja-JP');
              const showDate = dateStr !== lastDate;
              lastDate = dateStr;
              return (
                <div key={m.id} style={{ display: 'contents' }}>
                  {showDate && (
                    <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-tertiary)', background: 'var(--bg-secondary)', padding: '0.1875rem 0.75rem', borderRadius: '9999px' }}>{dateStr}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', maxWidth: '82%', alignSelf: mine ? 'flex-end' : 'flex-start', flexDirection: mine ? 'row-reverse' : 'row' }}>
                    <div style={{ padding: '0.625rem 0.9375rem', fontSize: '0.875rem', lineHeight: 1.7, borderRadius: 14, boxShadow: 'var(--shadow-card)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      background: mine ? 'var(--bg-dark)' : 'var(--bg-card)',
                      color: mine ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                      borderBottomLeftRadius: mine ? 14 : 4, borderBottomRightRadius: mine ? 4 : 14 }}>
                      {!mine && <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--color-text-tertiary)', marginBottom: '0.125rem' }}>{m.sender?.display_name ?? '不明'}</p>}
                      {m.body}
                    </div>
                    <span style={{ fontSize: '0.625rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', paddingBottom: '0.125rem' }}>
                      {d.getHours()}:{String(d.getMinutes()).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 入力 */}
        {error && (
          <p style={{ fontSize: '0.75rem', color: '#dc2626', padding: '0.5rem 1rem 0', background: 'var(--bg-card)' }}>{error}</p>
        )}
        {!notMember && <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.625rem', padding: '0.75rem 1rem', background: 'var(--bg-card)', borderTop: '1px solid var(--color-border)' }}>
          <textarea ref={inputRef} rows={1} value={input}
            onChange={e => { setInput(e.target.value); autoSize(); }}
            onKeyDown={e => { if (!touchRef.current && !e.shiftKey && isSubmitEnter(e)) { e.preventDefault(); send(); } }}
            placeholder="メッセージを入力" autoComplete="off" maxLength={2000}
            style={{ flex: 1, resize: 'none', maxHeight: INPUT_MAX_HEIGHT, overflowY: 'auto', lineHeight: 1.5, background: 'var(--bg-base)', border: '1px solid var(--color-border)', borderRadius: '1.25rem', padding: '0.625rem 1.125rem', fontSize: '0.875rem', outline: 'none', color: 'var(--color-text-primary)', fontFamily: 'inherit' }} />
          <button onClick={send} disabled={sending} aria-label="送信"
            style={{ width: 42, height: 42, borderRadius: '9999px', flexShrink: 0, background: 'var(--bg-dark)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', opacity: sending ? 0.6 : 1 }}
          ><Send size={16} /></button>
        </div>}
        <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', padding: '0 1rem 0.75rem', background: 'var(--bg-card)', textAlign: 'center' }}>
          <ShieldCheck size={12} />安心してご利用いただくため、会話の内容は運営が確認することがあります
        </p>
      </div>
    </div>
  );
}

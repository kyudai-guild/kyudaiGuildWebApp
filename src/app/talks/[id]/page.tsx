'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, ShieldCheck } from 'lucide-react';
import { useGuild } from '@/contexts/GuildContext';

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
        if (data.messages.length > 0) lastTsRef.current = data.messages[data.messages.length - 1].created_at;
        scrollToBottom();
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
    } catch (e: any) {
      setError(e.message || '送信に失敗しました。');
    } finally {
      setSending(false);
    }
  };

  const others = (room?.members ?? []).filter(m => m.profile_id !== member.id);
  const headerName = others.map(m => m.profile?.display_name ?? '不明').join('、') || 'トーク';

  let lastDate = '';

  return (
    <div style={{ minHeight: 'calc(100vh - var(--header-height))', display: 'flex', flexDirection: 'column', maxWidth: 760, margin: '0 auto', padding: '1rem clamp(0.5rem, 3vw, 1.5rem) 1.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, borderRadius: '1rem', overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--color-border)', background: 'var(--bg-card)' }}>
          <button onClick={() => router.push('/talks')} aria-label="トーク一覧へ"
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--color-text-tertiary)', padding: '0.25rem' }}
          ><ArrowLeft size={18} /></button>
          <span style={{ width: 36, height: 36, borderRadius: '9999px', flexShrink: 0, background: 'var(--bg-dark)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
            {headerName.charAt(0)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headerName}</p>
            {room?.quest && <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📌 {room.quest.title}</p>}
          </div>
        </div>

        {/* メッセージ */}
        <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', gap: '0.375rem', minHeight: 300 }}>
          {loading ? (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '2rem 0' }}>読み込み中...</p>
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
        <div style={{ display: 'flex', gap: '0.625rem', padding: '0.875rem 1rem', background: 'var(--bg-card)', borderTop: '1px solid var(--color-border)' }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
            placeholder="メッセージを入力" autoComplete="off"
            style={{ flex: 1, background: 'var(--bg-base)', border: '1px solid var(--color-border)', borderRadius: '9999px', padding: '0.625rem 1.125rem', fontSize: '0.875rem', outline: 'none', color: 'var(--color-text-primary)' }} />
          <button onClick={send} disabled={sending} aria-label="送信"
            style={{ width: 42, height: 42, borderRadius: '9999px', flexShrink: 0, background: 'var(--bg-dark)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none', opacity: sending ? 0.6 : 1 }}
          ><Send size={16} /></button>
        </div>
        <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', padding: '0 1rem 0.75rem', background: 'var(--bg-card)', textAlign: 'center' }}>
          <ShieldCheck size={12} />安心してご利用いただくため、会話の内容は運営が確認することがあります
        </p>
      </div>
    </div>
  );
}

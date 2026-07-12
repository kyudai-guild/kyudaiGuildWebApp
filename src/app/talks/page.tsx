'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useGuild } from '@/contexts/GuildContext';

interface TalkRoom {
  id: string; created_at: string;
  quest: { id: string; title: string; quest_type: string; status: string } | null;
  members: { profile_id: string; profile: { display_name: string } | null }[];
  last_message: { body: string; created_at: string } | null;
}

export default function TalksPage() {
  const router = useRouter();
  const { member, isLoggedIn } = useGuild();
  const [rooms, setRooms] = useState<TalkRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/talks').then(r => r.ok ? r.json() : []).then(setRooms).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (!isLoggedIn && !loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>トークを見るにはログインしてください。</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--color-border)', padding: 'clamp(1rem, 4vw, 1.5rem) clamp(1rem, 4vw, 2rem)', marginBottom: '1.5rem' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <button onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 500, marginBottom: '1rem', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--color-text-tertiary)' }}
          ><ArrowLeft size={14} />ホームへ戻る</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--bg-dark)' }}>
              <MessageCircle size={18} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>トーク</h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>マッチングが成立したクエストの連絡用トークルーム</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem) 3rem' }}>
        {loading ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)', padding: '2rem 0', textAlign: 'center' }}>読み込み中...</p>
        ) : rooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: '1rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)' }}>
            <MessageCircle size={32} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
              まだトークルームがありません。<br />クエストの応募が承認されると、依頼者とのトークルームが自動で作られます。
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {rooms.map(room => {
              const others = room.members.filter(m => m.profile_id !== member.id);
              const names = others.map(m => m.profile?.display_name ?? '不明').join('、') || 'メンバーなし';
              return (
                <button key={room.id} onClick={() => router.push(`/talks/${room.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left', width: '100%', padding: '1rem 1.25rem', borderRadius: '1rem', cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)', transition: 'box-shadow 0.2s' }}
                >
                  <span style={{ width: 44, height: 44, borderRadius: '9999px', flexShrink: 0, background: 'var(--bg-dark)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.125rem', fontFamily: 'var(--font-display)' }}>
                    {names.charAt(0)}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 700 }}>{names}</span>
                      {room.quest && (
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--color-primary)', background: '#f2f7f4', border: '1px solid #cfe3d8', padding: '0.125rem 0.625rem', borderRadius: '9999px' }}>
                          📌 {room.quest.title}
                        </span>
                      )}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.25rem' }}>
                      {room.last_message?.body ?? 'まだメッセージがありません'}
                    </span>
                  </span>
                  {room.last_message && (
                    <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                      {new Date(room.last_message.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: '1.5rem' }}>
          安心してご利用いただくため、会話の内容は運営が確認することがあります
        </p>
      </div>
    </div>
  );
}

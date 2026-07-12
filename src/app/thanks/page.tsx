'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Heart } from 'lucide-react';

interface ThanksItem {
  id: string; message: string; created_at: string;
  quest: { title: string } | null;
  sender: { display_name: string } | null;
  recipient: { display_name: string } | null;
}

export default function ThanksPage() {
  const router = useRouter();
  const [dir, setDir] = useState<'received' | 'sent'>('received');
  const [items, setItems] = useState<ThanksItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (d: 'received' | 'sent', offset: number) => {
    const res = await fetch(`/api/thanks?dir=${d}&offset=${offset}`);
    if (!res.ok) return { items: [], hasMore: false };
    return res.json();
  }, []);

  useEffect(() => {
    setLoading(true);
    load(dir, 0).then(data => { setItems(data.items); setHasMore(data.hasMore); }).finally(() => setLoading(false));
  }, [dir, load]);

  const loadMore = async () => {
    const data = await load(dir, items.length);
    setItems(prev => [...prev, ...data.items]);
    setHasMore(data.hasMore);
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--color-border)', padding: 'clamp(1rem, 4vw, 1.5rem) clamp(1rem, 4vw, 2rem)', marginBottom: '1.5rem' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <button onClick={() => router.push('/profile')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 500, marginBottom: '1rem', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--color-text-tertiary)' }}
          ><ArrowLeft size={14} />プロフィールへ戻る</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--bg-dark)' }}>
              <Heart size={18} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>感謝の言葉</h1>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>クエストが完了すると、当事者同士で感謝のメッセージを送り合えます。</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem) 3rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {([['received', 'もらった感謝'], ['sent', 'おくった感謝']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setDir(key)}
              style={{ fontSize: '0.8125rem', fontWeight: 600, padding: '0.375rem 0.9375rem', borderRadius: '9999px', cursor: 'pointer',
                background: dir === key ? 'var(--bg-dark)' : 'var(--bg-card)',
                color: dir === key ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                border: dir === key ? '1px solid var(--bg-dark)' : '1px solid var(--color-border)' }}
            >{label}</button>
          ))}
        </div>

        {loading ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)', padding: '2rem 0', textAlign: 'center' }}>読み込み中...</p>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', borderRadius: '1rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)' }}>
            <Heart size={32} style={{ color: 'var(--color-text-tertiary)', margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>
              {dir === 'received' ? 'まだ感謝の言葉は届いていません。クエストを完了すると、依頼者から感謝が届きます。' : 'まだ感謝を送っていません。完了したクエストの相手に感謝を伝えましょう。'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.map(t => {
              const name = dir === 'received' ? (t.sender?.display_name ?? '不明') : `あなた → ${t.recipient?.display_name ?? '不明'}`;
              return (
                <div key={t.id} style={{ position: 'relative', overflow: 'hidden', padding: '1.25rem 1.5rem', borderRadius: '1rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}>
                  <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'linear-gradient(180deg, var(--color-accent), var(--color-accent-light))' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ width: 36, height: 36, borderRadius: '9999px', flexShrink: 0, background: 'var(--bg-secondary)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem' }}>
                      {(dir === 'received' ? t.sender?.display_name : t.recipient?.display_name)?.charAt(0) ?? '?'}
                    </span>
                    <span>
                      <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700 }}>{name}</span>
                      {t.quest && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>📌 {t.quest.title}</span>}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{new Date(t.created_at).toLocaleDateString('ja-JP')}</span>
                  </div>
                  <p style={{ fontSize: '0.9375rem', lineHeight: 1.9, paddingLeft: '0.25rem' }}>
                    <span style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, lineHeight: 0, verticalAlign: '-0.375rem', marginRight: '0.25rem' }}>“</span>
                    {t.message}
                  </p>
                </div>
              );
            })}
            {hasMore && (
              <button onClick={loadMore}
                style={{ margin: '0.5rem auto 0', fontSize: '0.8125rem', fontWeight: 600, padding: '0.625rem 1.5rem', borderRadius: '9999px', cursor: 'pointer', color: 'var(--color-text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--color-border)' }}
              >もっと見る</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

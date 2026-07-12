'use client';

import { useState } from 'react';
import { X, Heart } from 'lucide-react';

const TEMPLATES = [
  'ありがとうございました！とても助かりました。',
  '丁寧で迅速な対応に感謝します。またお願いしたいです！',
  '期待以上の仕上がりでした。本当にありがとうございます！',
];

// 感謝の言葉を送るモーダル
export default function ThanksModal({
  questTitle, recipientName, onSend, onClose,
}: {
  questTitle: string;
  recipientName: string;
  onSend: (message: string) => Promise<void>;
  onClose: () => void;
}) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!message.trim()) { setError('メッセージを入力してください。'); return; }
    setSending(true); setError(null);
    try {
      await onSend(message.trim());
      onClose();
    } catch (e: any) {
      setError(e.message || '送信に失敗しました。');
    } finally {
      setSending(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(15,10,5,0.4)', backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 480, borderRadius: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: '0 12px 40px rgba(31,20,15,0.12)', padding: '1.75rem' }}>
        <button onClick={onClose} aria-label="閉じる"
          style={{ position: 'absolute', top: '1rem', right: '1rem', width: 32, height: 32, borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
        ><X size={16} /></button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
          <Heart size={18} style={{ color: 'var(--color-accent)' }} />
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>感謝の言葉をおくる</h3>
        </div>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
          「{questTitle}」について、<b style={{ color: 'var(--color-text-primary)' }}>{recipientName}</b> さんへ
        </p>

        {error && (
          <div style={{ padding: '0.625rem 0.875rem', borderRadius: '0.75rem', marginBottom: '0.75rem', fontSize: '0.8125rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>{error}</div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {TEMPLATES.map(t => (
            <button key={t} onClick={() => setMessage(t)}
              style={{ fontSize: '0.75rem', fontWeight: 500, padding: '0.375rem 0.75rem', borderRadius: '9999px', cursor: 'pointer', background: 'var(--bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
            >{t.slice(0, 12)}…</button>
          ))}
        </div>

        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="感謝の気持ちを言葉にして送りましょう"
          style={{ width: '100%', minHeight: 110, resize: 'vertical', background: 'var(--bg-base)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box' }} />

        <button onClick={submit} disabled={sending}
          style={{ width: '100%', marginTop: '1rem', padding: '0.875rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', cursor: 'pointer', border: 'none' }}
        >{sending ? '送信中...' : '感謝をおくる'}</button>
        <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: '0.625rem', textAlign: 'center' }}>※送った感謝は相手のプロフィールに表示され、1クエストにつき1回送れます。</p>
      </div>
    </div>
  );
}

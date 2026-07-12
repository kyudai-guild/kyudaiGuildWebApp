'use client';

import { useState, useEffect } from 'react';
import { X, Award, Heart } from 'lucide-react';

interface UserProfile {
  id: string; display_name: string | null; bio: string | null;
  qualifications: string[]; tags: string[]; member_since: string | null;
  purposes: string[]; interests: string[];
  accepted_completed: number; thanks_received: number;
}

// 応募者などのプロフィールを確認するモーダル
export default function UserProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setProfile)
      .catch(() => setError('プロフィールの取得に失敗しました。'));
  }, [userId]);

  const chipRow = (label: string, values: string[]) => values.length > 0 && (
    <div style={{ marginBottom: '0.875rem' }}>
      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>{label}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
        {values.map(v => (
          <span key={v} style={{ fontSize: '0.75rem', fontWeight: 600, background: 'var(--bg-base)', border: '1px solid var(--color-border)', borderRadius: '9999px', padding: '0.1875rem 0.625rem' }}>{v}</span>
        ))}
      </div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(15,10,5,0.4)', backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 440, maxHeight: '85vh', overflowY: 'auto', borderRadius: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: '0 12px 40px rgba(31,20,15,0.12)', padding: '1.75rem' }}>
        <button onClick={onClose} aria-label="閉じる"
          style={{ position: 'absolute', top: '1rem', right: '1rem', width: 32, height: 32, borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
        ><X size={16} /></button>

        {error ? (
          <p style={{ fontSize: '0.875rem', color: '#dc2626', padding: '2rem 0', textAlign: 'center' }}>{error}</p>
        ) : !profile ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)', padding: '2rem 0', textAlign: 'center' }}>読み込み中...</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: '9999px', flexShrink: 0, background: 'var(--bg-dark)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.375rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                {profile.display_name?.charAt(0) ?? '?'}
              </div>
              <div>
                <p style={{ fontSize: '1.125rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{profile.display_name ?? '名無しの冒険者'}</p>
                {profile.member_since && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                    {new Date(profile.member_since).getFullYear()}年{new Date(profile.member_since).getMonth() + 1}月からギルドに参加
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'var(--bg-base)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}><Award size={11} />受注完了</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{profile.accepted_completed}<span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>件</span></p>
              </div>
              <div style={{ background: 'var(--bg-base)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '0.75rem 1rem' }}>
                <p style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}><Heart size={11} />もらった感謝</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{profile.thanks_received}<span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>通</span></p>
              </div>
            </div>

            {profile.bio && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>できること・自己PR</p>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.8, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{profile.bio}</p>
              </div>
            )}
            {chipRow('資格・スキル', profile.qualifications)}
            {chipRow('興味のある分野', profile.interests)}
            {chipRow('利用目的', profile.purposes)}
          </>
        )}
      </div>
    </div>
  );
}

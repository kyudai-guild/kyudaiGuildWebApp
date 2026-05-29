'use client';

import { useState } from 'react';
import { Shield, LogIn, Edit2, Check, X } from 'lucide-react';
import { useGuild } from '@/contexts/GuildContext';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export default function MemberCard() {
  const { isLoggedIn, member, updateProfile } = useGuild();
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const initial = member.name ? member.name.charAt(0).toUpperCase() : '?';

  const saveEdit = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ display_name: newName.trim() }).eq('id', member.id);
      if (!error) { await updateProfile({ name: newName.trim() }); setEditing(false); }
    } finally { setSaving(false); }
  };

  const card: React.CSSProperties = { borderRadius: '1rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' };
  const iconBox = (size: number): React.CSSProperties => ({ width: size, height: size, borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--bg-dark)' });
  const iconBtnS: React.CSSProperties = { padding: '0.375rem', borderRadius: '0.5rem', cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' };

  if (!isLoggedIn) {
    return (
      <div style={{ ...card, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ ...iconBox(64), marginBottom: '1rem' }}>
          <Shield size={28} style={{ color: 'var(--color-accent)' }} />
        </div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
          ギルドに参加する
        </h3>
        <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
          九大メールアドレスで登録すると、クエストへの応募や依頼の掲示ができます。
        </p>
        <button
          onClick={() => router.push('/auth')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, padding: '0.75rem 1.5rem', borderRadius: '9999px', background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', cursor: 'pointer', transition: 'background 0.2s, transform 0.2s', border: 'none' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
        >
          <LogIn size={15} />ログイン / 新規登録
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...card, padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ ...iconBox(56), fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                style={{ fontSize: '1rem', fontWeight: 600, padding: '0.25rem 0.75rem', borderRadius: '0.5rem', outline: 'none', border: '1px solid var(--color-primary)', color: 'var(--color-text-primary)', background: 'var(--bg-base)', boxShadow: '0 0 0 3px rgba(26,74,58,0.1)', boxSizing: 'border-box', flex: 1, minWidth: 0 }}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
              />
              <button onClick={saveEdit} disabled={saving} style={{ ...iconBtnS, color: '#16a34a' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f0fdf4'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              ><Check size={14} /></button>
              <button onClick={() => setEditing(false)} style={{ ...iconBtnS, color: 'var(--color-text-tertiary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              ><X size={14} /></button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                {member.name || '名無しの冒険者'}
              </h3>
              <button onClick={() => { setNewName(member.name || ''); setEditing(true); }} style={{ ...iconBtnS, flexShrink: 0, color: 'var(--color-text-tertiary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'; }}
              ><Edit2 size={12} /></button>
            </div>
          )}
          <p style={{ fontSize: '0.75rem', marginTop: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-tertiary)' }}>
            {member.email || '九州大学'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)' }}>所属</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>九州大学</span>
        </div>
        {member.joinDate && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)' }}>参加日</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
              {new Date(member.joinDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' })}
            </span>
          </div>
        )}
        {member.role === 'admin' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-tertiary)' }}>役割</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '9999px', background: '#ecfdf5', color: '#059669' }}>
              <Shield size={10} />管理者
            </span>
          </div>
        )}
      </div>

      {member.tags && member.tags.length > 0 && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', color: 'var(--color-text-tertiary)' }}>スキル</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {member.tags.map(tag => (
              <span key={tag} style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', borderRadius: '9999px', fontWeight: 500, color: 'var(--color-text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

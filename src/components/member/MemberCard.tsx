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

  const startEdit = () => {
    setNewName(member.name || '');
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: newName.trim() })
        .eq('id', member.id);
      if (!error) {
        await updateProfile({ name: newName.trim() });
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div
        className="rounded-2xl p-8 flex flex-col items-center text-center"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--bg-dark)' }}
        >
          <Shield size={28} style={{ color: 'var(--color-accent)' }} />
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
          ギルドに参加する
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
          九大メールアドレスで登録すると、クエストへの応募や依頼の掲示ができます。
        </p>
        <button
          onClick={() => router.push('/auth')}
          className="flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-full transition-all hover:-translate-y-px"
          style={{ background: 'var(--bg-dark)', color: 'var(--color-text-inverse)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; }}
        >
          <LogIn size={15} />ログイン / 新規登録
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-card)' }}
    >
      {/* Avatar + Name */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-extrabold"
          style={{ background: 'var(--bg-dark)', color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="text-base font-semibold px-3 py-1.5 rounded-lg outline-none flex-1 min-w-0"
                style={{ border: '1px solid var(--color-primary)', color: 'var(--color-text-primary)', background: 'var(--bg-base)', boxShadow: '0 0 0 3px rgba(26,74,58,0.1)' }}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
              />
              <button onClick={saveEdit} disabled={saving} className="p-1.5 rounded-lg transition-colors" style={{ color: '#16a34a' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f0fdf4'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              ><Check size={15} /></button>
              <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-tertiary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              ><X size={15} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold truncate" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                {member.name || '名無しの冒険者'}
              </h3>
              <button onClick={startEdit} className="p-1 rounded transition-colors flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'; }}
              ><Edit2 size={12} /></button>
            </div>
          )}
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-tertiary)' }}>
            {member.email || '九州大学'}
          </p>
        </div>
      </div>

      {/* Meta */}
      <div className="space-y-3 pt-5 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>所属</span>
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>九州大学</span>
        </div>
        {member.joinDate && (
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>参加日</span>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {new Date(member.joinDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short' })}
            </span>
          </div>
        )}
        {member.role === 'admin' && (
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>役割</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Shield size={10} />管理者
            </span>
          </div>
        )}
      </div>

      {/* Tags */}
      {member.tags && member.tags.length > 0 && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-tertiary)' }}>スキル</p>
          <div className="flex flex-wrap gap-1.5">
            {member.tags.map(tag => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ color: 'var(--color-text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

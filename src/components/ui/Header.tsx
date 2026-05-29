'use client';

import { useState, useEffect } from 'react';
import { useGuild } from '@/contexts/GuildContext';
import { Scroll, Shield, LogIn, LogOut, Menu, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export default function Header() {
  const { isLoggedIn, isAdmin } = useGuild();
  const router = useRouter();
  const supabase = createClient();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setMobileOpen(false);
    router.refresh();
    window.location.reload();
  };

  return (
    <>
      <header
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          height: 'var(--header-height)',
          background: scrolled ? 'rgba(245,243,239,0.97)' : 'rgba(245,243,239,0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: scrolled ? '1px solid var(--color-border)' : 'none',
          boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
          transition: 'background 0.4s, box-shadow 0.4s, border-color 0.4s',
        }}
      >
        <div className="max-w-6xl mx-auto h-full px-6 sm:px-8 flex items-center justify-between">
          <button onClick={() => router.push('/')} className="flex items-center gap-2">
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36,
              background: 'var(--bg-dark)',
              color: 'var(--color-accent)',
              fontSize: '1.125rem', fontWeight: 800,
              borderRadius: 'var(--radius-md)',
              flexShrink: 0,
            }}>G</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '0.02em' }}>
              Guild
            </span>
          </button>

          <nav className="hidden sm:flex items-center gap-1">
            <a href="#quest-board" className="text-sm font-medium px-4 py-2 rounded-lg transition-colors" style={{ color: 'var(--color-text-secondary)' }}
              onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, { color: 'var(--color-text-primary)', background: 'var(--bg-secondary)' })}
              onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, { color: 'var(--color-text-secondary)', background: 'transparent' })}
            >掲示板</a>
            {isLoggedIn && (
              <button onClick={() => router.push('/my-quests')} className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-colors" style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, { color: 'var(--color-text-primary)', background: 'var(--bg-secondary)' })}
                onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, { color: 'var(--color-text-secondary)', background: 'transparent' })}
              ><Scroll size={14} />マイクエスト</button>
            )}
            {isAdmin && (
              <button onClick={() => router.push('/admin')} className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg transition-colors" style={{ color: 'var(--color-primary)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              ><Shield size={14} />管理</button>
            )}
            {isLoggedIn ? (
              <button onClick={handleSignOut} className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-colors" style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, { color: 'var(--color-text-primary)', background: 'var(--bg-secondary)' })}
                onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, { color: 'var(--color-text-secondary)', background: 'transparent' })}
              ><LogOut size={14} />ログアウト</button>
            ) : (
              <button onClick={() => router.push('/auth')} className="flex items-center gap-1.5 text-sm font-semibold px-6 py-2 rounded-full ml-4 transition-all hover:-translate-y-px" style={{ background: 'var(--bg-dark)', color: 'var(--color-text-inverse)' }}>
                <LogIn size={14} />ログイン
              </button>
            )}
          </nav>

          <button onClick={() => setMobileOpen(!mobileOpen)} aria-label="メニュー" className="sm:hidden p-2" style={{ color: 'var(--color-text-primary)' }}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-[99] flex flex-col" style={{ top: 'var(--header-height)', background: 'var(--bg-base)', padding: '2rem' }}>
          <a href="#quest-board" onClick={() => setMobileOpen(false)} className="block text-xl font-semibold py-4 border-b" style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>掲示板</a>
          {isLoggedIn && (
            <button onClick={() => { router.push('/my-quests'); setMobileOpen(false); }} className="flex items-center gap-2 text-xl font-semibold py-4 border-b text-left" style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>
              <Scroll size={18} />マイクエスト
            </button>
          )}
          {isAdmin && (
            <button onClick={() => { router.push('/admin'); setMobileOpen(false); }} className="flex items-center gap-2 text-xl font-semibold py-4 border-b text-left" style={{ color: 'var(--color-primary)', borderColor: 'var(--color-border)' }}>
              <Shield size={18} />管理
            </button>
          )}
          {isLoggedIn ? (
            <button onClick={handleSignOut} className="flex items-center gap-2 text-base font-semibold py-4 mt-4 text-left" style={{ color: 'var(--color-text-secondary)' }}>
              <LogOut size={16} />ログアウト
            </button>
          ) : (
            <button onClick={() => { router.push('/auth'); setMobileOpen(false); }} className="inline-flex items-center gap-2 text-base font-semibold px-8 py-4 rounded-full mt-6 self-start" style={{ background: 'var(--bg-dark)', color: 'var(--color-text-inverse)' }}>
              <LogIn size={16} />ログイン
            </button>
          )}
        </div>
      )}
    </>
  );
}

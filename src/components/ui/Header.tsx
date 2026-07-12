'use client';

import { useState, useEffect } from 'react';
import { useGuild } from '@/contexts/GuildContext';
import { Scroll, Shield, LogIn, LogOut, Menu, X, CalendarDays, UserRound, MessageCircle } from 'lucide-react';
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
      <style>{`
        .header-mobile-btn { display: none; }
        @media (max-width: 639px) {
          .header-desktop-nav { display: none !important; }
          .header-mobile-btn { display: flex; }
        }
        .header-nav-link {
          display: flex; align-items: center; gap: 0.35rem;
          font-size: 0.875rem; font-weight: 500;
          color: var(--color-text-secondary);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          transition: color 0.2s, background 0.2s;
          background: transparent;
        }
        .header-nav-link:hover {
          color: var(--color-text-primary);
          background: var(--bg-secondary);
        }
        .header-cta {
          display: flex; align-items: center; gap: 0.4rem;
          font-size: 0.875rem; font-weight: 600;
          color: var(--color-text-inverse);
          background: var(--bg-dark);
          padding: 0.5rem 1.5rem;
          border-radius: var(--radius-full);
          margin-left: 1rem;
          transition: background 0.2s, transform 0.2s;
        }
        .header-cta:hover {
          background: var(--bg-dark-hover);
          transform: translateY(-1px);
        }
      `}</style>

      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 'var(--header-height)',
        background: scrolled ? 'rgba(245,243,239,0.97)' : 'rgba(245,243,239,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: scrolled ? '1px solid var(--color-border)' : 'none',
        boxShadow: scrolled ? '0 1px 2px rgba(31,20,15,0.04)' : 'none',
        transition: 'background 0.4s, box-shadow 0.4s',
      }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', height: '100%', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo */}
          <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, flexShrink: 0,
              background: 'var(--bg-dark)',
              color: 'var(--color-accent)',
              fontSize: '1.125rem', fontWeight: 800,
              borderRadius: 'var(--radius-md)',
            }}>G</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '0.02em' }}>
              Guild
            </span>
          </button>

          {/* Desktop Nav */}
          <nav className="header-desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <a href="/#quest-board" className="header-nav-link">掲示板</a>
            <button onClick={() => router.push('/events')} className="header-nav-link">
              <CalendarDays size={14} />イベント
            </button>
            {isLoggedIn && (
              <button onClick={() => router.push('/my-quests')} className="header-nav-link">
                <Scroll size={14} />マイクエスト
              </button>
            )}
            {isLoggedIn && (
              <button onClick={() => router.push('/talks')} className="header-nav-link">
                <MessageCircle size={14} />トーク
              </button>
            )}
            {isLoggedIn && (
              <button onClick={() => router.push('/profile')} className="header-nav-link">
                <UserRound size={14} />プロフィール
              </button>
            )}
            {isAdmin && (
              <button onClick={() => router.push('/admin')} className="header-nav-link" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                <Shield size={14} />管理
              </button>
            )}
            {isLoggedIn ? (
              <button onClick={handleSignOut} className="header-nav-link">
                <LogOut size={14} />ログアウト
              </button>
            ) : (
              <button onClick={() => router.push('/auth')} className="header-cta">
                <LogIn size={14} />ログイン
              </button>
            )}
          </nav>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="メニュー"
            className="header-mobile-btn"
            style={{ padding: '0.5rem', color: 'var(--color-text-primary)', alignItems: 'center', justifyContent: 'center' }}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', top: 'var(--header-height)', left: 0, right: 0, bottom: 0,
          background: 'var(--bg-base)',
          zIndex: 99,
          padding: '2rem',
          display: 'flex', flexDirection: 'column', gap: '0.25rem',
        }}>
          <a href="/#quest-board" onClick={() => setMobileOpen(false)}
            style={{ display: 'block', fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', padding: '1rem 0', borderBottom: '1px solid var(--color-border)' }}
          >掲示板</a>
          <button onClick={() => { router.push('/events'); setMobileOpen(false); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', padding: '1rem 0', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}
          ><CalendarDays size={18} />イベント</button>
          {isLoggedIn && (
            <button onClick={() => { router.push('/my-quests'); setMobileOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', padding: '1rem 0', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}
            ><Scroll size={18} />マイクエスト</button>
          )}
          {isLoggedIn && (
            <button onClick={() => { router.push('/talks'); setMobileOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', padding: '1rem 0', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}
            ><MessageCircle size={18} />トーク</button>
          )}
          {isLoggedIn && (
            <button onClick={() => { router.push('/profile'); setMobileOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', padding: '1rem 0', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}
            ><UserRound size={18} />プロフィール</button>
          )}
          {isAdmin && (
            <button onClick={() => { router.push('/admin'); setMobileOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-primary)', padding: '1rem 0', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}
            ><Shield size={18} />管理</button>
          )}
          {isLoggedIn ? (
            <button onClick={handleSignOut}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-secondary)', padding: '1rem 0', marginTop: '1rem', textAlign: 'left' }}
            ><LogOut size={16} />ログアウト</button>
          ) : (
            <button onClick={() => { router.push('/auth'); setMobileOpen(false); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-inverse)', background: 'var(--bg-dark)', padding: '1rem 2rem', borderRadius: 'var(--radius-full)', marginTop: '1.5rem', alignSelf: 'flex-start' }}
            ><LogIn size={16} />ログイン</button>
          )}
        </div>
      )}
    </>
  );
}

'use client';

import Link from 'next/link';
import { Home, CalendarDays, Scroll, MessageCircle, UserRound } from 'lucide-react';

/**
 * スマホの画面下に常に出すメニュー（ログイン中のみ）。
 * よく使う画面へ1回で移動でき、要対応件数・未読も常に見える。
 * 表示するかどうか（ページごと）は Header 側で決める。
 */

const TABS = [
  { href: '/', label: 'ホーム', icon: Home, match: (p: string) => p === '/' },
  { href: '/events', label: 'イベント', icon: CalendarDays, match: (p: string) => p.startsWith('/events') },
  { href: '/my-quests', label: 'マイクエスト', icon: Scroll, match: (p: string) => p.startsWith('/my-quests') },
  { href: '/talks', label: 'トーク', icon: MessageCircle, match: (p: string) => p.startsWith('/talks') },
  { href: '/profile', label: 'プロフィール', icon: UserRound, match: (p: string) => p.startsWith('/profile') },
] as const;

export const TAB_BAR_HEIGHT = 60;

export const MOBILE_TAB_BAR_STYLES = `
  .mobile-tabbar { display: none; }
  @media (max-width: 639px) {
    .mobile-tabbar { display: grid; }
    /* 下部メニューの分だけ、ページの一番下を空ける（最後の要素が隠れないように） */
    body:has(.mobile-tabbar) main { padding-bottom: calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px)); }
  }
  .mobile-tab { -webkit-tap-highlight-color: transparent; }
  .mobile-tab:active { background: rgba(31,20,15,0.04); }
`;

export default function MobileTabBar({ pathname, badges }: {
  pathname: string;
  badges: { myQuests: number; talks: number };
}) {
  const countFor = (href: string) => (href === '/my-quests' ? badges.myQuests : href === '/talks' ? badges.talks : 0);

  return (
    <nav className="mobile-tabbar" aria-label="メインメニュー" style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 90,
      gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
      height: `calc(${TAB_BAR_HEIGHT}px + env(safe-area-inset-bottom, 0px))`,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      background: 'rgba(245,243,239,0.97)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      borderTop: '1px solid var(--color-border)',
    }}>
      {TABS.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        const n = countFor(href);
        return (
          <Link key={href} href={href} className="mobile-tab" aria-current={active ? 'page' : undefined}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              color: active ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
            }}>
            <span style={{ position: 'relative', display: 'flex' }}>
              <Icon size={21} strokeWidth={active ? 2.4 : 1.8} />
              {n > 0 && (
                <span aria-label={`${n}件`} style={{
                  position: 'absolute', top: -5, left: 13, minWidth: 16, height: 16, padding: '0 4px',
                  borderRadius: 9999, background: '#dc2626', color: '#fff', border: '1.5px solid #f5f3ef',
                  fontSize: '0.5625rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                }}>{n > 9 ? '9+' : n}</span>
              )}
            </span>
            <span style={{ fontSize: '0.625rem', fontWeight: active ? 700 : 500, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

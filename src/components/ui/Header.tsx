'use client';

import { useGuild } from '@/contexts/GuildContext';
import { Sword, Bell, LogIn, LogOut, Wifi } from 'lucide-react';
import { motion } from 'framer-motion';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function Header() {
  const { stamps, isLoggedIn, autoCheckInEnabled, setAutoCheckInEnabled, isAtBase } = useGuild();
  const { data: session } = useSession();
  const stampCount = stamps.filter(Boolean).length;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16">
      <div className="absolute inset-0 bg-[var(--bg-card)] border-b-4 border-[var(--border-outer)] shadow-[0_4px_0_rgba(0,0,0,0.15)]" />

      <div className="relative h-full max-w-5xl mx-auto px-4 flex items-center justify-between">
        {/* ロゴ */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center bg-[var(--bg-base)] border-2 border-[var(--border-outer)] shadow-[inset_2px_2px_0_rgba(0,0,0,0.15)]">
            <Sword size={16} className="text-[var(--gold-light)]" />
          </div>
          <span className="font-rpg font-black text-sm tracking-widest text-[var(--gold-light)] hidden sm:block" style={{ textShadow: '2px 2px 0 var(--border-inner)' }}>
            九大ギルド
          </span>
        </div>

        {/* 右側コントロール */}
        <div className="flex items-center gap-3">
          {/* Discordログインボタン */}
          {session ? (
            <button
              onClick={() => signOut()}
              className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">退出</span>
            </button>
          ) : (
            <button
              onClick={() => signIn('discord')}
              className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold bg-[#5865F2] text-white hover:bg-[#4752C4] transition-colors border-2 border-[#4752C4] shadow-[2px_2px_0_rgba(0,0,0,0.3)]"
            >
              <LogIn size={14} />
              <span className="hidden sm:inline">Discordで入室</span>
            </button>
          )}

          {/* スタンプ数バッジ */}
          {stampCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-base)] border-2 border-[var(--border-outer)] text-xs font-bold text-[var(--gold-light)] shadow-[inset_2px_2px_0_rgba(0,0,0,0.15)]"
            >
              <span>🎫</span>
              <span>{stampCount} / 10</span>
            </motion.div>
          )}

          {/* Wi-Fi自動チェックイン設定 */}
          {isLoggedIn && (
            <button
              onClick={() => setAutoCheckInEnabled(!autoCheckInEnabled)}
              className={`relative w-9 h-9 border-2 flex items-center justify-center transition-all duration-300 shadow-[inset_2px_2px_0_rgba(0,0,0,0.15)] ${
                !autoCheckInEnabled
                  ? 'bg-[var(--bg-base)] border-[var(--border-outer)] text-[var(--gold-dark)] opacity-40 hover:opacity-100'
                  : isAtBase
                  ? 'bg-green-700 border-green-400 text-white'
                  : 'bg-[var(--gold-dark)] border-[var(--gold-light)] text-white'
              }`}
              title={
                !autoCheckInEnabled
                  ? 'Wi-Fi自動チェックイン: OFF（クリックで有効化）'
                  : isAtBase
                  ? '🏠 拠点のWi-Fi検出中！自動チェックイン有効'
                  : '📡 拠点Wi-Fi外 — 拠点に到着すると自動チェックイン'
              }
            >
              <Wifi size={16} />
              {autoCheckInEnabled && (
                <motion.span
                  layoutId="wifi-active"
                  className={`absolute -top-1 -right-1 w-2.5 h-2.5 border-2 border-[var(--bg-card)] rounded-full ${isAtBase ? 'bg-green-400' : 'bg-yellow-400'}`}
                />
              )}
            </button>
          )}

          {/* 通知ベル */}
          <button
            id="header-notification-btn"
            className="relative w-9 h-9 bg-[var(--bg-base)] border-2 border-[var(--border-outer)] flex items-center justify-center text-[var(--gold-light)] hover:bg-[var(--border-inner)] transition-colors shadow-[inset_2px_2px_0_rgba(0,0,0,0.15)]"
            aria-label="通知"
          >
            <Bell size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}


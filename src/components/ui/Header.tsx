'use client';

import { useGuild } from '@/contexts/GuildContext';
import { Sword, LogIn, LogOut, Scroll, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

export default function Header() {
  const { isLoggedIn, isAdmin } = useGuild();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    window.location.reload();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16">
      <div className="absolute inset-0 bg-[var(--bg-card)] border-b-4 border-[var(--border-outer)] shadow-[0_4px_0_rgba(0,0,0,0.15)]" />

      <div className="relative h-full max-w-5xl mx-auto px-4 flex items-center justify-between">
        {/* ロゴ */}
        <button onClick={() => router.push('/')} className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center bg-[var(--bg-base)] border-2 border-[var(--border-outer)] shadow-[inset_2px_2px_0_rgba(0,0,0,0.15)]">
            <Sword size={16} className="text-[var(--gold-light)]" />
          </div>
          <span className="font-rpg font-black text-sm tracking-widest text-[var(--gold-light)] hidden sm:block" style={{ textShadow: '2px 2px 0 var(--border-inner)' }}>
            九大ギルド
          </span>
        </button>

        {/* 右側コントロール */}
        <div className="flex items-center gap-2">
          {isLoggedIn && (
            <>
              <button
                onClick={() => router.push('/my-quests')}
                className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-[#cfbeaf] hover:text-[var(--gold-light)] transition-colors border border-[rgba(139,115,85,0.3)] hover:border-[var(--gold-dark)] rounded-sm"
              >
                <Scroll size={13} />
                <span className="hidden sm:inline">マイクエスト</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-100 transition-colors border border-amber-500/30 hover:border-amber-400 rounded-sm"
                >
                  <Shield size={13} />
                  <span className="hidden sm:inline">管理</span>
                </button>
              )}

              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">退出</span>
              </button>
            </>
          )}

          {!isLoggedIn && (
            <button
              onClick={() => router.push('/auth')}
              className="px-3 py-1.5 flex items-center gap-1.5 text-xs font-bold bg-[var(--gold-dark)] text-white hover:brightness-110 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.3)]"
            >
              <LogIn size={14} />
              <span className="hidden sm:inline">ギルドへ入室</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}


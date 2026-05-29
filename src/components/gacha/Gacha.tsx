'use client';

import { useState } from 'react';
import { useGuild } from '@/contexts/GuildContext';

type GachaResult = {
  rarity: 'common' | 'rare' | 'epic';
  type: string;
  label: string;
  description: string;
};
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Lock, RotateCcw } from 'lucide-react';

const RARITY_STYLES: Record<GachaResult['rarity'], { border: string; glow: string; badge: string; label: string }> = {
  common: {
    border: 'border-slate-600',
    glow: 'rgba(148,163,184,0.2)',
    badge: 'bg-slate-700 text-[var(--gold-light)]',
    label: 'コモン',
  },
  rare: {
    border: 'border-blue-500/60',
    glow: 'rgba(59,130,246,0.3)',
    badge: 'bg-blue-900 text-blue-300',
    label: 'レア',
  },
  epic: {
    border: 'border-[var(--gold)]/60',
    glow: 'rgba(212,175,55,0.4)',
    badge: 'bg-yellow-900/50 text-[var(--gold)]',
    label: 'エピック',
  },
};

export default function Gacha() {
  const { isLoggedIn } = useGuild();
  const gachaAvailable = false;
  const spinGacha = (): GachaResult => ({ rarity: 'common', type: '', label: '', description: '' });
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<GachaResult | null>(null);

  const handleSpin = async () => {
    if (!gachaAvailable || spinning) return;
    setSpinning(true);
    setResult(null);

    // スピンアニメーション待機    await new Promise((r) => setTimeout(r, 1200));

    const r = spinGacha();
    setResult(r);
    setSpinning(false);
  };

  const rarityStyle = result ? RARITY_STYLES[result.rarity] : null;

  return (
    <section id="gacha" className="w-full max-w-5xl mx-auto px-4 py-12">
      {/* タイトル */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 rounded-sm border-2 bg-[var(--gold)]/10 border border-[var(--gold)]/30 flex items-center justify-center">
          <Sparkles size={16} className="text-[var(--gold)]" />
        </div>
        <div>
          <h2 className="font-rpg font-bold text-xl text-gold-gradient">Guild Gacha</h2>
          <p className="text-xs text-[var(--gold)]">ログイン後に1回ガチャが引ける！</p>
        </div>
      </div>

      <div className="rpg-card p-6 flex flex-col items-center gap-6">
        {/* ガチャ宝箱 */}
        <div className="relative">
          <motion.div
            id="gacha-chest"
            animate={spinning ? { rotateY: [0, 360, 720], scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            className="w-32 h-32 rounded-md border-4 flex items-center justify-center text-6xl relative"
            style={{
              background: gachaAvailable
                ? 'radial-gradient(circle at 40% 40%, rgba(212,175,55,0.3), rgba(212,175,55,0.05))'
                : 'rgba(255,255,255,0.03)',
              border: `2px solid ${gachaAvailable ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: gachaAvailable ? '0 0 30px rgba(212,175,55,0.3)' : 'none',
            }}
          >
            {spinning ? '❓' : gachaAvailable ? '🎁' : isLoggedIn ? '📦' : '🔒'}
          </motion.div>

          {/* パーティクル（スピン中） */}
          {spinning && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{
                    background: '#d4af37',
                    top: '50%',
                    left: '50%',
                  }}
                  animate={{
                    x: Math.cos((i / 6) * Math.PI * 2) * 70,
                    y: Math.sin((i / 6) * Math.PI * 2) * 70,
                    opacity: [1, 0],
                    scale: [1, 0],
                  }}
                  transition={{ duration: 1, ease: 'easeOut', delay: i * 0.05 }}
                />
              ))}
            </div>
          )}
        </div>

        {/* 状態テキスト */}
        <p className="text-sm text-[#cfbeaf] text-center">
          {isLoggedIn
            ? gachaAvailable
              ? 'ガチャを引く権利があります！'
              : '本日のガチャは既に使用済みです'
            : 'QRログインするとガチャが解放されます'}
        </p>

        {/* ガチャボタン */}
        <motion.button
          id="gacha-spin-btn"
          whileHover={gachaAvailable ? { scale: 1.05 } : {}}
          whileTap={gachaAvailable ? { scale: 0.95 } : {}}
          onClick={handleSpin}
          disabled={!gachaAvailable || spinning}
          className={`flex items-center gap-2 px-8 py-3 rounded-sm border-2 font-bold text-sm transition-all duration-300 ${
            gachaAvailable && !spinning
              ? 'bg-gradient-to-r from-[var(--gold-dark)] to-[var(--gold)] text-[var(--bg-base)] pulse-gold'
              : 'bg-slate-800 text-[#cfbeaf] cursor-not-allowed'
          }`}
        >
          {spinning ? (
            <>
              <RotateCcw size={16} className="animate-spin" />
              回転中...
            </>
          ) : gachaAvailable ? (
            <>
              <Sparkles size={16} />
              ガチャを引く！
            </>
          ) : (
            <>
              <Lock size={16} />
              {isLoggedIn ? '使用済み' : 'ロック中'}
            </>
          )}
        </motion.button>

        {/* 結果表示 */}
        <AnimatePresence>
          {result && rarityStyle && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`w-full p-5 rounded-sm border-2 border text-center ${rarityStyle.border}`}
              style={{ boxShadow: `0 0 30px ${rarityStyle.glow}` }}
            >
              <div className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mb-2 ${rarityStyle.badge}`}>
                {rarityStyle.label}
              </div>
              <p className="text-2xl mb-1">
                {result.type === 'drink' ? '🍹' : result.type === 'points' ? '🪙' : result.type === 'title' ? '👑' : '🎁'}
              </p>
              <h4 className="font-bold text-base text-[var(--gold-light)] mb-1">{result.label}</h4>
              <p className="text-xs text-[#cfbeaf]">{result.description}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}


'use client';

import { motion } from 'framer-motion';
import { Star, Scroll, Clock, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MemberCard from '@/components/member/MemberCard';
import QuestBoard from '@/components/quest/QuestBoard';
import StampCard from '@/components/stamp/StampCard';
import { useGuild } from '@/contexts/GuildContext';

/* ============================================================
   ヒーローセクション
   ============================================================ */
function HeroSection() {
  return (
    <section className="relative min-h-[60vh] flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
      {/* 背景エフェクト (ソリッドなレトロ背景に合わせてシンプルに) */}
      <div className="absolute inset-0 pointer-events-none">
        {/* レトロなドット柄や罫線風の装飾をCSSのみで表現 */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M 20 0 L 0 20\' fill=\'none\' stroke=\'%23593c22\' stroke-width=\'0.5\' opacity=\'0.1\'/%3E%3C/svg%3E')] opacity-30 mask-image:linear-gradient(to_bottom,black,transparent)]" />
      </div>

      {/* コンテンツ */}
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* レトロな看板風バッジ */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-3 px-6 py-2 mb-8 text-xs font-bold tracking-widest bg-[var(--bg-card)] border-4 border-[var(--border-outer)] shadow-[inset_0_0_0_2px_var(--border-inner),4px_4px_0_rgba(0,0,0,0.2)]"
          style={{ color: 'var(--gold-dark)' }}
        >
          <Star size={12} fill="currentColor" />
          九州大学 冒険者ギルド
          <Star size={12} fill="currentColor" />
        </motion.div>

        {/* タイトル */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-rpg font-black text-5xl sm:text-6xl md:text-7xl leading-tight mb-6 tracking-wider"
        >
          {/* 画像風の「白テキスト＋太いこげ茶フチ」 */}
          <span className="text-rpg-title">
            九大ギルド
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[#cfbeaf] text-base sm:text-lg mb-10 leading-relaxed font-bold"
          style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.8)' }}
        >
          みつける・たかめる・つながる・つむぐ・ひらく<br />
          <span className="text-[var(--gold-light)] bg-[var(--border-outer)] inline-block px-3 py-1 mt-3 border-2 border-[var(--border-shade)] shadow-[2px_2px_0_rgba(0,0,0,0.5)] rounded-sm text-sm font-normal">
            汝、大志を抱く者よ。この扉は常に開かれている。
          </span>
        </motion.p>


      </div>
    </section>
  );
}

/* ============================================================
   マイクエスト通知バナー
   ============================================================ */
function MyQuestsBanner() {
  const { isLoggedIn } = useGuild();
  const router = useRouter();
  const [counts, setCounts] = useState<{ pending: number; rejected: number } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetch('/api/my-quests')
      .then(r => r.ok ? r.json() : [])
      .then((quests: Array<{ status: string }>) => {
        const pending = quests.filter(q => q.status === 'pending').length;
        const rejected = quests.filter(q => q.status === 'rejected').length;
        if (pending > 0 || rejected > 0) setCounts({ pending, rejected });
      })
      .catch(() => {});
  }, [isLoggedIn]);

  if (!isLoggedIn || !counts || dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto px-4 pt-4 relative"
    >
      <div className="flex items-stretch gap-1">
        <button
          onClick={() => router.push('/my-quests')}
          className="flex-1 flex items-center gap-3 px-4 py-3 bg-[var(--bg-card)] border-2 border-[var(--border-outer)] rounded-sm shadow-[2px_2px_0_rgba(0,0,0,0.2)] hover:brightness-110 transition-all text-left"
        >
          <Scroll size={16} className="text-[var(--gold)] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[var(--gold-light)]">マイクエストの状況を確認</p>
            <p className="text-[10px] text-[#cfbeaf] mt-0.5">
              {counts.pending > 0 && (
                <span className="inline-flex items-center gap-1 mr-3">
                  <Clock size={10} className="text-amber-400" />
                  審査中 {counts.pending}件
                </span>
              )}
              {counts.rejected > 0 && (
                <span className="inline-flex items-center gap-1 text-red-400">
                  <XCircle size={10} />
                  リジェクト {counts.rejected}件
                </span>
              )}
            </p>
          </div>
          <span className="text-[10px] text-[#8b7355] flex-shrink-0">詳細 →</span>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="px-3 bg-[var(--bg-card)] border-2 border-[var(--border-outer)] rounded-sm text-[#8b7355] hover:text-[var(--gold-light)] transition-colors text-xs"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}

/* ============================================================
   会員証セクション
   ============================================================ */
function MemberSection() {

  return (
    <section className="relative px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-10">
          {/* 会員証 */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="w-full lg:w-[480px] flex-shrink-0 flex justify-center"
          >
            <MemberCard />
          </motion.div>

          {/* サイドテキスト */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex-1 text-center lg:text-left rpg-card p-6 border-4"
          >
            <p className="font-rpg text-xs tracking-widest text-[var(--gold-dark)] mb-2 uppercase font-bold">
              Member Card
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--gold-light)] mb-4 leading-tight" style={{ textShadow: '2px 2px 0 var(--border-outer)' }}>
              あなたの<br className="hidden sm:block" />
              ギルド会員証
            </h2>
            <p className="text-[#ebdacf] font-bold text-sm leading-relaxed mb-6">
              カードをタップすると裏面に習得スキルが表示されます。
              日々の活動やクエストを通じて、自分のスキルレベルを上げていきましょう！
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   メインページ
   ============================================================ */
export default function Home() {
  return (
    <>
      {/* ヒーロー */}
      <HeroSection />

      {/* マイクエスト通知バナー */}
      <MyQuestsBanner />

      {/* 会員証 */}
      <MemberSection />

      {/* クエストボード */}
      <QuestBoard />

      {/* スタンプカード */}
      <div className="max-w-5xl mx-auto px-4 pb-20">
        <StampCard />
        {/* <Gacha /> TODO: ガチャは後で復活 */}
      </div>

      {/* フッター */}
      <footer className="mt-8 py-8 border-t-4 border-[var(--border-outer)] text-center bg-[var(--bg-card)]">
        <p className="font-rpg text-xs tracking-widest text-[#cfbeaf] font-bold" style={{ textShadow: '1px 1px 0 #000' }}>
          九大ギルド © 2024 — All Adventurers Welcome
        </p>
      </footer>
    </>
  );
}

'use client';

import { motion } from 'framer-motion';
import { Sword, Users, Star, Zap } from 'lucide-react';
import MemberCard from '@/components/member/MemberCard';
import QuestBoard from '@/components/quest/QuestBoard';
import StampCard from '@/components/stamp/StampCard';
// import Gacha from '@/components/gacha/Gacha'; // TODO: 後で復活
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
   会員証セクション
   ============================================================ */
function MemberSection() {
  const { member } = useGuild();

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
              日々の活動を通じて、自分のスキルを磨いていきましょう！
            </p>

            {/* 役職説明 */}
            <div className="grid grid-cols-2 gap-3 text-sm mb-6">
              {[
                { rank: '勇者', color: '#ef4444', desc: '果敢に挑む挑戦者' },
                { rank: '魔術師', color: '#a855f7', desc: '知識を力に変える者' },
                { rank: '学者', color: '#3b82f6', desc: '知を求め探究する者' },
                { rank: '画家', color: '#f97316', desc: '世界を彩る表現者' },
                { rank: '詩人', color: '#10b981', desc: '物語を紡ぐ表現者' },
                { rank: '賢者', color: '#06b6d4', desc: '英知を授け導く者' },
              ].map((r) => (
                <div
                  key={r.rank}
                  className="flex items-start gap-2 p-3 bg-[var(--bg-base)] border-2 border-[var(--border-shade)] shadow-[inset_2px_2px_0_rgba(0,0,0,0.1),2px_2px_0_rgba(0,0,0,0.1)]"
                >
                  <span className="font-bold text-[10px] mt-0.5 px-2 py-0.5 text-[#fff] border-[1px] border-[#000] whitespace-nowrap" style={{ backgroundColor: r.color, textShadow: '1px 1px 0 #000' }}>
                    {r.rank}
                  </span>
                  <span className="text-[10px] text-[#ebdacf] font-bold mt-0.5">{r.desc}</span>
                </div>
              ))}
            </div>
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

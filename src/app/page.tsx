'use client';

import { motion } from 'framer-motion';
import { Star, Scroll, Clock, XCircle, Users, BookOpen, Handshake, Heart, Briefcase, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MemberCard from '@/components/member/MemberCard';
import QuestBoard from '@/components/quest/QuestBoard';
import { useGuild } from '@/contexts/GuildContext';

/* ============================================================
   ヒーローセクション
   ============================================================ */
function HeroSection() {
  return (
    <section className="relative min-h-[60vh] flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M 20 0 L 0 20\' fill=\'none\' stroke=\'%23593c22\' stroke-width=\'0.5\' opacity=\'0.1\'/%3E%3C/svg%3E')] opacity-30" />
      </div>

      <div className="relative z-10 text-center max-w-2xl mx-auto">
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

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-rpg font-black text-5xl sm:text-6xl md:text-7xl leading-tight mb-6 tracking-wider"
        >
          <span className="text-rpg-title">九大ギルド</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[#cfbeaf] text-sm sm:text-lg mb-10 leading-relaxed font-bold break-words"
          style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.8)' }}
        >
          <span className="inline-block">みつける・</span>
          <span className="inline-block">たかめる・</span>
          <span className="inline-block">つながる・</span>
          <span className="inline-block">つむぐ・</span>
          <span className="inline-block">ひらく</span>
          <br />
          <span className="text-[var(--gold-light)] bg-[var(--border-outer)] inline-block px-3 py-1 mt-3 border-2 border-[var(--border-shade)] shadow-[2px_2px_0_rgba(0,0,0,0.5)] rounded-sm text-xs sm:text-sm font-normal max-w-full">
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
      className="max-w-5xl mx-auto px-4 pt-4"
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
const QUEST_TYPES = [
  { type: '仲間探し', color: '#3b82f6', icon: Users, desc: '共に活動する仲間を募集' },
  { type: '研究協力', color: '#8b5cf6', icon: BookOpen, desc: '研究・調査への参加募集' },
  { type: '業務委託', color: '#f59e0b', icon: Briefcase, desc: 'スキルを活かした業務依頼' },
  { type: 'ボランティア', color: '#10b981', icon: Heart, desc: '地域・学内への社会貢献' },
  { type: '雇用契約', color: '#ec4899', icon: Handshake, desc: 'アルバイト・長期雇用募集' },
  { type: 'その他', color: '#94a3b8', icon: HelpCircle, desc: '上記に当てはまらない依頼' },
];

function MemberSection() {
  return (
    <section className="relative px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="w-full lg:w-[480px] flex-shrink-0 flex justify-center"
          >
            <MemberCard />
          </motion.div>

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
              カードをタップすると裏面が表示されます。
              クエストを通じて、特技やスキルを増やしていきましょう！
            </p>

            {/* クエスト種別説明 */}
            <div className="grid grid-cols-2 gap-2">
              {QUEST_TYPES.map((qt) => {
                const Icon = qt.icon;
                return (
                  <div
                    key={qt.type}
                    className="flex items-start gap-2 p-2.5 bg-[var(--bg-base)] border-2 border-[var(--border-shade)] shadow-[inset_2px_2px_0_rgba(0,0,0,0.1),2px_2px_0_rgba(0,0,0,0.1)]"
                  >
                    <div className="flex-shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center" style={{ color: qt.color }}>
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-[10px] block" style={{ color: qt.color }}>
                        {qt.type}
                      </span>
                      <span className="text-[9px] text-[#cfbeaf]">{qt.desc}</span>
                    </div>
                  </div>
                );
              })}
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
      <HeroSection />
      <MyQuestsBanner />
      <MemberSection />
      <QuestBoard />

      <footer className="mt-8 py-8 border-t-4 border-[var(--border-outer)] text-center bg-[var(--bg-card)]">
        <p className="font-rpg text-xs tracking-widest text-[#cfbeaf] font-bold" style={{ textShadow: '1px 1px 0 #000' }}>
          九大ギルド © 2024 — All Adventurers Welcome
        </p>
      </footer>
    </>
  );
}

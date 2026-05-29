'use client';

import { useGuild } from '@/contexts/GuildContext';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, CalendarDays, Trophy, Medal, Crown, TrendingUp } from 'lucide-react';

// 月の表示名
function formatMonth(yyyymm: string) {
  const [year, month] = yyyymm.split('-');
  return `${year}年${parseInt(month)}月`;
}

export default function StampCard() {
  const { isLoggedIn, member } = useGuild();
  const monthlyCheckInCount = 0;
  const checkinMonth = new Date().toISOString().slice(0, 7);

  // リーダーボードは現在改修中
  const myRank = 0;
  const leaderboard: any[] = [];

  return (
    <section id="stamp-card" className="w-full max-w-5xl mx-auto px-4 py-12">
      {/* タイトル */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 rounded-sm border-2 bg-[var(--gold)]/10 border border-[var(--gold)]/30 flex items-center justify-center">
          <Trophy size={16} className="text-[var(--gold)]" />
        </div>
        <div>
          <h2 className="font-rpg font-bold text-xl text-gold-gradient">冒険者ランキング</h2>
          <p className="text-xs text-[var(--gold)]">今月の拠点貢献度（チェックイン回数）</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* 左側：自分のステータス */}
        <div className="rpg-card p-8 parchment-border relative overflow-hidden flex flex-col items-center justify-center text-center">
          <div className="absolute top-4 left-4 flex items-center gap-2 text-xs text-[#cfbeaf]">
            <CalendarDays size={14} className="text-[var(--gold)]" />
            <span>{formatMonth(checkinMonth)}</span>
          </div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-4"
          >
            <div className="text-xs text-[#cfbeaf] mb-2 uppercase tracking-widest">現在の訪問数</div>
            <div className="text-6xl font-rpg font-bold text-gold-gradient mb-2" style={{ textShadow: '2px 2px 0 #000' }}>
              {monthlyCheckInCount}
            </div>
            <div className="text-sm text-[#cfbeaf]">回</div>
          </motion.div>

          {isLoggedIn && myRank > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-8 px-4 py-2 bg-black/40 rounded-sm border border-[var(--gold)]/30 flex items-center gap-3"
            >
              <TrendingUp size={16} className="text-green-400" />
              <span className="text-sm">現在の順位: <span className="font-bold text-[var(--gold-light)]">{myRank}位</span></span>
            </motion.div>
          )}

          {!isLoggedIn && (
            <p className="mt-8 text-xs text-[var(--gold)] opacity-60">
              ログインするとランキングに参加できます
            </p>
          )}
        </div>

        {/* 右側：リーダーボード */}
        <div className="rpg-card p-6 parchment-border flex flex-col">
          <h3 className="text-sm font-bold text-[var(--gold-light)] mb-4 flex items-center gap-2 border-b border-[var(--gold)]/20 pb-2">
            <Crown size={16} />
            今月のトップ冒険者
          </h3>

          <div className="flex-1 space-y-3">
            {leaderboard.length === 0 ? (
              <div className="h-full flex flex-center items-center justify-center text-[#cfbeaf] text-xs opacity-40 py-12">
                まだデータがありません
              </div>
            ) : (
              leaderboard.slice(0, 5).map((entry, i) => {
                const isFirst = i === 0;
                const isSecond = i === 1;
                const isThird = i === 2;
                const isMe = entry.id === member.id;

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className={`relative flex items-center gap-3 p-3 rounded-sm border-2 transition-all ${
                      isMe ? 'bg-[var(--gold)]/10 border-[var(--gold)]' : 'bg-black/20 border-white/5'
                    }`}
                  >
                    {/* 順位アイコン */}
                    <div className="w-8 flex-shrink-0 flex justify-center">
                      {isFirst ? <Crown className="text-yellow-400" size={20} /> :
                       isSecond ? <Medal className="text-gray-300" size={18} /> :
                       isThird ? <Medal className="text-amber-600" size={18} /> :
                       <span className="text-xs font-rpg text-[#cfbeaf]">{i + 1}</span>}
                    </div>

                    {/* アバター */}
                    {entry.avatar_url ? (
                      <img src={entry.avatar_url} alt="" className="w-8 h-8 rounded-full border border-white/10" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">?</div>
                    )}

                    {/* 名前 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate text-[#dfd8c8]">
                        {entry.display_name}
                        {isMe && <span className="ml-2 text-[10px] bg-[var(--gold)] text-black px-1 rounded-sm">YOU</span>}
                      </div>
                    </div>

                    {/* カウント */}
                    <div className="text-right">
                      <div className="font-rpg text-[var(--gold)] font-bold">{entry.monthly_checkin_count}</div>
                      <div className="text-[10px] text-[#cfbeaf]">pts</div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
          
          <div className="mt-4 pt-2 border-t border-[var(--gold)]/10 text-center">
            <p className="text-[10px] text-[#cfbeaf]">
              ※ 上位3名には月末に特別な称号や特典が授与されます
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

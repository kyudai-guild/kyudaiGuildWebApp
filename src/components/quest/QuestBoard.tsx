'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Scroll, Clock, Star, CheckCircle2, ChevronRight } from 'lucide-react';
import { useGuild } from '@/contexts/GuildContext';

const DIFFICULTY_COLORS = {
  'E': '#94a3b8',
  'D': '#10b981',
  'C': '#3b82f6',
  'B': '#8b5cf6',
  'A': '#f59e0b',
  'S': '#ef4444',
};

const CATEGORY_COLORS = {
  'みつける': '#ec4899',
  'たかめる': '#3b82f6',
  'つながる': '#10b981',
  'つむぐ': '#f59e0b',
  'ひらく': '#8b5cf6',
};

export const QuestBoard: React.FC = () => {
  const { quests, completeQuest } = useGuild();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Scroll className="text-[var(--gold)]" size={20} />
        <h3 className="text-sm font-bold text-[var(--gold-light)]">受注可能クエスト</h3>
      </div>

      <div className="space-y-3">
        {quests.length === 0 ? (
          <div className="text-center py-20 bg-black/40 rounded-sm border border-white/10">
            <p className="text-white/40 text-sm">現在、冒険者ギルドに依頼は届いていないようだ...</p>
            <p className="text-white/20 text-xs mt-2">（Discordのクエストボードを確認してください）</p>
          </div>
        ) : (
          quests.map((quest, i) => {
            const catColor = CATEGORY_COLORS[quest.category as keyof typeof CATEGORY_COLORS] || '#94a3b8';
            const diffColor = DIFFICULTY_COLORS[quest.difficulty as keyof typeof DIFFICULTY_COLORS] || '#94a3b8';

            return (
              <motion.div
                key={quest.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`rpg-card p-4 ${quest.completed ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-sm border-2 flex items-center justify-center text-xs font-black mt-0.5"
                    style={{ color: diffColor, background: `${diffColor}20`, border: `1px solid ${diffColor}40` }}
                  >
                    {quest.difficulty}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className={`text-sm font-bold ${quest.completed ? 'line-through text-[var(--gold)]' : 'text-[var(--gold-light)]'}`}>
                        {quest.title}
                      </h4>
                      {quest.completed && (
                        <CheckCircle2 size={16} className="text-[var(--xp-green)] flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                    <p className="text-xs text-[#cfbeaf] mb-2">{quest.description}</p>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ color: catColor, background: `${catColor}15`, border: `1px solid ${catColor}30` }}
                      >
                        {quest.category}
                      </span>
                      <span className="text-[10px] text-[#cfbeaf] flex items-center gap-1">
                        <Star size={9} className="text-[var(--gold)]" />
                        {quest.reward}
                      </span>
                    </div>
                  </div>
                </div>

                {!quest.completed && quest.link && (
                  <motion.a
                    href={quest.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-sm border-2 text-xs font-bold transition-all duration-200"
                    style={{
                      background: `${catColor}15`,
                      border: `1px solid ${catColor}30`,
                      color: catColor,
                    }}
                  >
                    <Clock size={12} />
                    依頼の詳細を見る
                    <ChevronRight size={12} />
                  </motion.a>
                )}
                {!quest.completed && !quest.link && (
                  <motion.button
                    id={`quest-accept-${quest.id}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => completeQuest(quest.id)}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-sm border-2 text-xs font-bold transition-all duration-200"
                    style={{
                      background: `${catColor}15`,
                      border: `1px solid ${catColor}30`,
                      color: catColor,
                    }}
                  >
                    <Clock size={12} />
                    クエスト達成
                    <ChevronRight size={12} />
                  </motion.button>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default QuestBoard;

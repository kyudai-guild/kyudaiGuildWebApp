'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGuild } from '@/contexts/GuildContext';
import {
  Star,
  ChevronRight,
  Settings,
  X,
  Plus,
  User,
} from 'lucide-react';

const VISITOR_CONFIG = {
  color: '#8b7355',
  borderColor: 'rgba(139, 115, 85, 0.5)',
  glowColor: 'rgba(139, 115, 85, 0.2)',
  bg: 'from-stone-950 to-slate-900',
};

const MEMBER_CONFIG = {
  color: '#f59e0b',
  borderColor: 'rgba(245, 158, 11, 0.5)',
  glowColor: 'rgba(245, 158, 11, 0.3)',
  bg: 'from-amber-950 to-slate-900',
};

/* ============================================================
   カードの表（Front）
   ============================================================ */
function CardFront() {
  const { member } = useGuild();
  const config = member.isVisitor ? VISITOR_CONFIG : MEMBER_CONFIG;

  if (member.isVisitor) {
    return (
      <div
        className="absolute inset-0 rounded-md overflow-hidden"
        style={{
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          background: `linear-gradient(135deg, var(--bg-card), #0a0a0a)`,
          border: `1px solid ${VISITOR_CONFIG.borderColor}`,
          boxShadow: `0 0 20px ${VISITOR_CONFIG.glowColor}`,
        }}
      >
        <div className="absolute inset-0 bg-dot-grid opacity-20" />
        <div className="relative h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style={{ background: `${VISITOR_CONFIG.glowColor}`, border: `2px solid ${VISITOR_CONFIG.borderColor}` }}
          >
            🚫
          </div>
          <div>
            <p className="font-rpg text-[10px] tracking-widest mb-1" style={{ color: VISITOR_CONFIG.color }}>VISITOR</p>
            <h2 className="text-xl font-black text-[#cfbeaf] mb-1">{member.name || '訪問者'}</h2>
            <p className="text-[10px] text-[#8b7355] leading-relaxed">
              ギルドの扉を開いていません。<br />
              冒険者登録をすると、ステータスが記録されます。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 rounded-md border-4 overflow-hidden"
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        background: `linear-gradient(135deg, var(--bg-card), #0a1020)`,
        border: `1px solid ${config.borderColor}`,
        boxShadow: `0 0 30px ${config.glowColor}, inset 0 0 30px rgba(0,0,0,0.3)`,
      }}
    >
      <div
        className={`h-1.5 w-full bg-gradient-to-r ${config.bg}`}
        style={{ background: `linear-gradient(90deg, ${config.color}, transparent)` }}
      />
      <div className="absolute inset-0 bg-dot-grid opacity-40" />

      <div className="relative h-full p-4 md:p-6 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-rpg text-[9px] tracking-[0.3em] uppercase opacity-60 mb-0.5">
              Guild Member Card
            </p>
            <p className="font-rpg text-xs tracking-widest" style={{ color: config.color }}>
              九大ギルド
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 md:gap-6 flex-1 min-h-0 items-center justify-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-20 h-20 md:w-[90px] md:h-[90px] rounded-sm flex items-center justify-center relative overflow-hidden"
              style={{
                background: `radial-gradient(circle at 40% 40%, ${config.glowColor}, rgba(0,0,0,0.6))`,
                border: `2px solid ${config.borderColor}`,
                boxShadow: `0 0 12px ${config.glowColor}`,
              }}
            >
              <User size={40} className="text-[var(--gold-light)] opacity-80" />
            </div>
            <span className="text-[8px] font-bold tracking-wider" style={{ color: config.color }}>ADVENTURER</span>
          </div>

          <div className="flex-1 flex flex-col justify-center min-w-0 text-center md:text-left">
            <h2 className="text-2xl font-black truncate text-[var(--gold-light)] mb-2">
              {member.name}
            </h2>

            <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-1">
              {member.tags.map(tag => (
                <span key={tag} className="text-[10px] text-[var(--gold-light)] bg-[rgba(245,158,11,0.1)] px-2 py-0.5 rounded-sm border border-[rgba(245,158,11,0.3)] shadow-[0_0_8px_rgba(245,158,11,0.1)]">
                  #{tag}
                </span>
              ))}
              {member.tags.length === 0 && (
                <span className="text-[10px] text-[#8b7355] italic opacity-60">特技は未設定です</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between border-t border-[var(--border-shade)] pt-3">
          <div className="flex gap-1.5 flex-wrap flex-1">
          </div>
          <div className="flex items-center gap-1 text-[9px] text-[#cfbeaf] opacity-60 whitespace-nowrap ml-2">
            <ChevronRight size={10} />
            <span>DETAILS</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   カードの裏（Back）
   ============================================================ */
function CardBack() {
  const { member } = useGuild();
  const config = member.isVisitor ? VISITOR_CONFIG : MEMBER_CONFIG;

  return (
    <div
      className="absolute inset-0 rounded-md border-4 overflow-hidden"
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: 'rotateY(180deg)',
        background: `linear-gradient(135deg, #0a1020, var(--bg-card))`,
        border: `1px solid ${config.borderColor}`,
        boxShadow: `0 0 30px ${config.glowColor}`,
      }}
    >
      <div className="absolute inset-0 bg-dot-grid opacity-30" />

      <div className="relative h-full p-4 md:p-5 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-rpg text-[10px] md:text-xs tracking-widest uppercase transition-all pb-1 border-b-2" style={{ color: config.color, borderColor: config.color }}>
            Skills
          </h3>
          <span className="text-[9px] text-[var(--gold)] opacity-60">ID: {member.id.substring(0, 8)}</span>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key="skills"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-2"
            >
              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-[rgba(139,115,85,0.2)] mb-1">
                {member.tags.map(tag => (
                  <span key={tag} className="text-[9px] text-[var(--gold-light)] bg-[rgba(139,115,85,0.15)] px-1.5 py-0.5 rounded-sm border border-[rgba(139,115,85,0.3)]">
                    #{tag}
                  </span>
                ))}
                {member.tags.length === 0 && (
                  <p className="text-[9px] text-[#8b7355] italic opacity-50">特技が設定されていません</p>
                )}
              </div>

              <p className="text-center text-[10px] text-[#8b7355] py-10">まだ獲得したスキルがありません</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-1 mt-2 text-[9px] text-[#cfbeaf] opacity-60">
          <ChevronRight size={10} />
          <span>BACK</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   プロフィール編集画面
   ============================================================ */
const PRESET_TAGS = ['数学', '英語', '物理', '心理学', 'Python', 'React', 'ロゴデザイン', '動画編集', '英検1級', 'TOEIC'];

function EditView({ onClose }: { onClose: () => void }) {
  const { member, updateProfile } = useGuild();
  const [name, setName] = useState(member.name);
  const [tags, setTags] = useState<string[]>(member.tags || []);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const config = member.isVisitor ? VISITOR_CONFIG : MEMBER_CONFIG;

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({ name, tags });
    setSaving(false);
    onClose();
  };

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const addCustomTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags(prev => [...prev, newTag]);
      setNewTag('');
    }
  };

  return (
    <div
      className="absolute inset-0 rounded-md border-4 z-50 flex flex-col p-4 overflow-hidden"
      style={{
        background: '#0a0a14',
        border: `1px solid ${config.borderColor}`,
        boxShadow: `0 0 30px ${config.glowColor}`,
      }}
    >
      <div className="flex justify-between items-center mb-4 border-b border-[rgba(139,115,85,0.3)] pb-2">
        <h3 className="font-rpg text-xs text-[var(--gold-light)] uppercase tracking-widest">Character Profile</h3>
        <button onClick={onClose} className="text-[#8b7355] hover:text-[#cfbeaf]"><X size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-hide">
        <div>
          <label className="text-[9px] text-[#8b7355] uppercase block mb-1">Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[rgba(139,115,85,0.1)] border border-[rgba(139,115,85,0.3)] rounded-sm px-2 py-1.5 text-xs text-[#cfbeaf] outline-none"
          />
        </div>

        <div>
          <label className="text-[9px] text-[#8b7355] uppercase block mb-2">Specialties</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`text-[9px] px-2 py-1 rounded-full border transition-all ${
                  tags.includes(tag) ? 'bg-[#f59e0b] text-[#050a14] border-[#f59e0b]' : 'border-[rgba(139,115,85,0.3)] text-[#8b7355]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="新しいタグを追加..."
              className="flex-1 bg-[rgba(139,115,85,0.1)] border border-[rgba(139,115,85,0.3)] rounded-sm px-2 py-1 text-[10px] text-[#cfbeaf] outline-none"
              onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
            />
            <button
              onClick={addCustomTag}
              className="p-1 rounded-sm bg-[rgba(139,115,85,0.2)] text-[#cfbeaf] hover:bg-[rgba(139,115,85,0.4)]"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5 min-h-[20px]">
            {tags.filter(t => !PRESET_TAGS.includes(t)).map(tag => (
              <span key={tag} className="text-[9px] text-[#cfbeaf] bg-[#8b735540] px-2 py-0.5 rounded-sm border border-[#8b735580] flex items-center gap-1">
                {tag}
                <X size={8} className="cursor-pointer" onClick={() => toggleTag(tag)} />
              </span>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 w-full py-2 bg-[#f59e0b] text-[#050a14] font-black text-xs rounded-sm hover:opacity-90 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]"
      >
        {saving ? 'SAVING...' : 'SAVE CHANGES'}
      </button>
    </div>
  );
}

/* ============================================================
   3Dフリップ会員証（メインコンポーネント）
   ============================================================ */
export default function MemberCard() {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { member } = useGuild();
  const config = member.isVisitor ? VISITOR_CONFIG : MEMBER_CONFIG;

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-[480px] relative">
      {/* 編集ボタン */}
      {!member.isVisitor && !isEditing && (
        <button
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          className="absolute -top-2 -right-2 z-[60] p-2 bg-[#1a1a2e] border border-[rgba(139,115,85,0.5)] rounded-full text-[var(--gold)] shadow-lg hover:scale-110 transition-transform"
          title="プロフィール編集"
        >
          <Settings size={14} />
        </button>
      )}

      {/* カード本体 */}
      <div
        className="w-full cursor-pointer select-none"
        onClick={() => !isEditing && setIsFlipped((f) => !f)}
        style={{ perspective: '1000px' }}
        id="member-card"
        role="button"
        aria-label="会員証をフリップ"
      >
        <motion.div
          className="relative w-full h-[380px] md:h-[280px]"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <CardFront />
          <CardBack />
        </motion.div>

        {/* 編集画面オーバーレイ */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-50"
            >
              <EditView onClose={() => setIsEditing(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* フリップインジケーター */}
      <div className="flex gap-2">
        <button
          onClick={() => setIsFlipped(false)}
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            !isFlipped ? 'w-6' : 'opacity-40'
          }`}
          style={{ background: config.color }}
          aria-label="表面へ"
        />
        <button
          onClick={() => setIsFlipped(true)}
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            isFlipped ? 'w-6' : 'opacity-40'
          }`}
          style={{ background: config.color }}
          aria-label="裏面へ"
        />
      </div>
    </div>
  );
}

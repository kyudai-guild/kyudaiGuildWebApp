'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, AlertCircle } from 'lucide-react';
import { useGuild } from '@/contexts/GuildContext';

type CreateQuestModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const CATEGORIES = ['みつける', 'たかめる', 'つながる', 'つむぐ', 'ひらく'];
const DIFFICULTIES = ['S', 'A', 'B', 'C', 'D', 'E'];

export default function CreateQuestModal({ isOpen, onClose }: CreateQuestModalProps) {
  const { createQuest } = useGuild();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [reward, setReward] = useState('');
  const [skillName, setSkillName] = useState('');
  const [difficulty, setDifficulty] = useState('E');
  const [deadline, setDeadline] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !category || !skillName) {
      setError('必須項目が入力されていません。');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createQuest({
        title,
        description,
        category,
        reward,
        skill_name: skillName,
        difficulty,
        deadline: deadline || undefined,
      });
      onClose();
      // reset form
      setTitle('');
      setDescription('');
      setCategory(CATEGORIES[0]);
      setReward('');
      setSkillName('');
      setDifficulty('E');
      setDeadline('');
    } catch (err: any) {
      setError(err.message || 'クエスト作成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[var(--bg-card)] border-2 border-[var(--border-outer)] rounded-sm shadow-2xl p-6"
        >
          <div className="absolute inset-0 bg-dot-grid opacity-20 pointer-events-none" />
          
          <div className="relative flex justify-between items-center mb-6 pb-4 border-b border-[var(--border-inner)]">
            <h2 className="text-xl font-rpg font-black text-[var(--gold-light)]">新しいクエストの掲示</h2>
            <button onClick={onClose} className="text-[#8b7355] hover:text-[var(--gold-light)] transition-colors">
              <X size={24} />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-950/50 border border-red-500/50 rounded-sm flex items-start gap-2 text-red-400 text-xs font-bold">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative space-y-4">
            <div>
              <label className="text-xs font-bold text-[#cfbeaf] block mb-1">クエスト名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[rgba(139,115,85,0.1)] border border-[rgba(139,115,85,0.3)] rounded-sm px-3 py-2 text-sm text-[#cfbeaf] outline-none focus:border-[var(--gold-dark)]"
                placeholder="例: 古文書の解読"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#cfbeaf] block mb-1">詳細な説明</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[rgba(139,115,85,0.1)] border border-[rgba(139,115,85,0.3)] rounded-sm px-3 py-2 text-sm text-[#cfbeaf] outline-none focus:border-[var(--gold-dark)] min-h-[80px]"
                placeholder="クエストの詳細内容を記載..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#cfbeaf] block mb-1">カテゴリ <span className="text-red-500">*</span></label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[rgba(139,115,85,0.1)] border border-[rgba(139,115,85,0.3)] rounded-sm px-3 py-2 text-sm text-[#cfbeaf] outline-none focus:border-[var(--gold-dark)]"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              
              <div>
                <label className="text-xs font-bold text-[#cfbeaf] block mb-1">難易度</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-[rgba(139,115,85,0.1)] border border-[rgba(139,115,85,0.3)] rounded-sm px-3 py-2 text-sm text-[#cfbeaf] outline-none focus:border-[var(--gold-dark)]"
                >
                  {DIFFICULTIES.map(d => <option key={d} value={d}>Rank {d}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#cfbeaf] block mb-1">紐づけるスキル名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  className="w-full bg-[rgba(139,115,85,0.1)] border border-[rgba(139,115,85,0.3)] rounded-sm px-3 py-2 text-sm text-[#cfbeaf] outline-none focus:border-[var(--gold-dark)]"
                  placeholder="例: React"
                />
                <p className="text-[10px] text-[#8b7355] mt-1">クエスト完了時にこのスキルのLvが+1されます</p>
              </div>

              <div>
                <label className="text-xs font-bold text-[#cfbeaf] block mb-1">期限</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-[rgba(139,115,85,0.1)] border border-[rgba(139,115,85,0.3)] rounded-sm px-3 py-2 text-sm text-[#cfbeaf] outline-none focus:border-[var(--gold-dark)] [color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#cfbeaf] block mb-1">報酬</label>
              <input
                type="text"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                className="w-full bg-[rgba(139,115,85,0.1)] border border-[rgba(139,115,85,0.3)] rounded-sm px-3 py-2 text-sm text-[#cfbeaf] outline-none focus:border-[var(--gold-dark)]"
                placeholder="例: 1000G / 昼食おごり"
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 bg-[rgba(139,115,85,0.1)] border border-[rgba(139,115,85,0.3)] text-[#cfbeaf] font-bold text-sm rounded-sm hover:bg-[rgba(139,115,85,0.2)] transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-[2] py-2 bg-[var(--gold-dark)] text-white font-black text-sm rounded-sm hover:brightness-110 transition-all shadow-[inset_0_-3px_0_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-[inset_0_0_0_rgba(0,0,0,0)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save size={16} />
                {loading ? '掲示中...' : 'クエストを掲示する'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

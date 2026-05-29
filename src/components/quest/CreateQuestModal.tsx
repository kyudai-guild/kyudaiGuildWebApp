'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, AlertCircle, FileText, ChevronDown, ChevronUp, Calendar, Clock, Hash, Users, Tag } from 'lucide-react';
import { useGuild } from '@/contexts/GuildContext';

type CreateQuestModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const QUEST_TYPES = ['仲間探し', '研究協力', '業務委託', 'ボランティア募集', '雇用契約', 'その他'];
const PRESET_TAGS = ['プログラミング', 'Web制作', 'デザイン', '動画編集', '翻訳', '研究', 'データ分析', '体力仕事', '教育・指導', 'イベント運営'];

const GUIDELINES_TEXT = `クエスト依頼者（掲示者）の皆様へ：ガイドラインと注意事項

本プラットフォームは、学生のスキルアップ、研究の促進、および地域との交流を目的としたタスクマッチング掲示板です。
学生が安心・安全にクエスト（案件）に参加できるよう、掲示を行う際は以下のガイドラインを必ず遵守してください。

1. 共通のルール・禁止事項（必ずお読みください）
当プラットフォームでは、学生の不利益となる以下の依頼を固く禁じます。運営が不適切と判断したクエストは、事前の通知なく削除（BAN）およびアカウントの停止措置を行います。

・学業不正の助長: レポートの代行、替え玉受験、過去問の売買など、大学の規則に反する行為の募集。
・法令・公序良俗に反する依頼: マルチ商法、ネットワークビジネス、特定の宗教への勧誘、情報商材の販売、またはそれらに類する集会への参加呼びかけ。
・出会い・交際目的: 純粋な業務やプロジェクト以外の、個人的な交際や出会いを目的とした募集。
・虚偽の条件提示（おとり募集）: 実際の報酬、作業内容、労働条件が、掲示板に記載された内容と著しく異なること。
・学業への過度な支障: 学生の本来の目的である学業を妨げるような、過酷なスケジュールや深夜帯の強制的な拘束。

2. 契約形態別の注意事項
依頼するクエストの性質（お金の支払い方や指示の出し方）に合わせて、法律に基づいた適切な条件を記載してください。

A. 雇用契約（アルバイト）を募集する場合
・最低賃金の遵守: 勤務地が定める最新の最低賃金以上の時給を必ず設定してください。
・労働条件の明示: 労働時間、休憩時間、勤務場所、業務内容、給与の支払い方法を明記してください。

B. 業務委託（請負・委任）を募集する場合
・偽装請負の禁止: 時間や場所の拘束、細かな業務の指揮命令は法律で禁止されています。
・報酬条件の明示: 完了条件を明確に記載してください。

C. 研究協力（被験者・アンケート等）を募集する場合
・倫理委員会の承認: 人を対象とする研究の場合、研究倫理委員会等の承認を得た上で記載してください。

3. 免責事項
・本サービスは情報提供の場としてのプラットフォームです。
・クエストの受注、条件の交渉、金銭のやり取りは、依頼者と学生の間で直接行っていただきます。
・当事者間のトラブルについて、運営は一切の責任を負いません。`;

export default function CreateQuestModal({ isOpen, onClose }: CreateQuestModalProps) {
  const { createQuest } = useGuild();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questType, setQuestType] = useState(QUEST_TYPES[0]);
  const [maxApplicants, setMaxApplicants] = useState(1);
  const [reward, setReward] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [durationMode, setDurationMode] = useState<'weeks' | 'date'>('weeks');
  const [durationWeeks, setDurationWeeks] = useState(2);
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [step, setStep] = useState<'guidelines' | 'form'>('guidelines');

  if (!isOpen) return null;

  const handleAddTag = () => {
    const trimmed = customTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
      setCustomTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const togglePresetTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(prev => prev.filter(t => t !== tag));
    } else {
      setTags(prev => [...prev, tag]);
    }
  };

  const maxEndDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !questType) {
      setError('必須項目が入力されていません。');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createQuest({
        title,
        description,
        quest_type: questType,
        max_applicants: maxApplicants,
        reward,
        tags,
        listing_duration_type: durationMode,
        listing_duration_weeks: durationMode === 'weeks' ? durationWeeks : null,
        listing_end_date: durationMode === 'date' ? endDate : null,
      });
      onClose();
      // reset
      setTitle('');
      setDescription('');
      setQuestType(QUEST_TYPES[0]);
      setMaxApplicants(1);
      setReward('');
      setTags([]);
      setDurationMode('weeks');
      setDurationWeeks(2);
      setEndDate('');
      setStep('guidelines');
      setGuidelinesAccepted(false);
    } catch (err: any) {
      setError(err.message || 'クエスト作成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-[rgba(139,115,85,0.1)] border border-[rgba(139,115,85,0.3)] rounded-sm px-3 py-2 text-sm text-[#cfbeaf] outline-none focus:border-[var(--gold-dark)] transition-colors";
  const labelClass = "text-xs font-bold text-[#cfbeaf] block mb-1";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--bg-card)] border-2 border-[var(--border-outer)] rounded-sm shadow-2xl p-6"
        >
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-[var(--border-inner)]">
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

          {step === 'guidelines' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[var(--gold-light)] mb-2">
                <FileText size={16} />
                <span className="text-sm font-bold">注意事項・ガイドライン</span>
              </div>

              <div className="bg-[rgba(0,0,0,0.3)] border border-[rgba(139,115,85,0.2)] rounded-sm p-4 max-h-[50vh] overflow-y-auto">
                <pre className="text-xs text-[#cfbeaf] whitespace-pre-wrap leading-relaxed font-[var(--font-jp)]" style={{ fontFamily: 'var(--font-jp), "Noto Sans JP", sans-serif' }}>
                  {GUIDELINES_TEXT}
                </pre>
              </div>

              <label className="flex items-start gap-2 cursor-pointer p-3 bg-[rgba(139,115,85,0.05)] border border-[rgba(139,115,85,0.2)] rounded-sm">
                <input
                  type="checkbox"
                  checked={guidelinesAccepted}
                  onChange={(e) => setGuidelinesAccepted(e.target.checked)}
                  className="mt-0.5 accent-[var(--gold-dark)]"
                />
                <span className="text-xs text-[#cfbeaf] font-bold">
                  上記の注意事項・ガイドラインを確認し、同意します。
                </span>
              </label>

              <p className="text-[10px] text-[#8b7355]">
                ※運営が掲示許可を出すまで、一週間ほど時間をいただく場合があります。
              </p>

              <button
                onClick={() => setStep('form')}
                disabled={!guidelinesAccepted}
                className="w-full py-3 bg-[var(--gold-dark)] text-white font-black text-sm rounded-sm hover:brightness-110 transition-all shadow-[inset_0_-3px_0_rgba(0,0,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                同意して次へ進む
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* クエスト名 */}
              <div>
                <label className={labelClass}>クエスト名 <span className="text-red-500">*</span></label>
                <input
                  type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                  className={inputClass} placeholder="例: Webサイト制作の手伝い"
                />
              </div>

              {/* クエスト内容 */}
              <div>
                <label className={labelClass}>クエスト内容 <span className="text-red-500">*</span></label>
                <textarea
                  required value={description} onChange={(e) => setDescription(e.target.value)}
                  className={`${inputClass} min-h-[100px]`}
                  placeholder="クエストの詳細な内容を記載してください..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 募集人数 */}
                <div>
                  <label className={labelClass}><Users size={12} className="inline mr-1" />募集人数 <span className="text-red-500">*</span></label>
                  <input
                    type="number" min="1" max="100" required value={maxApplicants}
                    onChange={(e) => setMaxApplicants(parseInt(e.target.value) || 1)}
                    className={inputClass}
                  />
                </div>

                {/* クエスト種別 */}
                <div>
                  <label className={labelClass}>クエスト種別 <span className="text-red-500">*</span></label>
                  <select value={questType} onChange={(e) => setQuestType(e.target.value)} className={inputClass}>
                    {QUEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* 報酬 */}
              <div>
                <label className={labelClass}>報酬</label>
                <input
                  type="text" value={reward} onChange={(e) => setReward(e.target.value)}
                  className={inputClass} placeholder="例: 5,000円 / 昼食おごり / 経験値のみ"
                />
                <p className="text-[10px] text-[#8b7355] mt-1">※金銭をやり取りする場合は注意事項をご確認ください。</p>
              </div>

              {/* タグ */}
              <div>
                <label className={labelClass}><Tag size={12} className="inline mr-1" />タグ付け</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_TAGS.map(tag => (
                    <button
                      key={tag} type="button" onClick={() => togglePresetTag(tag)}
                      className={`text-[10px] px-2 py-1 rounded-sm border transition-all ${
                        tags.includes(tag)
                          ? 'bg-[var(--gold-dark)] text-white border-[var(--gold-dark)]'
                          : 'border-[rgba(139,115,85,0.3)] text-[#8b7355] hover:border-[var(--gold-dark)]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text" value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className={`flex-1 ${inputClass}`}
                    placeholder="カスタムタグを追加..."
                  />
                  <button type="button" onClick={handleAddTag}
                    className="px-3 py-2 bg-[rgba(139,115,85,0.2)] text-[#cfbeaf] text-xs font-bold rounded-sm hover:bg-[rgba(139,115,85,0.3)] transition-colors"
                  >
                    追加
                  </button>
                </div>
                {tags.filter(t => !PRESET_TAGS.includes(t)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.filter(t => !PRESET_TAGS.includes(t)).map(tag => (
                      <span key={tag} className="text-[10px] text-[#cfbeaf] bg-[rgba(139,115,85,0.15)] px-2 py-0.5 rounded-sm border border-[rgba(139,115,85,0.3)] flex items-center gap-1">
                        {tag}
                        <X size={8} className="cursor-pointer hover:text-red-400" onClick={() => handleRemoveTag(tag)} />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 掲示期間 */}
              <div>
                <label className={labelClass}><Calendar size={12} className="inline mr-1" />掲示期間 <span className="text-red-500">*</span></label>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => setDurationMode('weeks')}
                    className={`flex-1 py-2 text-xs font-bold rounded-sm border transition-all ${
                      durationMode === 'weeks'
                        ? 'bg-[var(--gold-dark)] text-white border-[var(--gold-dark)]'
                        : 'border-[rgba(139,115,85,0.3)] text-[#8b7355]'
                    }`}
                  >
                    <Clock size={12} className="inline mr-1" />n週間指定
                  </button>
                  <button type="button" onClick={() => setDurationMode('date')}
                    className={`flex-1 py-2 text-xs font-bold rounded-sm border transition-all ${
                      durationMode === 'date'
                        ? 'bg-[var(--gold-dark)] text-white border-[var(--gold-dark)]'
                        : 'border-[rgba(139,115,85,0.3)] text-[#8b7355]'
                    }`}
                  >
                    <Calendar size={12} className="inline mr-1" />日付指定
                  </button>
                </div>
                {durationMode === 'weeks' ? (
                  <div>
                    <select value={durationWeeks} onChange={(e) => setDurationWeeks(parseInt(e.target.value))} className={inputClass}>
                      {Array.from({ length: 26 }, (_, i) => i + 1).map(w => (
                        <option key={w} value={w}>{w}週間</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-[#8b7355] mt-1">※運営が掲示許可を出した日から{durationWeeks}週間の掲示となります。</p>
                  </div>
                ) : (
                  <div>
                    <input
                      type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      max={maxEndDate()}
                      className={`${inputClass} [color-scheme:dark]`}
                    />
                    <p className="text-[10px] text-[#8b7355] mt-1">※指定した日付の0:00に掲示が終了します（最大半年先まで）。</p>
                  </div>
                )}
              </div>

              {/* 送信ボタン */}
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setStep('guidelines')}
                  className="flex-1 py-2 bg-[rgba(139,115,85,0.1)] border border-[rgba(139,115,85,0.3)] text-[#cfbeaf] font-bold text-sm rounded-sm hover:bg-[rgba(139,115,85,0.2)] transition-colors"
                >
                  戻る
                </button>
                <button type="submit" disabled={loading}
                  className="flex-[2] py-2 bg-[var(--gold-dark)] text-white font-black text-sm rounded-sm hover:brightness-110 transition-all shadow-[inset_0_-3px_0_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-[inset_0_0_0_rgba(0,0,0,0)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  {loading ? '申請中...' : 'クエストを申請する'}
                </button>
              </div>

              <p className="text-[10px] text-center text-[#8b7355]">
                ※クエストは運営の審査後に掲示されます。
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

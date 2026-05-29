'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, AlertCircle, FileText, Calendar, Clock, Hash, Users, Tag } from 'lucide-react';
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

const inputStyle = {
  width: '100%',
  background: 'var(--bg-base)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '0.625rem 0.875rem',
  fontSize: '0.875rem',
  color: 'var(--color-text-primary)',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
} as React.CSSProperties;

const focusInput = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = 'var(--color-primary)';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,74,58,0.1)';
};
const blurInput = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = 'var(--color-border)';
  e.currentTarget.style.boxShadow = 'none';
};

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
  const [step, setStep] = useState<'guidelines' | 'form'>('guidelines');

  if (!isOpen) return null;

  const handleAddTag = () => {
    const trimmed = customTag.trim();
    if (trimmed && !tags.includes(trimmed)) { setTags(prev => [...prev, trimmed]); setCustomTag(''); }
  };
  const handleRemoveTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));
  const togglePresetTag = (tag: string) => tags.includes(tag) ? setTags(prev => prev.filter(t => t !== tag)) : setTags(prev => [...prev, tag]);
  const maxEndDate = () => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d.toISOString().split('T')[0]; };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !questType) { setError('必須項目が入力されていません。'); return; }
    setLoading(true); setError(null);
    try {
      await createQuest({ title, description, quest_type: questType, max_applicants: maxApplicants, reward, tags, listing_duration_type: durationMode, listing_duration_weeks: durationMode === 'weeks' ? durationWeeks : null, listing_end_date: durationMode === 'date' ? endDate : null });
      onClose();
      setTitle(''); setDescription(''); setQuestType(QUEST_TYPES[0]); setMaxApplicants(1); setReward(''); setTags([]);
      setDurationMode('weeks'); setDurationWeeks(2); setEndDate(''); setStep('guidelines'); setGuidelinesAccepted(false);
    } catch (err: any) { setError(err.message || 'クエスト作成に失敗しました。'); } finally { setLoading(false); }
  };

  const labelStyle = { display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.375rem' } as React.CSSProperties;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(15,10,5,0.4)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)' }}
      >
        <div className="sticky top-0 flex justify-between items-center px-6 py-4 border-b z-10" style={{ background: 'var(--bg-card)', borderColor: 'var(--color-border)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>新しいクエストの掲示</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-tertiary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          ><X size={18} /></button>
        </div>

        <div className="p-6">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl mb-4 text-sm font-medium" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              <AlertCircle size={14} className="mt-0.5 shrink-0" /><p>{error}</p>
            </div>
          )}

          {step === 'guidelines' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--color-primary)' }}>
                <FileText size={16} />
                <span className="text-sm font-semibold">注意事項・ガイドライン</span>
              </div>

              <div className="rounded-xl p-4 max-h-[45vh] overflow-y-auto" style={{ background: 'var(--bg-base)', border: '1px solid var(--color-border)' }}>
                <pre className="text-xs leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)' }}>
                  {GUIDELINES_TEXT}
                </pre>
              </div>

              <label className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--color-border)' }}>
                <input type="checkbox" checked={guidelinesAccepted} onChange={e => setGuidelinesAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#1a4a3a]" />
                <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  上記の注意事項・ガイドラインを確認し、同意します。
                </span>
              </label>

              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                ※運営が掲示許可を出すまで一週間ほど時間をいただく場合があります。
              </p>

              <button onClick={() => setStep('form')} disabled={!guidelinesAccepted}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--bg-dark)', color: 'var(--color-text-inverse)' }}
                onMouseEnter={e => { if (guidelinesAccepted) (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; }}
              >同意して次へ進む</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label style={labelStyle}>クエスト名 <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="例: Webサイト制作の手伝い" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
              </div>

              <div>
                <label style={labelStyle}>クエスト内容 <span style={{ color: '#dc2626' }}>*</span></label>
                <textarea required value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="クエストの詳細な内容を記載してください..."
                  style={{ ...inputStyle, minHeight: 100, resize: 'vertical' } as React.CSSProperties}
                  onFocus={focusInput} onBlur={blurInput}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}><Users size={13} className="inline mr-1" />募集人数 <span style={{ color: '#dc2626' }}>*</span></label>
                  <input type="number" min="1" max="100" required value={maxApplicants} onChange={e => setMaxApplicants(parseInt(e.target.value) || 1)} style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
                </div>
                <div>
                  <label style={labelStyle}>クエスト種別 <span style={{ color: '#dc2626' }}>*</span></label>
                  <select value={questType} onChange={e => setQuestType(e.target.value)} style={inputStyle} onFocus={focusInput} onBlur={blurInput}>
                    {QUEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>報酬</label>
                <input type="text" value={reward} onChange={e => setReward(e.target.value)} placeholder="例: 5,000円 / 昼食おごり / 経験値のみ" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>※金銭をやり取りする場合は注意事項をご確認ください。</p>
              </div>

              <div>
                <label style={labelStyle}><Tag size={13} className="inline mr-1" />タグ付け</label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {PRESET_TAGS.map(tag => (
                    <button key={tag} type="button" onClick={() => togglePresetTag(tag)}
                      className="text-xs px-3 py-1.5 rounded-full border transition-all font-medium"
                      style={tags.includes(tag)
                        ? { background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', borderColor: 'var(--bg-dark)' }
                        : { background: 'var(--bg-card)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }
                      }
                    >{tag}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={customTag} onChange={e => setCustomTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="カスタムタグを追加..."
                    style={{ ...inputStyle, flex: 1 } as React.CSSProperties}
                    onFocus={focusInput} onBlur={blurInput}
                  />
                  <button type="button" onClick={handleAddTag}
                    className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                  >追加</button>
                </div>
                {tags.filter(t => !PRESET_TAGS.includes(t)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.filter(t => !PRESET_TAGS.includes(t)).map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full" style={{ color: 'var(--color-text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)' }}>
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)} className="transition-colors" style={{ color: 'var(--color-text-tertiary)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'; }}
                        ><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}><Calendar size={13} className="inline mr-1" />掲示期間 <span style={{ color: '#dc2626' }}>*</span></label>
                <div className="flex gap-2 mb-3">
                  {(['weeks', 'date'] as const).map(mode => (
                    <button key={mode} type="button" onClick={() => setDurationMode(mode)}
                      className="flex-1 py-2 text-sm font-semibold rounded-lg border transition-all"
                      style={durationMode === mode
                        ? { background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', borderColor: 'var(--bg-dark)' }
                        : { background: 'var(--bg-card)', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }
                      }
                    >
                      {mode === 'weeks' ? <><Clock size={12} className="inline mr-1" />n週間指定</> : <><Calendar size={12} className="inline mr-1" />日付指定</>}
                    </button>
                  ))}
                </div>
                {durationMode === 'weeks' ? (
                  <>
                    <select value={durationWeeks} onChange={e => setDurationWeeks(parseInt(e.target.value))} style={inputStyle} onFocus={focusInput} onBlur={blurInput}>
                      {Array.from({ length: 26 }, (_, i) => i + 1).map(w => <option key={w} value={w}>{w}週間</option>)}
                    </select>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>※掲示許可から{durationWeeks}週間の掲示となります。</p>
                  </>
                ) : (
                  <>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={new Date().toISOString().split('T')[0]} max={maxEndDate()} style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>※指定した日付の0:00に掲示が終了します（最大半年先まで）。</p>
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep('guidelines')}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                >戻る</button>
                <button type="submit" disabled={loading}
                  className="flex-[2] py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{ background: 'var(--bg-dark)', color: 'var(--color-text-inverse)' }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; }}
                ><Send size={15} />{loading ? '申請中...' : 'クエストを申請する'}</button>
              </div>

              <p className="text-xs text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                ※クエストは運営の審査後に掲示されます。
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

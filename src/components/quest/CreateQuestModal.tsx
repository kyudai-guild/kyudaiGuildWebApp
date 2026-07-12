'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Send, AlertCircle, FileText, Calendar, Clock, Users, Tag } from 'lucide-react';
import { useGuild } from '@/contexts/GuildContext';

type CreateQuestModalProps = { isOpen: boolean; onClose: () => void };

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

const iStyle: React.CSSProperties = { width: '100%', background: 'var(--bg-base)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '0.625rem 0.875rem', fontSize: '0.875rem', color: 'var(--color-text-primary)', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box' };
const labelS: React.CSSProperties = { display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.375rem' };
const focusI = (e: React.FocusEvent<any>) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,74,58,0.1)'; };
const blurI = (e: React.FocusEvent<any>) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; };

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
  const [emailPublic, setEmailPublic] = useState(true);
  const [preferredContact, setPreferredContact] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(2);
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
  const [step, setStep] = useState<'guidelines' | 'form'>('guidelines');

  if (!isOpen) return null;

  const addTag = () => { const t = customTag.trim(); if (t && !tags.includes(t)) { setTags(p => [...p, t]); setCustomTag(''); } };
  const removeTag = (t: string) => setTags(p => p.filter(x => x !== t));
  const togglePreset = (t: string) => tags.includes(t) ? setTags(p => p.filter(x => x !== t)) : setTags(p => [...p, t]);
  const maxEnd = () => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d.toISOString().split('T')[0]; };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !questType) { setError('必須項目が入力されていません。'); return; }
    setLoading(true); setError(null);
    try {
      await createQuest({ title, description, quest_type: questType, max_applicants: maxApplicants, reward, tags, listing_duration_type: durationMode, listing_duration_weeks: durationMode === 'weeks' ? durationWeeks : null, listing_end_date: durationMode === 'date' ? endDate : null, contact_email_public: emailPublic, preferred_contact: preferredContact.trim() || null });
      onClose();
      setTitle(''); setDescription(''); setQuestType(QUEST_TYPES[0]); setMaxApplicants(1); setReward(''); setTags([]);
      setDurationMode('weeks'); setDurationWeeks(2); setEndDate(''); setStep('guidelines'); setGuidelinesAccepted(false);
    } catch (err: any) { setError(err.message || 'クエスト作成に失敗しました。'); } finally { setLoading(false); }
  };

  const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(15,10,5,0.4)', backdropFilter: 'blur(4px)' };
  const panel: React.CSSProperties = { position: 'relative', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', borderRadius: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: '0 12px 40px rgba(31,20,15,0.12)' };
  const stickyHeader: React.CSSProperties = { position: 'sticky', top: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: 'var(--bg-card)', zIndex: 10 };
  const body: React.CSSProperties = { padding: '1.5rem' };

  return (
    <div style={overlay}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }} style={panel}>
        <div style={stickyHeader}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>新しいクエストの掲示</h2>
          <button onClick={onClose} style={{ padding: '0.375rem', borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--color-text-tertiary)', background: 'none', border: 'none', transition: 'background 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          ><X size={18} /></button>
        </div>

        <div style={body}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} /><p>{error}</p>
            </div>
          )}

          {step === 'guidelines' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                <FileText size={16} /><span style={{ fontSize: '0.875rem', fontWeight: 600 }}>注意事項・ガイドライン</span>
              </div>
              <div style={{ borderRadius: '0.75rem', padding: '1rem', maxHeight: '45vh', overflowY: 'auto', background: 'var(--bg-base)', border: '1px solid var(--color-border)' }}>
                <pre style={{ fontSize: '0.75rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)' }}>{GUIDELINES_TEXT}</pre>
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', borderRadius: '0.75rem', cursor: 'pointer', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)' }}>
                <input type="checkbox" checked={guidelinesAccepted} onChange={e => setGuidelinesAccepted(e.target.checked)} style={{ width: 16, height: 16, marginTop: 2, accentColor: 'var(--color-primary)', cursor: 'pointer' }} />
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>上記の注意事項・ガイドラインを確認し、同意します。</span>
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>※運営が掲示許可を出すまで一週間ほど時間をいただく場合があります。</p>
              <button onClick={() => setStep('form')} disabled={!guidelinesAccepted}
                style={{ width: '100%', padding: '0.875rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: guidelinesAccepted ? 'pointer' : 'not-allowed', opacity: guidelinesAccepted ? 1 : 0.4, background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', border: 'none', transition: 'background 0.2s' }}
                onMouseEnter={e => { if (guidelinesAccepted) (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; }}
              >同意して次へ進む</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={labelS}>クエスト名 <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="例: Webサイト制作の手伝い" style={iStyle} onFocus={focusI} onBlur={blurI} />
              </div>
              <div>
                <label style={labelS}>クエスト内容 <span style={{ color: '#dc2626' }}>*</span></label>
                <textarea required value={description} onChange={e => setDescription(e.target.value)} placeholder="クエストの詳細な内容を記載してください..." style={{ ...iStyle, minHeight: 100, resize: 'vertical' }} onFocus={focusI} onBlur={blurI} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelS}><Users size={13} style={{ display: 'inline', marginRight: 4 }} />募集人数 <span style={{ color: '#dc2626' }}>*</span></label>
                  <input type="number" min="1" max="100" required value={maxApplicants} onChange={e => setMaxApplicants(parseInt(e.target.value) || 1)} style={iStyle} onFocus={focusI} onBlur={blurI} />
                </div>
                <div>
                  <label style={labelS}>クエスト種別 <span style={{ color: '#dc2626' }}>*</span></label>
                  <select value={questType} onChange={e => setQuestType(e.target.value)} style={iStyle} onFocus={focusI} onBlur={blurI}>
                    {QUEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelS}>報酬</label>
                <input type="text" value={reward} onChange={e => setReward(e.target.value)} placeholder="例: 5,000円 / 昼食おごり / 経験値のみ" style={iStyle} onFocus={focusI} onBlur={blurI} />
                <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--color-text-tertiary)' }}>※金銭をやり取りする場合は注意事項をご確認ください。</p>
              </div>
              <div>
                <label style={labelS}><Tag size={13} style={{ display: 'inline', marginRight: 4 }} />タグ付け</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.75rem' }}>
                  {PRESET_TAGS.map(tag => (
                    <button key={tag} type="button" onClick={() => togglePreset(tag)}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid', cursor: 'pointer', fontWeight: 500, transition: 'all 0.15s', background: tags.includes(tag) ? 'var(--bg-dark)' : 'var(--bg-card)', color: tags.includes(tag) ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)', borderColor: tags.includes(tag) ? 'var(--bg-dark)' : 'var(--color-border)' }}
                    >{tag}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" value={customTag} onChange={e => setCustomTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="カスタムタグを追加..." style={{ ...iStyle, flex: 1 }} onFocus={focusI} onBlur={blurI} />
                  <button type="button" onClick={addTag} style={{ padding: '0.625rem 1rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.75rem', cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>追加</button>
                </div>
                {tags.filter(t => !PRESET_TAGS.includes(t)).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
                    {tags.filter(t => !PRESET_TAGS.includes(t)).map(tag => (
                      <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', padding: '0.25rem 0.625rem', borderRadius: '9999px', color: 'var(--color-text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)' }}>
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} style={{ cursor: 'pointer', color: 'var(--color-text-tertiary)', background: 'none', border: 'none', display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'; }}
                        ><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label style={labelS}><Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />掲示期間 <span style={{ color: '#dc2626' }}>*</span></label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {(['weeks', 'date'] as const).map(mode => (
                    <button key={mode} type="button" onClick={() => setDurationMode(mode)}
                      style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.75rem', border: '1px solid', cursor: 'pointer', transition: 'all 0.15s', background: durationMode === mode ? 'var(--bg-dark)' : 'var(--bg-card)', color: durationMode === mode ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)', borderColor: durationMode === mode ? 'var(--bg-dark)' : 'var(--color-border)' }}
                    >
                      {mode === 'weeks' ? <><Clock size={12} style={{ display: 'inline', marginRight: 4 }} />n週間指定</> : <><Calendar size={12} style={{ display: 'inline', marginRight: 4 }} />日付指定</>}
                    </button>
                  ))}
                </div>
                {durationMode === 'weeks' ? (
                  <>
                    <select value={durationWeeks} onChange={e => setDurationWeeks(parseInt(e.target.value))} style={iStyle} onFocus={focusI} onBlur={blurI}>
                      {Array.from({ length: 26 }, (_, i) => i + 1).map(w => <option key={w} value={w}>{w}週間</option>)}
                    </select>
                    <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--color-text-tertiary)' }}>※掲示許可から{durationWeeks}週間の掲示となります。</p>
                  </>
                ) : (
                  <>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={new Date().toISOString().split('T')[0]} max={maxEnd()} style={iStyle} onFocus={focusI} onBlur={blurI} />
                    <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--color-text-tertiary)' }}>※指定した日付の0:00に掲示が終了します（最大半年先まで）。</p>
                  </>
                )}
              </div>
              <div>
                <label style={labelS}>連絡先の公開</label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', borderRadius: '0.75rem', cursor: 'pointer', background: 'var(--bg-base)', border: '1px solid var(--color-border)' }}>
                  <input type="checkbox" checked={emailPublic} onChange={e => setEmailPublic(e.target.checked)} style={{ width: 16, height: 16, marginTop: 2, accentColor: 'var(--color-primary)', cursor: 'pointer' }} />
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                    <b style={{ color: 'var(--color-text-primary)' }}>九大メールアドレスを応募者に公開する（推奨）</b><br />
                    公開すると、応募を検討している人があなたに直接連絡できます。チェックを外しても掲示はできます。
                  </span>
                </label>
                <div style={{ marginTop: '0.75rem' }}>
                  <label style={labelS}>希望する連絡手段（任意）</label>
                  <input type="text" value={preferredContact} onChange={e => setPreferredContact(e.target.value)}
                    placeholder="例: LINE ID: xxxx / Instagram: @xxxx" style={iStyle} onFocus={focusI} onBlur={blurI} />
                  <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--color-text-tertiary)' }}>
                    ※記入すると、マッチング成立時に応募者へ「この連絡先に連絡してください」と案内されます。
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
                <button type="button" onClick={() => setStep('guidelines')}
                  style={{ flex: 1, padding: '0.875rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                >戻る</button>
                <button type="submit" disabled={loading}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', border: 'none', transition: 'background 0.2s' }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; }}
                ><Send size={15} />{loading ? '申請中...' : 'クエストを申請する'}</button>
              </div>
              <p style={{ fontSize: '0.75rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>※クエストは運営の審査後に掲示されます。</p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

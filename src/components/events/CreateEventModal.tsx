'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Send, AlertCircle, Calendar, Clock, MapPin, Users, Tag, Check } from 'lucide-react';
import { EVENT_COLORS, DEFAULT_EVENT_COLOR } from './types';

interface Props { isOpen: boolean; onClose: () => void; onCreated: () => void; }

const iS: React.CSSProperties = { width: '100%', background: 'var(--bg-base)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '0.625rem 0.875rem', fontSize: '0.875rem', color: 'var(--color-text-primary)', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box' };
const lS: React.CSSProperties = { display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.375rem' };
const focus = (e: React.FocusEvent<any>) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,74,58,0.1)'; };
const blur  = (e: React.FocusEvent<any>) => { e.currentTarget.style.borderColor = 'var(--color-border)';  e.currentTarget.style.boxShadow = 'none'; };

export default function CreateEventModal({ isOpen, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [eventDate, setEventDate] = useState('');      // datetime-local（時間指定）/ date（終日）
  const [eventEndDate, setEventEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [color, setColor] = useState(DEFAULT_EVENT_COLOR);
  const [capacity, setCapacity] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const addTag = () => { const t = customTag.trim(); if (t && !tags.includes(t)) { setTags(p => [...p, t]); setCustomTag(''); } };
  const removeTag = (t: string) => setTags(p => p.filter(x => x !== t));

  const reset = () => {
    setTitle(''); setDescription(''); setAllDay(false); setEventDate(''); setEventEndDate('');
    setLocation(''); setLocationUrl(''); setColor(DEFAULT_EVENT_COLOR);
    setCapacity(''); setTags([]); setError(null);
  };

  // 終日⇔時間指定の切替時は、入力形式（date / datetime-local）が変わるため日時をリセット
  const toggleAllDay = (next: boolean) => {
    setAllDay(next);
    setEventDate('');
    setEventEndDate('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !eventDate) { setError('タイトルと開催日時は必須です。'); return; }

    // datetime-local / date の値はタイムゾーン情報を持たない。
    // そのまま送ると DB(timestamptz) が UTC として解釈し、JSTで9時間ズレる。
    // ここで「入力者のローカル時刻」として解釈してから ISO(UTC) に変換して送る。
    let startIso: string;
    let endIso: string | null = null;
    if (allDay) {
      startIso = new Date(`${eventDate}T00:00:00`).toISOString();
      // 終日の終了日は「その日いっぱい」まで含める（未入力なら開始日のみの終日）
      const endDay = eventEndDate || eventDate;
      endIso = new Date(`${endDay}T23:59:59`).toISOString();
    } else {
      startIso = new Date(eventDate).toISOString();
      endIso = eventEndDate ? new Date(eventEndDate).toISOString() : null;
    }
    if (endIso && new Date(endIso) < new Date(startIso)) {
      setError('終了日時は開始日時より後にしてください。');
      return;
    }

    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, event_date: startIso,
          event_end_date: endIso,
          all_day: allDay,
          location: location || null, location_url: locationUrl || null,
          color, capacity: capacity ? Number(capacity) : null, tags,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      reset(); onCreated(); onClose();
    } catch (err: any) { setError(err.message || 'イベントの登録に失敗しました。'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(15,10,5,0.4)', backdropFilter: 'blur(4px)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }}
        style={{ position: 'relative', width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', borderRadius: '1.25rem', background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: '0 12px 40px rgba(31,20,15,0.12)' }}
      >
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', background: 'var(--bg-card)', zIndex: 10 }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>新しいイベントを登録</h2>
          <button onClick={() => { reset(); onClose(); }} style={{ padding: '0.375rem', borderRadius: '0.5rem', cursor: 'pointer', color: 'var(--color-text-tertiary)', background: 'none', border: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          ><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 500, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} /><p>{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label style={lS}>タイトル <span style={{ color: '#dc2626' }}>*</span></label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="例: 第5回ロボコン技術講習会" style={iS} onFocus={focus} onBlur={blur} />
          </div>

          {/* All-day toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.875rem', borderRadius: '0.75rem', cursor: 'pointer', background: 'var(--bg-base)', border: '1px solid var(--color-border)' }}>
            <input type="checkbox" checked={allDay} onChange={e => toggleAllDay(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>終日イベント</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>（時刻を指定しない）</span>
          </label>

          {/* Date / Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={lS}><Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />{allDay ? '開始日' : '開始日時'} <span style={{ color: '#dc2626' }}>*</span></label>
              <input type={allDay ? 'date' : 'datetime-local'} required value={eventDate} onChange={e => setEventDate(e.target.value)} style={iS} onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <label style={lS}><Clock size={13} style={{ display: 'inline', marginRight: 4 }} />{allDay ? '終了日（任意）' : '終了日時'}</label>
              <input type={allDay ? 'date' : 'datetime-local'} value={eventEndDate} min={allDay ? eventDate || undefined : undefined} onChange={e => setEventEndDate(e.target.value)} style={iS} onFocus={focus} onBlur={blur} />
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '-0.75rem' }}>
            ※複数日にわたるイベントは、終了{allDay ? '日' : '日時'}に最終日を指定してください。
          </p>

          {/* Color */}
          <div>
            <label style={lS}>表示色</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {EVENT_COLORS.map(c => {
                const active = color === c.value;
                return (
                  <button key={c.value} type="button" onClick={() => setColor(c.value)} title={c.label} aria-label={c.label}
                    style={{ width: 34, height: 34, borderRadius: '9999px', cursor: 'pointer', background: c.value, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.15s, box-shadow 0.15s',
                      border: active ? '2px solid var(--bg-card)' : '2px solid transparent',
                      boxShadow: active ? `0 0 0 2px ${c.value}` : 'none',
                      transform: active ? 'scale(1.08)' : 'scale(1)' }}
                  >{active && <Check size={16} strokeWidth={3} style={{ color: '#fff' }} />}</button>
                );
              })}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.375rem' }}>カレンダー上での識別に使われます。</p>
          </div>

          {/* Location */}
          <div>
            <label style={lS}><MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />場所</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="例: 伊都キャンパス ウエスト1号館101" style={iS} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label style={lS}>地図URL（任意）</label>
            <input type="url" value={locationUrl} onChange={e => setLocationUrl(e.target.value)} placeholder="https://maps.google.com/..." style={iS} onFocus={focus} onBlur={blur} />
          </div>

          {/* Capacity */}
          <div>
            <label style={lS}><Users size={13} style={{ display: 'inline', marginRight: 4 }} />定員（任意）</label>
            <input type="number" min="1" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="人数を入力" style={{ ...iS, maxWidth: 160 }} onFocus={focus} onBlur={blur} />
          </div>

          {/* Description */}
          <div>
            <label style={lS}>詳細・説明</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="イベントの詳細内容を記載してください..."
              style={{ ...iS, minHeight: 100, resize: 'vertical' }} onFocus={focus} onBlur={blur} />
          </div>

          {/* Tags */}
          <div>
            <label style={lS}><Tag size={13} style={{ display: 'inline', marginRight: 4 }} />タグ</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input type="text" value={customTag} onChange={e => setCustomTag(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="タグを追加..."
                style={{ ...iS, flex: 1 }} onFocus={focus} onBlur={blur}
              />
              <button type="button" onClick={addTag}
                style={{ padding: '0.625rem 1rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.75rem', cursor: 'pointer', background: 'var(--bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
              >追加</button>
            </div>
            {tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {tags.map(tag => (
                  <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', padding: '0.25rem 0.625rem', borderRadius: '9999px', color: 'var(--color-text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)' }}>
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} style={{ cursor: 'pointer', color: 'var(--color-text-tertiary)', background: 'none', border: 'none', display: 'flex', alignItems: 'center' }}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', border: 'none', transition: 'background 0.2s' }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; }}
          ><Send size={15} />{loading ? '登録中...' : 'イベントを登録する'}</button>
          <p style={{ fontSize: '0.75rem', textAlign: 'center', color: 'var(--color-text-tertiary)', marginTop: '-0.5rem' }}>
            ※登録後すぐに公開されます。
          </p>
        </form>
      </motion.div>
    </div>
  );
}

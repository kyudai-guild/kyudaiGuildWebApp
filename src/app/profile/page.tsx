'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Scroll, Heart, Pencil } from 'lucide-react';
import { useGuild } from '@/contexts/GuildContext';

interface Option { id: string; label: string; description?: string }
interface Stats { posted_total: number; posted_completed: number; accepted_completed: number; thanks_received: number; member_since: string | null }
interface PostedItem { id: string; title: string; quest_type: string; status: string; reward: string; created_at: string; completed_at: string | null }
interface AppliedItem { id: string; status: string; applied_at: string; quest: { id: string; title: string; quest_type: string; status: string; reward: string; completed_at: string | null } | null }

const TYPE_COLORS: Record<string, [string, string]> = {
  '業務委託': ['#d97706', '#fffbeb'], '仲間探し': ['#059669', '#ecfdf5'],
  '研究協力': ['#2563eb', '#eff6ff'], 'ボランティア募集': ['#e11d48', '#fff1f2'],
  '雇用契約': ['#7c3aed', '#f5f3ff'], 'その他': ['#6b7280', '#f9fafb'],
};
const typeBadge = (t: string) => {
  const [c, bg] = TYPE_COLORS[t] ?? TYPE_COLORS['その他'];
  return <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.1875rem 0.625rem', borderRadius: '9999px', whiteSpace: 'nowrap', color: c, background: bg }}>{t}</span>;
};

const rankLabel = (n: number) => n >= 10 ? '✦ ベテラン冒険者' : n >= 3 ? '✦ 一人前の冒険者' : '✦ かけだし冒険者';

const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: '1rem', boxShadow: 'var(--shadow-card)' };
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-base)', border: '1px solid var(--color-border)', borderRadius: '0.75rem',
  padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box',
};

export default function ProfilePage() {
  const router = useRouter();
  const { member, isLoggedIn } = useGuild();
  const [stats, setStats] = useState<Stats | null>(null);
  const [posted, setPosted] = useState<PostedItem[]>([]);
  const [applied, setApplied] = useState<AppliedItem[]>([]);
  const [postedMore, setPostedMore] = useState(false);
  const [appliedMore, setAppliedMore] = useState(false);
  const [filter, setFilter] = useState<'all' | 'applied' | 'posted'>('all');
  const [loading, setLoading] = useState(true);

  // 編集
  const [editing, setEditing] = useState(false);
  const [options, setOptions] = useState<{ purposes: Option[]; interests: Option[] }>({ purposes: [], interests: [] });
  const [selPurposes, setSelPurposes] = useState<Set<string>>(new Set());
  const [selInterests, setSelInterests] = useState<Set<string>>(new Set());
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [bio, setBio] = useState('');
  const [lineNotify, setLineNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [interestLabels, setInterestLabels] = useState<string[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, a, opts, prof] = await Promise.all([
        fetch('/api/profile/stats').then(r => r.ok ? r.json() : null),
        fetch('/api/profile/history?role=posted').then(r => r.ok ? r.json() : { items: [], hasMore: false }),
        fetch('/api/profile/history?role=applied').then(r => r.ok ? r.json() : { items: [], hasMore: false }),
        fetch('/api/options').then(r => r.ok ? r.json() : { purposes: [], interests: [] }),
        fetch('/api/profile').then(r => r.ok ? r.json() : null),
      ]);
      setStats(s);
      setPosted(p.items); setPostedMore(p.hasMore);
      setApplied(a.items); setAppliedMore(a.hasMore);
      setOptions(opts);
      if (prof) {
        setSelPurposes(new Set(prof.purpose_ids ?? []));
        setSelInterests(new Set(prof.interest_ids ?? []));
        setSkills(prof.qualifications ?? []);
        setBio(prof.bio ?? '');
        if (prof.line_notify !== undefined && prof.line_notify !== null) setLineNotify(prof.line_notify);
        const ids = new Set(prof.interest_ids ?? []);
        setInterestLabels((opts.interests ?? []).filter((o: Option) => ids.has(o.id)).map((o: Option) => o.label));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadMore = async (role: 'posted' | 'applied') => {
    const offset = role === 'posted' ? posted.length : applied.length;
    const res = await fetch(`/api/profile/history?role=${role}&offset=${offset}`);
    if (!res.ok) return;
    const data = await res.json();
    if (role === 'posted') { setPosted(prev => [...prev, ...data.items]); setPostedMore(data.hasMore); }
    else { setApplied(prev => [...prev, ...data.items]); setAppliedMore(data.hasMore); }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose_ids: [...selPurposes], interest_ids: [...selInterests],
          qualifications: skills, bio, line_notify: lineNotify,
        }),
      });
      if (res.ok) { setEditing(false); loadAll(); }
    } finally {
      setSaving(false);
    }
  };

  const appliedStatus = (item: AppliedItem) => {
    if (item.quest?.status === 'completed' && item.status === 'accepted') return { label: '完了', color: '#059669', bg: '#ecfdf5' };
    if (item.status === 'accepted') return { label: 'マッチ成立', color: '#059669', bg: '#ecfdf5' };
    if (item.status === 'rejected') return { label: '見送り', color: '#6b7280', bg: '#f9fafb' };
    return { label: '応募中', color: '#d97706', bg: '#fffbeb' };
  };
  const postedStatus = (item: PostedItem) => {
    if (item.status === 'completed') return { label: '完了', color: '#059669', bg: '#ecfdf5' };
    if (item.status === 'approved') return { label: '掲示中', color: '#2563eb', bg: '#eff6ff' };
    if (item.status === 'rejected') return { label: 'リジェクト', color: '#dc2626', bg: '#fef2f2' };
    if (item.status === 'closed') return { label: '終了', color: '#6b7280', bg: '#f9fafb' };
    return { label: '審査中', color: '#d97706', bg: '#fffbeb' };
  };

  type Row = { key: string; date: string; title: string; type: string; role: '受注' | '発注'; st: { label: string; color: string; bg: string }; reward: string };
  const rows: Row[] = [
    ...(filter !== 'applied' ? posted.map(p => ({ key: 'p' + p.id, date: p.created_at, title: p.title, type: p.quest_type, role: '発注' as const, st: postedStatus(p), reward: p.reward })) : []),
    ...(filter !== 'posted' ? applied.filter(a => a.quest).map(a => ({ key: 'a' + a.id, date: a.applied_at, title: a.quest!.title, type: a.quest!.quest_type, role: '受注' as const, st: appliedStatus(a), reward: a.quest!.reward })) : []),
  ].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());

  const chip = (opt: Option, selected: boolean, onClick: () => void) => (
    <button key={opt.id} onClick={onClick}
      style={{ fontSize: '0.8125rem', fontWeight: 500, padding: '0.375rem 0.875rem', borderRadius: '9999px', cursor: 'pointer',
        background: selected ? 'var(--bg-dark)' : 'var(--bg-base)',
        color: selected ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
        border: selected ? '1.5px solid var(--bg-dark)' : '1.5px solid var(--color-border)' }}
    >{opt.label}</button>
  );

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>プロフィールを見るにはログインしてください。</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--color-border)', padding: 'clamp(1rem, 4vw, 1.5rem) clamp(1rem, 4vw, 2rem)', marginBottom: '1.5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <button onClick={() => router.push('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 500, marginBottom: '1rem', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--color-text-tertiary)' }}
          ><ArrowLeft size={14} />ホームへ戻る</button>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 72, height: 72, borderRadius: '9999px', flexShrink: 0, background: 'var(--bg-dark)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              {member.name.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>{member.name}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', background: '#f2f7f4', border: '1px solid #cfe3d8', borderRadius: '9999px', padding: '0.25rem 0.75rem' }}>
                  {rankLabel(stats?.accepted_completed ?? 0)}
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>
                {stats?.member_since && `${new Date(stats.member_since).getFullYear()}年${new Date(stats.member_since).getMonth() + 1}月からギルドに参加`}
              </p>
              {(interestLabels.length > 0 || skills.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem' }}>
                  {[...interestLabels, ...skills].slice(0, 6).map(t => (
                    <span key={t} style={{ fontSize: '0.75rem', fontWeight: 600, background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: '9999px', padding: '0.1875rem 0.625rem' }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setEditing(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1rem', fontSize: '0.8125rem', fontWeight: 600, borderRadius: '0.75rem', cursor: 'pointer', color: 'var(--color-text-secondary)', background: 'var(--bg-base)', border: '1px solid var(--color-border)' }}
            ><Pencil size={13} />{editing ? '編集をやめる' : 'プロフィールを編集'}</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem) 3rem' }}>
        {editing && (
          <div style={{ ...card, padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '1rem' }}>プロフィールの編集</h3>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>利用目的</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              {options.purposes.map(o => chip(o, selPurposes.has(o.id), () => {
                const next = new Set(selPurposes); if (next.has(o.id)) next.delete(o.id); else next.add(o.id); setSelPurposes(next);
              }))}
            </div>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>興味のある分野</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              {options.interests.map(o => chip(o, selInterests.has(o.id), () => {
                const next = new Set(selInterests); if (next.has(o.id)) next.delete(o.id); else next.add(o.id); setSelInterests(next);
              }))}
            </div>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem' }}>資格・スキル<span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 400, marginLeft: '0.375rem' }}>Enterで追加</span></p>
            <input style={inputStyle} value={skillInput} onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const s = skillInput.trim(); if (s && !skills.includes(s)) { setSkills(prev => [...prev, s]); setSkillInput(''); } } }}
              placeholder="例: TOEIC 800点" />
            {skills.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.625rem' }}>
                {skills.map(s => (
                  <button key={s} onClick={() => setSkills(prev => prev.filter(x => x !== s))}
                    style={{ fontSize: '0.8125rem', padding: '0.375rem 0.875rem', borderRadius: '9999px', cursor: 'pointer', background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', border: 'none' }}
                  >{s} ✕</button>
                ))}
              </div>
            )}
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, margin: '1rem 0 0.5rem' }}>できること・自己PR</p>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80, lineHeight: 1.7 }} value={bio} onChange={e => setBio(e.target.value)} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>LINE通知を受け取る（準備中）</span>
              <button onClick={() => setLineNotify(v => !v)}
                style={{ width: 44, height: 24, borderRadius: '9999px', border: 'none', cursor: 'pointer', position: 'relative', background: lineNotify ? 'var(--color-primary)' : 'var(--bg-tertiary)' }}>
                <span style={{ position: 'absolute', top: 2, left: lineNotify ? 22 : 2, width: 20, height: 20, borderRadius: '9999px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
              </button>
            </div>
            <button onClick={saveProfile} disabled={saving}
              style={{ width: '100%', marginTop: '1.25rem', padding: '0.875rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', cursor: 'pointer', border: 'none' }}
            >{saving ? '保存中...' : '保存する'}</button>
          </div>
        )}

        <div className="pf-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: '受注して完了したクエスト', value: stats?.accepted_completed ?? '-', unit: '件', sub: null },
            { label: '発注したクエスト', value: stats?.posted_total ?? '-', unit: '件', sub: stats ? `うち完了 ${stats.posted_completed}件` : null },
            { label: 'もらった感謝の言葉', value: stats?.thanks_received ?? '-', unit: '通', sub: 'link' },
            { label: '活動開始', value: stats?.member_since ? `${new Date(stats.member_since).getFullYear()}年${new Date(stats.member_since).getMonth() + 1}月` : '-', unit: '', sub: null },
          ].map(t => (
            <div key={t.label} style={{ ...card, padding: '1.125rem 1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{t.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: t.unit ? '1.75rem' : '1.125rem', fontWeight: 700, lineHeight: 1.4 }}>
                {t.value}{t.unit && <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-tertiary)', marginLeft: 2 }}>{t.unit}</span>}
              </div>
              {t.sub === 'link'
                ? <button onClick={() => router.push('/thanks')} style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>見返す →</button>
                : t.sub && <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-primary)' }}>{t.sub}</div>}
            </div>
          ))}
        </div>

        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '0.75rem' }}>
          <Scroll size={16} style={{ color: 'var(--color-accent)' }} />クエスト履歴
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
          {([['all', 'すべて'], ['applied', '受注したクエスト'], ['posted', '発注したクエスト']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              style={{ fontSize: '0.8125rem', fontWeight: 600, padding: '0.375rem 0.9375rem', borderRadius: '9999px', cursor: 'pointer',
                background: filter === key ? 'var(--bg-dark)' : 'var(--bg-card)',
                color: filter === key ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                border: filter === key ? '1px solid var(--bg-dark)' : '1px solid var(--color-border)' }}
            >{label}</button>
          ))}
        </div>

        {loading ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)', padding: '2rem 0', textAlign: 'center' }}>読み込み中...</p>
        ) : rows.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '3rem 2rem' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-tertiary)' }}>まだ履歴がありません。掲示板からクエストに応募してみましょう。</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {rows.map(r => (
              <div key={r.key} style={{ ...card, display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', flexWrap: 'wrap' }}>
                {typeBadge(r.type)}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{r.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                    {new Date(r.date).toLocaleDateString('ja-JP')}{r.reward ? ` ・ ${r.reward}` : ''}
                  </div>
                </div>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.1875rem 0.625rem', borderRadius: '9999px', color: r.st.color, background: r.st.bg }}>{r.st.label}</span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.1875rem 0.625rem', borderRadius: '9999px', border: '1px solid',
                  color: r.role === '受注' ? 'var(--color-primary)' : '#b45309',
                  borderColor: r.role === '受注' ? '#cfe3d8' : '#fde68a',
                  background: r.role === '受注' ? '#f2f7f4' : '#fffbeb' }}>{r.role}</span>
              </div>
            ))}
            {((filter !== 'applied' && postedMore) || (filter !== 'posted' && appliedMore)) && (
              <button onClick={() => { if (filter !== 'applied' && postedMore) loadMore('posted'); if (filter !== 'posted' && appliedMore) loadMore('applied'); }}
                style={{ margin: '0.5rem auto 0', fontSize: '0.8125rem', fontWeight: 600, padding: '0.625rem 1.5rem', borderRadius: '9999px', cursor: 'pointer', color: 'var(--color-text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--color-border)' }}
              >もっと見る</button>
            )}
          </div>
        )}

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button onClick={() => router.push('/thanks')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
          ><Heart size={13} />もらった感謝の言葉を見る</button>
        </div>
      </div>
      <style>{`@media (max-width: 640px) { .pf-stat-grid { grid-template-columns: 1fr 1fr !important; } }`}</style>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, CheckCircle2 } from 'lucide-react';
import { useGuild } from '@/contexts/GuildContext';

interface Option { id: string; label: string; description?: string }

const card: React.CSSProperties = {
  width: '100%', maxWidth: 560, margin: '0 auto', borderRadius: '1.25rem', padding: '2rem',
  background: 'var(--bg-card)', border: '1px solid var(--color-border)', boxShadow: '0 8px 24px rgba(31,20,15,0.08)',
};
const btnPrimary: React.CSSProperties = {
  flex: 1, padding: '0.875rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600,
  background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', cursor: 'pointer', border: 'none', transition: 'background 0.2s',
};
const btnGhost: React.CSSProperties = {
  padding: '0.875rem 1.25rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600,
  color: 'var(--color-text-secondary)', background: 'var(--bg-base)', border: '1px solid var(--color-border)', cursor: 'pointer',
};
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--bg-base)', border: '1px solid var(--color-border)', borderRadius: '0.75rem',
  padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box',
};

export default function OnboardingPage() {
  const router = useRouter();
  const { markOnboarded } = useGuild();
  const [step, setStep] = useState(1);
  const [purposes, setPurposes] = useState<Option[]>([]);
  const [interests, setInterests] = useState<Option[]>([]);
  const [selPurposes, setSelPurposes] = useState<Set<string>>(new Set());
  const [selInterests, setSelInterests] = useState<Set<string>>(new Set());
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lineLinked, setLineLinked] = useState(false);

  // LINE連携は外部サイトへ遷移するため、入力内容を保存し終えた完了ステップで行う
  const lineLinkHref = `/api/line/login?mode=link&next=${encodeURIComponent('/onboarding')}`;

  useEffect(() => {
    // LINE連携から戻ってきたときは完了ステップに着地させる
    const params = new URLSearchParams(window.location.search);
    const linked = params.get('line') === 'linked';
    const errParam = params.get('error');
    if (linked || errParam) {
      setStep(4);
      if (errParam) setError(errParam);
      window.history.replaceState(null, '', window.location.pathname);
    }

    Promise.all([
      fetch('/api/options').then(r => r.ok ? r.json() : { purposes: [], interests: [] }),
      fetch('/api/profile').then(r => r.ok ? r.json() : null),
    ]).then(([opts, profile]) => {
      setPurposes(opts.purposes ?? []);
      setInterests(opts.interests ?? []);
      if (profile) {
        setSelPurposes(new Set(profile.purpose_ids ?? []));
        setSelInterests(new Set(profile.interest_ids ?? []));
        setSkills(profile.qualifications ?? []);
        setBio(profile.bio ?? '');
        setLineLinked(Boolean(profile.line_user_id));
      }
    }).catch(() => {});
  }, []);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) { setSkills(prev => [...prev, s]); setSkillInput(''); }
  };

  const save = async (skipped: boolean) => {
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skipped ? { onboarded: true } : {
          purpose_ids: [...selPurposes],
          interest_ids: [...selInterests],
          qualifications: skills,
          bio,
          onboarded: true,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || '保存に失敗しました。');
      markOnboarded();
      if (skipped) { router.push('/'); return; }
      setStep(4);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const progressStep = (n: number, label: string) => {
    const done = step > n; const current = step === n;
    return (
      <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: n < 3 ? 1 : 0 }}>
        <span style={{ width: 28, height: 28, borderRadius: '9999px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, background: done || current ? 'var(--bg-dark)' : 'var(--bg-secondary)', color: done || current ? 'var(--color-accent)' : 'var(--color-text-tertiary)', border: '1px solid var(--color-border)' }}>{n}</span>
        <span className="ob-step-label" style={{ fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', color: current ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>{label}</span>
        {n < 3 && <span style={{ flex: 1, height: 2, background: done ? 'var(--color-primary)' : 'var(--bg-tertiary)', borderRadius: 2, minWidth: 12 }} />}
      </div>
    );
  };

  const chip = (opt: Option, selected: boolean, onClick: () => void) => (
    <button key={opt.id} onClick={onClick}
      style={{ fontSize: '0.8125rem', fontWeight: 500, padding: '0.4375rem 0.9375rem', borderRadius: '9999px', cursor: 'pointer', transition: 'all 0.2s',
        background: selected ? 'var(--bg-dark)' : 'var(--bg-base)',
        color: selected ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
        border: selected ? '1.5px solid var(--bg-dark)' : '1.5px solid var(--color-border)' }}
    >{opt.label}</button>
  );

  return (
    <div style={{ minHeight: 'calc(100vh - var(--header-height))', padding: '2rem 1rem 4rem' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}>
          {progressStep(1, '利用目的')}{progressStep(2, '興味分野')}{progressStep(3, 'プロフィール')}
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>{error}</div>
        )}

        {step === 1 && (
          <div style={card}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>ギルドを使う目的を教えてください</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>複数選択できます。あなたに合ったクエストのお知らせに使います。</p>
            <div className="ob-purpose-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              {purposes.map(p => {
                const selected = selPurposes.has(p.id);
                return (
                  <button key={p.id} onClick={() => toggle(selPurposes, setSelPurposes, p.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left', padding: '0.875rem 1rem', borderRadius: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', width: '100%',
                      background: selected ? '#f2f7f4' : 'var(--bg-base)',
                      border: selected ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border)' }}
                  >
                    <span style={{ width: 20, height: 20, borderRadius: '9999px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                      background: selected ? 'var(--color-primary)' : 'var(--bg-card)',
                      border: selected ? '1.5px solid var(--color-primary)' : '1.5px solid var(--color-border-strong)' }}>
                      {selected && <Check size={12} strokeWidth={3.5} style={{ color: '#fff' }} />}
                    </span>
                    <span>
                      <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.4 }}>{p.label}</span>
                      {p.description && <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>{p.description}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1.5rem' }}>
              <button style={btnGhost} onClick={() => save(true)} disabled={saving}>あとで設定する</button>
              <button style={{ ...btnPrimary, opacity: selPurposes.size === 0 ? 0.5 : 1 }} disabled={selPurposes.size === 0} onClick={() => setStep(2)}>次へ</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={card}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>興味のある分野を選んでください</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>複数選択できます。あとからプロフィールで変更できます。</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {interests.map(o => chip(o, selInterests.has(o.id), () => toggle(selInterests, setSelInterests, o.id)))}
            </div>
            <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1.5rem' }}>
              <button style={btnGhost} onClick={() => setStep(1)}>戻る</button>
              <button style={{ ...btnPrimary, opacity: selInterests.size === 0 ? 0.5 : 1 }} disabled={selInterests.size === 0} onClick={() => setStep(3)}>次へ</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={card}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>あなたのことを教えてください</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>持っている資格やできることは、依頼者があなたを知る手がかりになります。</p>

            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>資格・スキル<span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: 400, marginLeft: '0.375rem' }}>Enterで追加</span></label>
            <input style={inputStyle} value={skillInput} onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
              placeholder="例: TOEIC 800点 / 基本情報技術者 / 普通自動車免許" />
            {skills.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.625rem' }}>
                {skills.map(s => (
                  <button key={s} onClick={() => setSkills(prev => prev.filter(x => x !== s))}
                    style={{ fontSize: '0.8125rem', fontWeight: 500, padding: '0.4375rem 0.9375rem', borderRadius: '9999px', cursor: 'pointer', background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', border: 'none' }}
                  >{s} <span style={{ opacity: 0.7 }}>✕</span></button>
                ))}
              </div>
            )}

            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, margin: '1.25rem 0 0.5rem' }}>できること・自己PR</label>
            <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 96, lineHeight: 1.7 }} value={bio} onChange={e => setBio(e.target.value)}
              placeholder="例: Webサイト制作の経験があります。React を1年ほど勉強しており、簡単なアプリなら一人で作れます。" />

            <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1.5rem' }}>
              <button style={btnGhost} onClick={() => setStep(2)}>戻る</button>
              <button style={btnPrimary} onClick={() => save(false)} disabled={saving}>{saving ? '保存中...' : '登録を完了する'}</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, margin: '0 auto 1.25rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <CheckCircle2 size={32} style={{ color: '#16a34a' }} />
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>ようこそ、ギルドへ！</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>初期設定が完了しました。設定はプロフィールからいつでも変更できます。</p>

            {lineLinked ? (
              <div style={{ padding: '0.875rem 1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#15803d' }}>LINE連携が完了しました</span>
                </div>
                <p style={{ fontSize: '0.6875rem', color: '#15803d', opacity: 0.8, marginTop: '0.375rem' }}>
                  マッチしたクエストの通知は、プロフィール画面からいつでもオン/オフできます。
                </p>
              </div>
            ) : (
              <div style={{ textAlign: 'left', padding: '1.125rem 1.25rem', borderRadius: '0.75rem', marginBottom: '1.5rem', background: '#f2f7f4', border: '1px solid #cfe3d8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
                  <span style={{ width: 32, height: 32, borderRadius: '0.5rem', flexShrink: 0, background: '#06c755', color: '#fff', fontWeight: 800, fontSize: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)' }}>LINE</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>LINEと連携する（任意）</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.8, marginBottom: '0.875rem' }}>
                  ・選んだ分野に合うクエストが掲示されたらお知らせが届きます<br />
                  ・次回からはLINEでログインできます（パスワード不要）
                </p>
                <a href={lineLinkHref}
                  style={{ display: 'block', textAlign: 'center', padding: '0.75rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 700, background: '#06c755', color: '#fff', textDecoration: 'none' }}
                >LINEと連携する</a>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <button style={btnGhost} onClick={() => router.push('/profile')}>プロフィールを見る</button>
              <button style={btnPrimary} onClick={() => router.push('/')}>クエストを探しに行く</button>
            </div>
            {!lineLinked && (
              <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', marginTop: '0.875rem' }}>
                連携はあとからプロフィール画面でも行えます。
              </p>
            )}
          </div>
        )}
      </div>
      <style>{`@media (max-width: 640px) { .ob-purpose-grid { grid-template-columns: 1fr !important; } .ob-step-label { display: none; } }`}</style>
    </div>
  );
}

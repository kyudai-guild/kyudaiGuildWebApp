'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Crown, UserPlus, Trash2, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * 団体長（運営が指名）にだけ表示する「団体の管理」欄。
 *   - メールアドレスを入力して、自分の団体に所属を追加する
 *   - 一般メンバーを外す
 *   - 団体の紹介・問い合わせ先を編集する（依頼フォームの初期値になる）
 *
 * メンバー一覧に出すのはメールアドレスだけで、表示名は出さない。
 * 「メールで追加 → 表示名を見る」を繰り返して他人のアカウントを
 * 割り出せないようにするため（2026-09 会議の指示）。
 */

type Member = { profile_id: string; email: string | null; role: 'member' | 'manager'; is_me: boolean };
type ManagedOrg = { id: string; name: string; description: string | null; public_contact: string | null; members: Member[] };

const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--color-border)', borderRadius: '1rem', boxShadow: 'var(--shadow-card)' };
const input: React.CSSProperties = { width: '100%', background: 'var(--bg-base)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '0.625rem 0.875rem', fontSize: '0.875rem', color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box' };
const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', fontSize: '0.8125rem', fontWeight: 600, borderRadius: '0.75rem', cursor: 'pointer', border: 'none', background: 'var(--bg-dark)', color: 'var(--color-text-inverse)' };

function OrgCard({ org, onChanged }: { org: ManagedOrg; onChanged: () => void }) {
  const [email, setEmail] = useState('');
  const [intro, setIntro] = useState(org.description ?? '');
  const [contact, setContact] = useState(org.public_contact ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'info' | 'error'; text: string } | null>(null);

  const add = async () => {
    if (!email.trim()) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/org-manager/members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: org.id, email }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || '追加に失敗しました。');
      setMsg({ kind: d.result === 'added' ? 'ok' : 'info', text: d.message });
      if (d.result === 'added') { setEmail(''); onChanged(); }
    } catch (e: any) { setMsg({ kind: 'error', text: e.message }); } finally { setBusy(false); }
  };

  const remove = async (m: Member) => {
    if (!confirm(`${m.email ?? 'このメンバー'} を団体から外しますか？\nこの団体のクエストのトークからも外れます。`)) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/org-manager/members?organization_id=${org.id}&profile_id=${m.profile_id}`, { method: 'DELETE' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || '外すのに失敗しました。');
      onChanged();
    } catch (e: any) { setMsg({ kind: 'error', text: e.message }); } finally { setBusy(false); }
  };

  const saveInfo = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/org-manager', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: org.id, description: intro, public_contact: contact }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || '保存に失敗しました。');
      setMsg({ kind: 'ok', text: '団体情報を保存しました。次にクエストを出すときの初期値になります。' });
      onChanged();
    } catch (e: any) { setMsg({ kind: 'error', text: e.message }); } finally { setBusy(false); }
  };

  const msgStyle = msg && {
    ok: { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' },
    info: { background: 'var(--bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' },
    error: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' },
  }[msg.kind];

  return (
    <div style={{ padding: '1rem 0', borderTop: '1px solid var(--color-border)' }}>
      <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.75rem' }}>{org.name}</p>

      {msg && msgStyle && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.625rem 0.875rem', borderRadius: '0.625rem', marginBottom: '0.75rem', fontSize: '0.8125rem', lineHeight: 1.6, ...msgStyle }}>
          {msg.kind === 'error' ? <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} /> : <CheckCircle2 size={14} style={{ marginTop: 2, flexShrink: 0 }} />}
          {msg.text}
        </div>
      )}

      {/* メールで追加 */}
      <p style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.375rem' }}>メンバーを追加</p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="追加する人がログインに使っているメールアドレス" style={{ ...input, flex: 1 }} autoComplete="off" />
        <button type="button" onClick={add} disabled={busy || !email.trim()} style={{ ...btn, opacity: busy || !email.trim() ? 0.5 : 1, flexShrink: 0 }}>
          <UserPlus size={14} />追加
        </button>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem', lineHeight: 1.6 }}>
        相手が先にアプリに登録（ログイン）している必要があります。追加した人は、この団体の名義でクエストを出せるようになります。
        追加・削除は運営にも通知されます。
      </p>

      {/* メンバー一覧（メールアドレスのみ） */}
      <p style={{ fontSize: '0.8125rem', fontWeight: 700, margin: '1rem 0 0.375rem' }}>メンバー（{org.members.length}人）</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {org.members.map(m => (
          <div key={m.profile_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '0.625rem', background: 'var(--bg-base)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {m.email ?? '（メールアドレス不明）'}{m.is_me && '（あなた）'}
            </span>
            {m.role === 'manager' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: '9999px', color: '#92400e', background: '#fef3c7', flexShrink: 0 }}>
                <Crown size={10} />団体長
              </span>
            ) : (
              <button type="button" onClick={() => remove(m)} disabled={busy} aria-label="団体から外す"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.625rem', borderRadius: '9999px', cursor: 'pointer', flexShrink: 0, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                <Trash2 size={11} />外す
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 団体情報 */}
      <p style={{ fontSize: '0.8125rem', fontWeight: 700, margin: '1rem 0 0.375rem' }}>団体情報（クエストに掲示されます）</p>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginBottom: '0.375rem' }}>団体の紹介（1〜2文）</p>
      <textarea value={intro} onChange={e => setIntro(e.target.value)} maxLength={500} style={{ ...input, minHeight: 64, resize: 'vertical', lineHeight: 1.7 }}
        placeholder="団体を知らない九大生に伝わるように" />
      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', margin: '0.625rem 0 0.375rem' }}>九大生からの問い合わせ先</p>
      <textarea value={contact} onChange={e => setContact(e.target.value)} maxLength={300} style={{ ...input, minHeight: 52, resize: 'vertical', lineHeight: 1.7 }}
        placeholder="公式LINE・Instagram・九大メールアドレスなど" />
      <button type="button" onClick={saveInfo} disabled={busy} style={{ ...btn, marginTop: '0.625rem', opacity: busy ? 0.5 : 1 }}>
        <Save size={14} />団体情報を保存
      </button>
    </div>
  );
}

export default function OrgManagerPanel() {
  const [orgs, setOrgs] = useState<ManagedOrg[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/org-manager');
      if (!res.ok) { setOrgs([]); return; }
      setOrgs((await res.json()).organizations ?? []);
    } catch { setOrgs([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // 団体長でなければ何も出さない
  if (!orgs || orgs.length === 0) return null;

  return (
    <div style={{ ...card, padding: '1.25rem 1.5rem', marginBottom: '1.5rem', border: '1px solid #fde68a' }}>
      <p style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.9375rem', fontWeight: 700 }}>
        <Crown size={15} style={{ color: '#d97706' }} />団体の管理（団体長）
      </p>
      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', lineHeight: 1.6, marginTop: '0.125rem' }}>
        あなたが団体長を務める団体です。メンバーの追加・削除と、団体情報の編集ができます。
      </p>
      {orgs.map(o => <OrgCard key={o.id} org={o} onChanged={load} />)}
    </div>
  );
}

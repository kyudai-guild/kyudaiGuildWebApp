'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { LogIn, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signUpComplete, setSignUpComplete] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const validateEmail = (emailStr: string) => {
    const cleanEmail = emailStr.trim().toLowerCase();
    // 九大アドレスは常に許可
    if (cleanEmail.endsWith('@s.kyushu-u.ac.jp') || cleanEmail.endsWith('@m.kyushu-u.ac.jp')) return true;
    // 開発用ホワイトリスト（NEXT_PUBLIC_DEV_EMAILS にカンマ区切りで設定）
    const devEmails = (process.env.NEXT_PUBLIC_DEV_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    return devEmails.includes(cleanEmail);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!validateEmail(cleanEmail)) {
      setError('九大のメールアドレス（@s.kyushu-u.ac.jp または @m.kyushu-u.ac.jp）のみ登録可能です。');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
        if (data.user && !data.user.email_confirmed_at) {
          await supabase.auth.signOut();
          setError('メールアドレスの認証が完了していません。確認メールのリンクをクリックしてから再度ログインしてください。');
          return;
        }
        router.push('/');
        router.refresh();
      } else {
        if (!displayName) { setError('表示名を入力してください。'); setLoading(false); return; }
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail, password,
          options: { data: { display_name: displayName }, emailRedirectTo: `${location.origin}/auth/callback` },
        });
        if (error) throw error;
        if (data.session) await supabase.auth.signOut();
        setSignUpComplete(true);
      }
    } catch (err: any) {
      setError(err.message || '認証エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 420,
    margin: '0 auto',
    borderRadius: '1.25rem',
    padding: '2.5rem',
    background: 'var(--bg-card)',
    border: '1px solid var(--color-border)',
    boxShadow: '0 8px 24px rgba(31,20,15,0.08)',
  };

  const inputWrapStyle: React.CSSProperties = {
    position: 'relative',
    marginBottom: '1rem',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-base)',
    border: '1px solid var(--color-border)',
    borderRadius: '0.75rem',
    paddingLeft: '2.75rem',
    paddingRight: '1rem',
    paddingTop: '0.75rem',
    paddingBottom: '0.75rem',
    fontSize: '0.875rem',
    color: 'var(--color-text-primary)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: '0.875rem',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    color: 'var(--color-text-tertiary)',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: '0.5rem',
  };

  const focusInput = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-primary)';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,74,58,0.1)';
  };
  const blurInput = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-border)';
    e.currentTarget.style.boxShadow = 'none';
  };

  if (signUpComplete) {
    return (
      <div style={cardStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 1.5rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <CheckCircle2 size={32} style={{ color: '#16a34a' }} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
            確認メールを送信しました
          </h2>
          <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
            入力いただいたメールアドレス宛に確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。
          </p>
          <p style={{ fontSize: '0.75rem', marginBottom: '2rem', color: 'var(--color-text-tertiary)' }}>
            メールが届かない場合は迷惑メールフォルダもご確認ください。
          </p>
          <button
            onClick={() => { setSignUpComplete(false); setIsLogin(true); }}
            style={{ width: '100%', padding: '0.875rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, background: 'var(--bg-dark)', color: 'var(--color-text-inverse)', cursor: 'pointer', transition: 'background 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; }}
          >
            ログイン画面に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ width: 52, height: 52, margin: '0 auto 1rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>
          <LogIn size={22} style={{ color: 'var(--color-accent)' }} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
          {isLogin ? 'ログイン' : '新規登録'}
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
          ※九州大学関係者のみ利用可能です
        </p>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
          <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
          <p>{error}</p>
        </div>
      )}
      {message && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }}>
          <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
          <p>{message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>表示名</label>
            <div style={inputWrapStyle}>
              <User size={15} style={iconStyle} />
              <input type="text" required value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="冒険者名" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
            </div>
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>九大メールアドレス</label>
          <div style={inputWrapStyle}>
            <Mail size={15} style={iconStyle} />
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="xxx@s.kyushu-u.ac.jp" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>パスワード</label>
          <div style={inputWrapStyle}>
            <Lock size={15} style={iconStyle} />
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '0.875rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, background: loading ? 'var(--color-text-tertiary)' : 'var(--bg-dark)', color: 'var(--color-text-inverse)', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s', opacity: loading ? 0.6 : 1 }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; }}
        >
          {loading ? '通信中...' : isLogin ? 'ログイン' : 'アカウントを作成'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }}
          style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', cursor: 'pointer', transition: 'color 0.2s', background: 'none', border: 'none' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'; }}
        >
          {isLogin ? '初めての方は新規登録' : 'すでにアカウントをお持ちの方'}
        </button>
      </div>
    </div>
  );
}

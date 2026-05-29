'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { LogIn, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';

const inputStyle = {
  width: '100%',
  background: 'var(--bg-base)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  paddingLeft: '2.75rem',
  paddingRight: '1rem',
  paddingTop: '0.625rem',
  paddingBottom: '0.625rem',
  fontSize: '0.875rem',
  color: 'var(--color-text-primary)',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
} as React.CSSProperties;

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
    return cleanEmail.endsWith('@s.kyushu-u.ac.jp') || cleanEmail.endsWith('@m.kyushu-u.ac.jp');
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
      <div className="w-full max-w-md mx-auto rounded-2xl p-8 shadow-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)' }}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-6" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <CheckCircle2 size={32} style={{ color: '#16a34a' }} />
          </div>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
            確認メールを送信しました
          </h2>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            入力いただいたメールアドレス宛に確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。
          </p>
          <p className="text-xs mb-8" style={{ color: 'var(--color-text-tertiary)' }}>
            メールが届かない場合は迷惑メールフォルダもご確認ください。
          </p>
          <button
            onClick={() => { setSignUpComplete(false); setIsLogin(true); }}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'var(--bg-dark)', color: 'var(--color-text-inverse)' }}
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
    <div className="w-full max-w-md mx-auto rounded-2xl p-8 shadow-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--color-border)' }}>
      <div className="text-center mb-8">
        <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-dark)' }}>
          <LogIn size={22} style={{ color: 'var(--color-accent)' }} />
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
          {isLogin ? 'ログイン' : '新規登録'}
        </h2>
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          ※九州大学関係者のみ利用可能です
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl mb-4 text-sm font-medium" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {message && (
        <div className="flex items-start gap-2 p-3 rounded-xl mb-4 text-sm font-medium" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }}>
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <p>{message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>表示名</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-tertiary)' }} />
              <input type="text" required value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="冒険者名" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>九大メールアドレス</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-tertiary)' }} />
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="xxx@s.kyushu-u.ac.jp" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>パスワード</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-tertiary)' }} />
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
          </div>
        </div>

        <button
          type="submit" disabled={loading}
          className="w-full py-3 mt-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ background: 'var(--bg-dark)', color: 'var(--color-text-inverse)' }}
          onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark-hover)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-dark)'; }}
        >
          {loading ? '通信中...' : isLogin ? 'ログイン' : 'アカウントを作成'}
        </button>
      </form>

      <div className="mt-6 text-center pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }}
          className="text-sm font-medium transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'; }}
        >
          {isLogin ? '初めての方は新規登録' : 'すでにアカウントをお持ちの方'}
        </button>
      </div>
    </div>
  );
}

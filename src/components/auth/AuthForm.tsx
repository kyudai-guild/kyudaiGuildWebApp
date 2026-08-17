'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { LogIn, Mail, Lock, User, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

/** Supabase の Email OTP Length は 6〜10桁で設定できる。最短の6桁を入力完了の下限とする */
const MIN_OTP_LENGTH = 6;
const MAX_OTP_LENGTH = 10;

/** メール欄のワンタップ補完に出す九大ドメイン */
const KYUDAI_DOMAINS = ['@s.kyushu-u.ac.jp', '@m.kyushu-u.ac.jp'];

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signUpComplete, setSignUpComplete] = useState(false);
  // 確認コード方式で使う。サインアップ時のアドレスを保持しておく
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // LINE連携などからのリダイレクト時に ?error= が付いてくる
  // （useSearchParams は静的プリレンダリングで Suspense が必要になるため location を直接読む）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) {
      setError(err);
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // 新規登録は九大アドレスのみ。運営が直接追加したアカウントのログインを妨げないよう、
  // この検証はサインアップ時にのみ適用する（ログインは Supabase の認証に委ねる）。
  const validateEmail = (emailStr: string) => {
    const cleanEmail = emailStr.trim().toLowerCase();
    return cleanEmail.endsWith('@s.kyushu-u.ac.jp') || cleanEmail.endsWith('@m.kyushu-u.ac.jp');
  };

  /** 入力済みの @ より前を残して、九大ドメインを補完する */
  const fillDomain = (domain: string) => {
    const local = email.split('@')[0].trim();
    if (!local) {
      emailRef.current?.focus();
      return;
    }
    setEmail(local + domain);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!isLogin && !validateEmail(cleanEmail)) {
      setError('九大のメールアドレス（@s.kyushu-u.ac.jp または @m.kyushu-u.ac.jp）のみ登録可能です。');
      return;
    }
    if (!isLogin && password !== passwordConfirm) {
      setError('パスワードが一致しません。同じパスワードを2回入力してください。');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
        if (data.user && !data.user.email_confirmed_at) {
          await supabase.auth.signOut();
          setError('メールアドレスの確認が完了していません。届いた確認コードを入力して登録を完了してください。');
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
        setPendingEmail(cleanEmail);
        setSignUpComplete(true);
      }
    } catch (err: any) {
      setError(err.message || '認証エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  /**
   * メールに記載された6桁コードで確認する。
   *
   * リンク方式をやめた理由: Microsoft Defender の Safe Links などのメールセキュリティが
   * 配信前にリンクを取得して検査するため、1回限りの確認リンクが本人より先に消費され、
   * 「使用済み」になってしまう。コードならスキャナーが消費できない。
   */
  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.replace(/\D/g, '');
    // 桁数は Supabase の Email OTP Length 設定に依存する（6〜10桁）ため、固定しない
    if (code.length < MIN_OTP_LENGTH) { setError('確認コードを正しく入力してください。'); return; }
    setVerifying(true); setError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: pendingEmail, token: code, type: 'signup',
      });
      if (error) throw error;
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || '確認コードが正しくないか、有効期限が切れています。');
    } finally {
      setVerifying(false);
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
            確認コードを送信しました
          </h2>
          <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
            <b style={{ color: 'var(--color-text-primary)' }}>{pendingEmail}</b> 宛に<br />
            確認コードを送信しました。下に入力してください。
          </p>

          {error && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', textAlign: 'left' }}>
              <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={verifyCode}>
            <input
              type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={MAX_OTP_LENGTH}
              value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, MAX_OTP_LENGTH))}
              placeholder="コードを入力" autoFocus
              style={{ width: '100%', textAlign: 'center', letterSpacing: '0.28em', fontSize: 'clamp(1.125rem, 5vw, 1.5rem)', fontWeight: 700, fontFamily: 'var(--font-display)', padding: '0.875rem 0.75rem', borderRadius: '0.75rem', background: 'var(--bg-base)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', outline: 'none', boxSizing: 'border-box' }}
              onFocus={focusInput} onBlur={blurInput}
            />
            <button type="submit" disabled={verifying || otp.length < MIN_OTP_LENGTH}
              style={{ width: '100%', marginTop: '1rem', padding: '0.875rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 600, background: verifying || otp.length < MIN_OTP_LENGTH ? 'var(--color-text-tertiary)' : 'var(--bg-dark)', color: 'var(--color-text-inverse)', cursor: verifying || otp.length < MIN_OTP_LENGTH ? 'not-allowed' : 'pointer', border: 'none', opacity: verifying || otp.length < MIN_OTP_LENGTH ? 0.6 : 1 }}
            >{verifying ? '確認中...' : '登録を完了する'}</button>
          </form>

          <p style={{ fontSize: '0.75rem', margin: '1.25rem 0 0', lineHeight: 1.8, color: 'var(--color-text-tertiary)' }}>
            メールが届かない場合は迷惑メールフォルダもご確認ください。<br />
            コードの有効期限は1時間です。
          </p>
          <button
            onClick={() => { setSignUpComplete(false); setIsLogin(true); setOtp(''); setError(null); }}
            style={{ marginTop: '1rem', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)', cursor: 'pointer', background: 'none', border: 'none' }}
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
          <div style={{ ...inputWrapStyle, marginBottom: '0.5rem' }}>
            <Mail size={15} style={iconStyle} />
            <input ref={emailRef} type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="xxx@s.kyushu-u.ac.jp" style={inputStyle} onFocus={focusInput} onBlur={blurInput} />
          </div>
          {/* @以降のワンタップ補完 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {KYUDAI_DOMAINS.map(domain => {
              const active = email.trim().toLowerCase().endsWith(domain);
              return (
                <button key={domain} type="button" onClick={() => fillDomain(domain)}
                  style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.625rem', borderRadius: '9999px', cursor: 'pointer', transition: 'all 0.15s',
                    background: active ? '#f2f7f4' : 'var(--bg-base)',
                    color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    border: active ? '1px solid #cfe3d8' : '1px solid var(--color-border)' }}
                >{domain}</button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: isLogin ? '1.5rem' : '1rem' }}>
          <label style={labelStyle}>パスワード</label>
          <div style={inputWrapStyle}>
            <Lock size={15} style={iconStyle} />
            <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              style={{ ...inputStyle, paddingRight: '2.75rem' }} onFocus={focusInput} onBlur={blurInput} />
            <button type="button" onClick={() => setShowPw(v => !v)} tabIndex={-1}
              aria-label={showPw ? 'パスワードを隠す' : 'パスワードを表示'}
              style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', padding: '0.375rem', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}
            >{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div>
        </div>

        {!isLogin && (
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>パスワード（確認）</label>
            <div style={{ ...inputWrapStyle, marginBottom: 0 }}>
              <Lock size={15} style={iconStyle} />
              <input type={showPwConfirm ? 'text' : 'password'} required value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="もう一度入力"
                autoComplete="new-password"
                style={{ ...inputStyle, paddingRight: '2.75rem' }} onFocus={focusInput} onBlur={blurInput} />
              <button type="button" onClick={() => setShowPwConfirm(v => !v)} tabIndex={-1}
                aria-label={showPwConfirm ? 'パスワードを隠す' : 'パスワードを表示'}
                style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', padding: '0.375rem', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}
              >{showPwConfirm ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
            {passwordConfirm.length > 0 && password !== passwordConfirm && (
              <p style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.375rem' }}>パスワードが一致しません</p>
            )}
          </div>
        )}

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

      {isLogin && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0 1rem' }}>
            <span style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>または</span>
            <span style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          </div>
          <a href="/api/line/login?mode=signin"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.875rem', borderRadius: '0.75rem', fontSize: '0.875rem', fontWeight: 700, background: '#06c755', color: '#fff', textDecoration: 'none' }}
          >
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}>LINE</span>でログイン
          </a>
          <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-tertiary)', textAlign: 'center', marginTop: '0.5rem', lineHeight: 1.6 }}>
            ※事前にプロフィール画面でLINE連携をした方のみご利用いただけます。
          </p>
        </>
      )}

      <div style={{ marginTop: '1.5rem', textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); setPasswordConfirm(''); setShowPw(false); setShowPwConfirm(false); }}
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

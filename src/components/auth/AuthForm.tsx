'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { motion } from 'framer-motion';
import { Sword, Mail, Lock, User, AlertCircle } from 'lucide-react';

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        router.push('/');
        router.refresh();
      } else {
        if (!displayName) {
          setError('表示名を入力してください。');
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              display_name: displayName,
            },
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        
        if (data.session) {
          // Supabaseの設定によっては自動ログインされる
          router.push('/');
          router.refresh();
        } else {
          setMessage('確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。');
        }
      }
    } catch (err: any) {
      setError(err.message || '認証エラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto rpg-card p-6 md:p-8">
      <div className="text-center mb-8">
        <div className="w-12 h-12 mx-auto bg-[var(--bg-base)] border-2 border-[var(--border-outer)] flex items-center justify-center text-[var(--gold-light)] mb-4 shadow-[inset_2px_2px_0_rgba(0,0,0,0.15)]">
          <Sword size={24} />
        </div>
        <h2 className="font-rpg text-2xl font-black text-[var(--gold-light)]" style={{ textShadow: '2px 2px 0 var(--border-inner)' }}>
          {isLogin ? 'ギルドへ入室' : '新規冒険者登録'}
        </h2>
        <p className="text-xs text-[#8b7355] mt-2 font-bold">
          ※九州大学関係者のみ利用可能です
        </p>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 bg-red-950/50 border border-red-500/50 rounded-sm flex items-start gap-2 text-red-400 text-xs font-bold">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </motion.div>
      )}

      {message && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-sm flex items-start gap-2 text-emerald-400 text-xs font-bold">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <p>{message}</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div>
            <label className="text-xs font-bold text-[#cfbeaf] block mb-1">
              表示名 (自由に設定可能)
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b7355]" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="冒険者名"
                className="w-full bg-[rgba(139,115,85,0.1)] border border-[rgba(139,115,85,0.3)] rounded-sm pl-9 pr-3 py-2 text-sm text-[#cfbeaf] outline-none focus:border-[var(--gold-dark)] transition-colors"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-[#cfbeaf] block mb-1">
            九大メールアドレス
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b7355]" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="xxx@s.kyushu-u.ac.jp"
              className="w-full bg-[rgba(139,115,85,0.1)] border border-[rgba(139,115,85,0.3)] rounded-sm pl-9 pr-3 py-2 text-sm text-[#cfbeaf] outline-none focus:border-[var(--gold-dark)] transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-[#cfbeaf] block mb-1">
            パスワード
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b7355]" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[rgba(139,115,85,0.1)] border border-[rgba(139,115,85,0.3)] rounded-sm pl-9 pr-3 py-2 text-sm text-[#cfbeaf] outline-none focus:border-[var(--gold-dark)] transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 mt-6 bg-[var(--gold-dark)] text-white font-black text-sm rounded-sm hover:brightness-110 transition-all shadow-[inset_0_-3px_0_rgba(0,0,0,0.3)] active:translate-y-1 active:shadow-[inset_0_0_0_rgba(0,0,0,0)] disabled:opacity-50"
        >
          {loading ? '通信中...' : isLogin ? '扉を開く' : '冒険の書を作る'}
        </button>
      </form>

      <div className="mt-6 text-center border-t border-[rgba(139,115,85,0.2)] pt-4">
        <button
          onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }}
          className="text-xs text-[#cfbeaf] hover:text-[var(--gold-light)] font-bold transition-colors"
        >
          {isLogin ? '新規登録はこちら' : 'すでに冒険の書をお持ちの方はこちら'}
        </button>
      </div>
    </div>
  );
}

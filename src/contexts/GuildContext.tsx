'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { applyRolesToMember } from '@/utils/roleMapper';

/* ============================================================
   型定義
   ============================================================ */
export type Rank = '学者' | '勇者' | '魔術師' | '画家' | '詩人' | '賢者';

export interface Skill {
  category: string; // 大まかな分類
  name: string;
  level: number; // 0–100
  color: string;
  rating?: number;    // 星評価（ベイズ平均）
  evalCount?: number; // 評価件数
}

export interface Member {
  name: string;
  rank: Rank;
  mainJob: Rank;
  subJob: Rank | null;  // null = サブジョブなし
  isVisitor: boolean;   // true = ギルドロールなし（訪問者）
  skills: Skill[];
  tags: string[];       // 自分で設定した特技・タグ
  joinDate: string;
  id: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  reward: string;
  difficulty: 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
  category: 'みつける' | 'たかめる' | 'つながる' | 'つむぐ' | 'ひらく';
  completed: boolean;
  link?: string;
}

export interface LeaderboardEntry {
  discord_id: string;
  display_name: string;
  avatar_url: string | null;
  monthly_checkin_count: number;
}

export interface GuildState {
  member: Member;
  stamps: boolean[]; // 10スタンプ分（ガチャ用 TODO: 後で復活）
  isLoggedIn: boolean;
  gachaAvailable: boolean;
  quests: Quest[];
  monthlyCheckInCount: number; // 今月の拠点チェックイン回数
  checkinMonth: string;        // 'YYYY-MM' 形式
  addStamp: () => void;
  processBaseCheckIn: () => { success: boolean; message: string };
  completeQuest: (id: string) => void;
  spinGacha: () => GachaResult | null;
  updateProfile: (data: { name?: string; tags?: string[]; last_check_in_date?: string; monthly_checkin_count?: number; checkin_month?: string }) => Promise<void>;
  autoCheckInEnabled: boolean;
  setAutoCheckInEnabled: (enabled: boolean) => void;
  isAtBase: boolean;
  leaderboard: LeaderboardEntry[];
  fetchLeaderboard: () => Promise<void>;
}

export interface GachaResult {
  type: 'drink' | 'points' | 'title' | 'rare';
  label: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic';
}

const INITIAL_MEMBER: Member = {
  id: 'guest',
  name: '冒険者',
  rank: '勇者',
  mainJob: '勇者',
  subJob: null,
  isVisitor: true,
  joinDate: new Date().toISOString(),
  tags: [],
  skills: [
    { category: '学習', name: '勉強', level: 0, color: '#6366f1' },
    { category: 'クリエイティブ', name: 'デザイン', level: 0, color: '#f97316' },
    { category: '開発', name: 'コーディング', level: 0, color: '#3b82f6' },
    { category: '添削', name: '添削', level: 0, color: '#ec4899' },
    { category: '運営', name: 'イベントスタッフ', level: 0, color: '#8b5cf6' },
    { category: 'サポート', name: '運搬', level: 0, color: '#64748b' },
    { category: '語学', name: '翻訳', level: 0, color: '#06b6d4' },
    { category: '技術', name: 'エンジニア・デバイス', level: 0, color: '#a855f7' },
    { category: '生活', name: '生活', level: 0, color: '#10b981' },
    { category: 'その他', name: 'その他', level: 0, color: '#94a3b8' },
  ],
};

const INITIAL_QUESTS: Quest[] = [];

const GACHA_TABLE: GachaResult[] = [
  { type: 'drink', label: 'ドリンク割引券', description: '学内カフェで使える10%割引券', rarity: 'common' },
  { type: 'points', label: 'ギルドポイント×100', description: '経験値ボーナス！', rarity: 'common' },
  { type: 'points', label: 'ギルドポイント×200', description: '大きな経験値ボーナス！', rarity: 'rare' },
  { type: 'title', label: '「幸運児」称号', description: 'まさかの大当たり！', rarity: 'epic' },
  { type: 'drink', label: 'ドリンク無料券', description: '学内カフェで使える1杯無料券！', rarity: 'rare' },
  { type: 'rare', label: '伝説のスクロール', description: 'ギルドの謎が書かれた巻物...', rarity: 'epic' },
];

/* ============================================================
   Context
   ============================================================ */
const GuildContext = createContext<GuildState | null>(null);

export function GuildProvider({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<Member>(INITIAL_MEMBER);
  const [stamps, setStamps] = useState<boolean[]>(Array(10).fill(false));
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [gachaAvailable, setGachaAvailable] = useState(false);
  const [quests, setQuests] = useState<Quest[]>(INITIAL_QUESTS);
  const [lastBaseCheckIn, setLastBaseCheckIn] = useState<string | null>(null);
  const [autoCheckInEnabled, setAutoCheckInEnabled] = useState(false);
  const [isAtBase, setIsAtBase] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [monthlyCheckInCount, setMonthlyCheckInCount] = useState(0);
  const [checkinMonth, setCheckinMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: session } = useSession();

  // Discordからクエストを取得
  useEffect(() => {
    fetch('/api/quests/discord')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setQuests(data);
        }
      })
      .catch(err => console.error('Failed to fetch Discord quests:', err));
  }, []);

  // セッションが変わった（Discordログインした）時にロールと名前を反映する
  useEffect(() => {
    if (session?.user) {
      const discordName = session.user.name || session.user.email || '';
      const roles = ((session.user as any).roles as string[]) || [];

      // 1. まず名前とロールを反映したメンバー情報を作る
      const baseMember: Member = discordName ? { ...member, name: discordName } : member;
      let updatedMember = roles.length > 0 ? applyRolesToMember(roles, baseMember) : baseMember;

      // 2. スキル統計（DBからの実働データ）を取得
      const fetchStats = fetch(`/api/member/stats/${encodeURIComponent(discordName)}`).then(res => res.json());
      
      // 3. プロフィール（タグなど）を取得
      const fetchProfile = fetch('/api/profile').then(res => res.json());

      Promise.all([fetchStats, fetchProfile]).then(([stats, profile]) => {
        let finalSkills = updatedMember.skills;
        if (Array.isArray(stats)) {
          finalSkills = updatedMember.skills.map(skill => {
            const stat = stats.find(s => s.skill_name === skill.name);
            return stat ? { ...skill, level: stat.level, rating: stat.rating, evalCount: stat.count } : skill;
          });
        }

        setMember({
          ...updatedMember,
          name: profile?.display_name || discordName,
          tags: profile?.tags || [],
          skills: finalSkills,
          id: profile?.discord_id || updatedMember.id
        });

        if (profile?.last_check_in_date) {
          setLastBaseCheckIn(profile.last_check_in_date);
        }

        // 月次チェックイン回数を復元（月が変わっていたらリセット）
        const currentMonth = (() => {
          const now = new Date();
          return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        })();
        if (profile?.checkin_month === currentMonth) {
          setMonthlyCheckInCount(profile.monthly_checkin_count || 0);
          setCheckinMonth(currentMonth);
        } else {
          // 月が変わっていたらリセット
          setMonthlyCheckInCount(0);
          setCheckinMonth(currentMonth);
        }

        fetchLeaderboard();
      }).catch(err => {
        console.error('Data fetch error:', err);
        setMember(updatedMember);
      });

      setIsLoggedIn(true);
    }
  }, [session]);

  // Load autoCheckInEnabled from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('guild_auto_checkin');
    if (saved === 'true') setAutoCheckInEnabled(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('guild_auto_checkin', autoCheckInEnabled.toString());
  }, [autoCheckInEnabled]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/member/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
    }
  }, []);

  const addStamp = useCallback(() => {
    setStamps((prev) => {
      const nextEmpty = prev.findIndex((s) => !s);
      if (nextEmpty === -1) return prev;
      const next = [...prev];
      next[nextEmpty] = true;
      return next;
    });
    setIsLoggedIn(true);
    setGachaAvailable(true);
  }, []);

  const updateProfile = useCallback(async (data: { name?: string; tags?: string[]; last_check_in_date?: string; monthly_checkin_count?: number; checkin_month?: string }) => {
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: data.name,
          tags: data.tags,
          last_check_in_date: data.last_check_in_date,
          monthly_checkin_count: data.monthly_checkin_count,
          checkin_month: data.checkin_month,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setMember(prev => ({
          ...prev,
          name: result.data.display_name || prev.name,
          tags: result.data.tags || prev.tags
        }));
      }
    } catch (err) {
      console.error('Profile update failed:', err);
    }
  }, []);

  const processBaseCheckIn = useCallback(() => {
    if (!isLoggedIn || member.name === '冒険者') {
      return { success: false, message: '拠点チェックインには Discord ログインが必要です！' };
    }

    const today = new Date().toLocaleDateString('ja-JP');
    if (lastBaseCheckIn === today) {
      return { success: false, message: '本日の拠点ボーナスは獲得済みです！' };
    }


    addStamp();
    setLastBaseCheckIn(today);

    // 月次カウントアップ
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const newCount = checkinMonth === currentMonth ? monthlyCheckInCount + 1 : 1;
    setMonthlyCheckInCount(newCount);
    setCheckinMonth(currentMonth);

    // DBに保存
    updateProfile({
      last_check_in_date: today,
      monthly_checkin_count: newCount,
      checkin_month: currentMonth,
    });
    
    // Discordに通知を飛ばす
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: member.name,
        message: `**${member.name}** が拠点にチェックインしました！📍`
      }),
    }).catch(err => console.error('Notify error:', err));
    
    // ランキングを更新
    fetchLeaderboard();
    
    return { success: true, message: '拠点到着！' };
  }, [isLoggedIn, member.name, addStamp, lastBaseCheckIn, updateProfile, monthlyCheckInCount, checkinMonth, fetchLeaderboard]);

  // Network listener for auto check-in (IP prefix based)
  useEffect(() => {
    const ipPrefix = process.env.NEXT_PUBLIC_BASE_WIFI_IP_PREFIX || '';

    const checkNetworkLocation = async () => {
      if (!navigator.onLine) {
        setIsAtBase(false);
        return false;
      }

      // IPプレフィックスが未設定の場合はチェックをスキップ（常に拠点と見なす）
      if (!ipPrefix.trim()) {
        setIsAtBase(true);
        return true;
      }

      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const { ip } = await res.json();
        console.log('Current public IP:', ip);

        // カンマ区切りで複数プレフィックスに対応
        const prefixes = ipPrefix.split(',').map(p => p.trim()).filter(Boolean);
        const atBase = prefixes.some(prefix => ip.startsWith(prefix));
        setIsAtBase(atBase);
        return atBase;
      } catch (err) {
        console.error('IP check failed:', err);
        setIsAtBase(false);
        return false;
      }
    };

    const tryAutoCheckIn = async () => {
      if (!autoCheckInEnabled || !isLoggedIn || member.name === '冒険者') return;
      const atBase = await checkNetworkLocation();
      if (atBase) {
        console.log('At base Wi-Fi — attempting auto check-in...');
        processBaseCheckIn();
      } else {
        console.log('Not at base Wi-Fi — skipping auto check-in.');
      }
    };

    // 起動時チェック（セッション安定を待つ）
    const timer = setTimeout(() => {
      checkNetworkLocation();
      if (autoCheckInEnabled && isLoggedIn && member.name !== '冒険者') {
        tryAutoCheckIn();
      }
    }, 3000);

    // オンライン復帰時
    const onOnline = () => tryAutoCheckIn();
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', () => setIsAtBase(false));

    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', () => setIsAtBase(false));
    };
  }, [autoCheckInEnabled, isLoggedIn, member.name, processBaseCheckIn]);

  const completeQuest = useCallback((id: string) => {
    setQuests((prev) =>
      prev.map((q) => (q.id === id ? { ...q, completed: true } : q))
    );
  }, []);

  const spinGacha = useCallback((): GachaResult | null => {
    if (!gachaAvailable) return null;
    setGachaAvailable(false);
    const roll = Math.random();
    // 重み付き抽選
    if (roll < 0.5) return GACHA_TABLE[0];
    if (roll < 0.75) return GACHA_TABLE[1];
    if (roll < 0.88) return GACHA_TABLE[4];
    if (roll < 0.95) return GACHA_TABLE[2];
    if (roll < 0.99) return GACHA_TABLE[3];
    return GACHA_TABLE[5];
  }, [gachaAvailable]);


  return (
    <GuildContext.Provider
      value={{
        member,
        stamps,
        isLoggedIn,
        gachaAvailable,
        quests,
        monthlyCheckInCount,
        checkinMonth,
        addStamp,

        processBaseCheckIn,
        completeQuest,
        spinGacha,
        updateProfile,
        autoCheckInEnabled,
        setAutoCheckInEnabled,
        isAtBase,
        leaderboard,
        fetchLeaderboard,
      }}
    >
      {children}
    </GuildContext.Provider>
  );
}

export function useGuild(): GuildState {
  const ctx = useContext(GuildContext);
  if (!ctx) throw new Error('useGuild must be used within GuildProvider');
  return ctx;
}

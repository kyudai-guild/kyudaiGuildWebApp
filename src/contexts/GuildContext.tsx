'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';

/* ============================================================
   型定義
   ============================================================ */

export interface Skill {
  name: string;
  level: number;
  color: string;
}

export interface Member {
  id: string;
  name: string;
  isVisitor: boolean;   // ログインしていない場合true
  skills: Skill[];
  tags: string[];
  joinDate: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  reward: string;
  difficulty: string;
  category: string;
  status: string;
  skill_name: string;
  creator?: { display_name: string };
  created_at: string;
}

export interface GachaResult {
  type: 'drink' | 'points' | 'title' | 'rare';
  label: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic';
}

export interface GuildState {
  member: Member;
  stamps: boolean[]; 
  isLoggedIn: boolean;
  gachaAvailable: boolean;
  quests: Quest[];
  monthlyCheckInCount: number;
  checkinMonth: string;
  addStamp: () => void;
  processBaseCheckIn: () => { success: boolean; message: string };
  spinGacha: () => GachaResult | null;
  createQuest: (questData: any) => Promise<void>;
  updateProfile: (data: { name?: string; tags?: string[] }) => Promise<void>;
  autoCheckInEnabled: boolean;
  setAutoCheckInEnabled: (enabled: boolean) => void;
  isAtBase: boolean;
  refreshQuests: () => Promise<void>;
}

const INITIAL_MEMBER: Member = {
  id: 'guest',
  name: '冒険者',
  isVisitor: true,
  joinDate: new Date().toISOString(),
  tags: [],
  skills: [],
};

const INITIAL_QUESTS: Quest[] = [];

/* ============================================================
   Context
   ============================================================ */
const GuildContext = createContext<GuildState | null>(null);

export function GuildProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  
  const [member, setMember] = useState<Member>(INITIAL_MEMBER);
  const [stamps, setStamps] = useState<boolean[]>(Array(10).fill(false));
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [gachaAvailable, setGachaAvailable] = useState(false);
  const [quests, setQuests] = useState<Quest[]>(INITIAL_QUESTS);
  const [lastBaseCheckIn, setLastBaseCheckIn] = useState<string | null>(null);
  const [autoCheckInEnabled, setAutoCheckInEnabled] = useState(false);
  const [isAtBase, setIsAtBase] = useState(false);
  const [monthlyCheckInCount, setMonthlyCheckInCount] = useState(0);
  const [checkinMonth, setCheckinMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // クエスト一覧取得
  const refreshQuests = useCallback(async () => {
    try {
      const res = await fetch('/api/quests');
      if (res.ok) {
        const data = await res.json();
        setQuests(data);
      }
    } catch (err) {
      console.error('Failed to fetch quests:', err);
    }
  }, []);

  useEffect(() => {
    refreshQuests();
  }, [refreshQuests]);

  // セッションの監視とプロフィール取得
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setIsLoggedIn(true);
        const user = session.user;
        
        try {
          // プロフィールとスキルレベルを取得
          const [{ data: profile }, { data: skills }] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('skill_levels').select('*').eq('user_id', user.id)
          ]);

          const baseName = profile?.display_name || user.email?.split('@')[0] || '冒険者';
          
          // スキルマッピング
          const mappedSkills: Skill[] = (skills || []).map(s => ({
            name: s.skill_name,
            level: s.level,
            color: '#f59e0b', // デフォルトカラー
          }));

          setMember({
            id: user.id,
            name: baseName,
            isVisitor: false,
            tags: profile?.tags || [],
            skills: mappedSkills,
            joinDate: profile?.created_at || new Date().toISOString()
          });

        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      } else {
        setIsLoggedIn(false);
        setMember(INITIAL_MEMBER);
      }
    };

    fetchUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserData();
      } else {
        setIsLoggedIn(false);
        setMember(INITIAL_MEMBER);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Load autoCheckInEnabled from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('guild_auto_checkin');
    if (saved === 'true') setAutoCheckInEnabled(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('guild_auto_checkin', autoCheckInEnabled.toString());
  }, [autoCheckInEnabled]);

  const addStamp = useCallback(() => {
    setStamps((prev) => {
      const nextEmpty = prev.findIndex((s) => !s);
      if (nextEmpty === -1) return prev;
      const next = [...prev];
      next[nextEmpty] = true;
      return next;
    });
    setGachaAvailable(true);
  }, []);

  const spinGacha = useCallback((): GachaResult | null => {
    if (!gachaAvailable) return null;
    setGachaAvailable(false);
    return { type: 'points', label: 'ギルドポイント×100', description: 'ボーナス！', rarity: 'common' };
  }, [gachaAvailable]);

  const updateProfile = useCallback(async (data: { name?: string; tags?: string[] }) => {
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: data.name,
          tags: data.tags,
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
      return { success: false, message: '拠点チェックインには ログインが必要です！' };
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
    
    return { success: true, message: '拠点到着！' };
  }, [isLoggedIn, member.name, addStamp, lastBaseCheckIn, monthlyCheckInCount, checkinMonth]);

  const createQuest = useCallback(async (questData: any) => {
    const res = await fetch('/api/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(questData),
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create quest');
    }
    
    // スキルレベルアップ処理 (単純上昇)
    const { data: { user } } = await supabase.auth.getUser();
    if (user && questData.skill_name) {
      // 現在のレベルを取得
      const { data: existingSkill } = await supabase
        .from('skill_levels')
        .select('level')
        .eq('user_id', user.id)
        .eq('skill_name', questData.skill_name)
        .single();
        
      const newLevel = existingSkill ? existingSkill.level + 1 : 1;
      
      await supabase
        .from('skill_levels')
        .upsert({
          user_id: user.id,
          skill_name: questData.skill_name,
          level: newLevel,
          updated_at: new Date().toISOString()
        });
        
      // Memberステートの更新
      setMember(prev => {
        const skills = [...prev.skills];
        const idx = skills.findIndex(s => s.name === questData.skill_name);
        if (idx >= 0) {
          skills[idx] = { ...skills[idx], level: newLevel };
        } else {
          skills.push({ name: questData.skill_name, level: newLevel, color: '#f59e0b' });
        }
        return { ...prev, skills };
      });
    }

    await refreshQuests();
  }, [supabase, refreshQuests]);

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
        spinGacha,
        createQuest,
        updateProfile,
        autoCheckInEnabled,
        setAutoCheckInEnabled,
        isAtBase,
        refreshQuests,
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

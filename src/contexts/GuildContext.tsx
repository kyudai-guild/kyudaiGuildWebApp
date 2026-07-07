'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';

/* ============================================================
   型定義
   ============================================================ */

export interface Member {
  id: string;
  name: string;
  email: string;
  isVisitor: boolean;
  role: 'user' | 'admin';
  tags: string[];
  joinDate: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  quest_type: string;
  max_applicants: number;
  reward: string;
  tags: string[];
  listing_duration_type: string;
  listing_duration_weeks: number | null;
  listing_end_date: string | null;
  effective_end_date: string | null;
  status: string;
  creator_id: string;
  creator?: { display_name: string };
  reviewer?: { display_name: string };
  reviewed_at: string | null;
  rejection_reason: string | null;
  application_count: number;
  created_at: string;
}

// CreateQuestModal が送信し POST /api/quests が受け取る形
export interface CreateQuestInput {
  title: string;
  description: string;
  quest_type: string;
  max_applicants: number;
  reward: string;
  tags: string[];
  listing_duration_type: 'weeks' | 'date';
  listing_duration_weeks: number | null;
  listing_end_date: string | null;
}

export interface GuildState {
  member: Member;
  isLoggedIn: boolean;
  quests: Quest[];
  createQuest: (questData: CreateQuestInput) => Promise<void>;
  updateProfile: (data: { name?: string; tags?: string[] }) => Promise<void>;
  refreshQuests: () => Promise<void>;
  isAdmin: boolean;
}

const INITIAL_MEMBER: Member = {
  id: 'guest',
  name: '冒険者',
  email: '',
  isVisitor: true,
  role: 'user',
  joinDate: new Date().toISOString(),
  tags: [],
};

/* ============================================================
   Context
   ============================================================ */
const GuildContext = createContext<GuildState | null>(null);

export function GuildProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  
  const [member, setMember] = useState<Member>(INITIAL_MEMBER);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [quests, setQuests] = useState<Quest[]>([]);

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
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          const baseName = profile?.display_name || user.email?.split('@')[0] || '冒険者';
          
          setMember({
            id: user.id,
            name: baseName,
            email: user.email || '',
            isVisitor: false,
            role: profile?.role || 'user',
            tags: profile?.tags || [],
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

  const createQuest = useCallback(async (questData: CreateQuestInput) => {
    const res = await fetch('/api/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(questData),
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create quest');
    }
    
    await refreshQuests();
  }, [refreshQuests]);

  const isAdmin = member.role === 'admin';

  return (
    <GuildContext.Provider
      value={{
        member,
        isLoggedIn,
        quests,
        createQuest,
        updateProfile,
        refreshQuests,
        isAdmin,
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

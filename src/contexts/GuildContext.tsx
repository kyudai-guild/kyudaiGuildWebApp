'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { readCache, writeCache, clearCache } from '@/lib/client-cache';
import type { QuestInput, QuestSession, ScheduleRow } from '@/lib/quest-form';
import { useRouter, usePathname } from 'next/navigation';

// 掲示板のキャッシュ。取得が終われば必ず上書きされるので、
// ここは「再取得が終わるまで何を出しておくか」の猶予でしかない。
const QUESTS_CACHE = 'quests';
const QUESTS_CACHE_MAX_AGE = 5 * 60 * 1000;

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
  description: string | null;   // 補足の自由記述（任意）
  quest_type: string;
  max_applicants: number;       // 定員（承認した人数で数える）
  tags: string[];
  listing_duration_type: string;
  listing_end_date: string | null;   // 申込の締切（この日まで掲示）
  effective_end_date: string | null;
  status: string;
  creator_id: string;
  creator?: { display_name: string };
  preferred_contact?: string | null; // 九大生からの問い合わせ先（掲示する）
  // どの団体としての依頼か。organization_name は申請時点のスナップショット
  // （団体が改名・無効化されても当時の名乗りが残る）。
  organization_id?: string | null;
  organization_name?: string | null;
  organization?: { id: string; name: string; is_active: boolean } | null;
  // クエスト依頼書の項目（v19）
  sessions?: QuestSession[];
  location?: string | null;
  participation_fee?: string | null;
  belongings?: string | null;
  schedule?: ScheduleRow[];
  requirements?: string | null;
  org_intro?: string | null;
  appeal?: string | null;
  photo_path?: string | null;
  reviewer?: { display_name: string };
  reviewed_at: string | null;
  rejection_reason: string | null;
  application_count: number;
  accepted_count?: number;
  created_at: string;
}

// CreateQuestModal が送信し POST /api/quests が受け取る形（検証は lib/quest-form.ts）
export type CreateQuestInput = QuestInput;

export interface GuildState {
  member: Member;
  isLoggedIn: boolean;
  quests: Quest[];
  createQuest: (questData: CreateQuestInput) => Promise<void>;
  updateProfile: (data: { name?: string; tags?: string[] }) => Promise<void>;
  refreshQuests: () => Promise<void>;
  isAdmin: boolean;
  markOnboarded: () => void;
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
  
  const pathname = usePathname();
  const [member, setMember] = useState<Member>(INITIAL_MEMBER);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [quests, setQuests] = useState<Quest[]>([]);
  // undefined=未取得 / null=初期設定が未完了 / string=完了日時
  const [onboardedAt, setOnboardedAt] = useState<string | null | undefined>(undefined);
  // キャッシュの鍵に混ぜるログインユーザーID。
  // refreshQuests の依存配列を増やさずに最新値を読みたいので ref で持つ。
  const memberIdRef = useRef<string | null>(null);

  // クエスト一覧取得。成功したらキャッシュも更新する。
  const refreshQuests = useCallback(async () => {
    try {
      const res = await fetch('/api/quests');
      if (res.ok) {
        const data = await res.json();
        setQuests(data);
        writeCache(QUESTS_CACHE, memberIdRef.current, data);
      }
    } catch (err) {
      console.error('Failed to fetch quests:', err);
    }
  }, []);

  // 掲示板はログイン限定。未ログイン時は取得せず、ログイン後に読み込む。
  //
  // キャッシュがあれば先に描いてから取りに行く（stale-while-revalidate）。
  // 再取得は毎回必ず走るので、表示は最終的に必ずサーバーと一致する。
  useEffect(() => {
    if (!isLoggedIn) {
      setQuests([]);
      return;
    }
    const cached = readCache<Quest[]>(QUESTS_CACHE, memberIdRef.current, QUESTS_CACHE_MAX_AGE);
    if (cached) setQuests(cached);
    refreshQuests();
  }, [isLoggedIn, refreshQuests]);

  // セッションの監視とプロフィール取得
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // 同じタブで別のアカウントに切り替わったら、前の人のキャッシュを必ず捨てる。
        // ログアウトを挟まずにログインし直すとサインアウトのイベントが起きないため、
        // ここで拾わないと前の人のデータが一瞬見えてしまう。
        if (memberIdRef.current && memberIdRef.current !== session.user.id) {
          clearCache();
        }
        // キャッシュの読み出しより先に確定させる（誰のキャッシュかを間違えないため）
        memberIdRef.current = session.user.id;
        setIsLoggedIn(true);
        const user = session.user;

        try {
          // select('*') にしないこと。v22 でメールアドレス・LINE関連の列は
          // ブラウザから読めなくなるため、'*' だと権限エラーでログイン処理ごと失敗する。
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, display_name, role, tags, created_at, onboarded_at')
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
          setOnboardedAt(profile?.onboarded_at ?? null);

        } catch (err) {
          console.error('Error fetching user data:', err);
        }
      } else {
        // 端末を共有していても前の人のデータが残らないよう、必ず捨てる
        memberIdRef.current = null;
        clearCache();
        setIsLoggedIn(false);
        setMember(INITIAL_MEMBER);
        setOnboardedAt(undefined);
      }
    };

    fetchUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserData();
      } else {
        memberIdRef.current = null;
        clearCache();
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

  // 初期設定が未完了のユーザーを /onboarding へ誘導
  useEffect(() => {
    if (isLoggedIn && onboardedAt === null && pathname !== '/onboarding' && !pathname.startsWith('/auth')) {
      router.push('/onboarding');
    }
  }, [isLoggedIn, onboardedAt, pathname, router]);

  const markOnboarded = useCallback(() => {
    setOnboardedAt(new Date().toISOString());
  }, []);

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
        markOnboarded,
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

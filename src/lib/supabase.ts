import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy';

// クライアントサイド用（公開）
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// サーバーサイド用（Service Role Key — APIルート内でのみ使う）
export function createAdminClient() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// 型定義
export interface QuestCompletion {
  id: string;
  member_discord_id: string;
  member_name: string;
  quest_title: string;
  quest_description: string | null;
  skill_name: string;
  evaluation_token: string;
  evaluated: boolean;
  completed_at: string;
  created_at: string;
  evaluations?: Evaluation[];
}

export interface Evaluation {
  id: string;
  quest_completion_id: string;
  rating_speed: number;
  rating_quality: number;
  rating_communication: number;
  would_request_again: boolean;
  comment: string | null;
  created_at: string;
}

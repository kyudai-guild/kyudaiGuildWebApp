import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * 団体長（profile_organizations.role = 'manager'）向け API の共通処理。
 *
 * 権限の最終的な判定は DB（v20 の RLS・is_org_manager）が行う。
 * ここでの確認は、分かりやすいエラーを返すためと、
 * サーバー権限（service_role）を使う前に必ず本人の権限を確かめるため。
 */

/** 団体長がメールで追加できる回数（1時間あたり）。総当たりでアドレスを探られないように */
export const ADD_ATTEMPTS_PER_HOUR = 20;

export type ManagerAuth =
  | { error: NextResponse }
  | { error?: undefined; supabase: SupabaseClient; userId: string; email: string | null };

export async function requireSignedIn(): Promise<ManagerAuth> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { supabase, userId: user.id, email: user.email ?? null };
}

/** 自分がその団体の団体長か（本人のセッションで確かめる） */
export async function isManagerOf(supabase: SupabaseClient, userId: string, orgId: string): Promise<boolean> {
  const { count } = await supabase
    .from('profile_organizations')
    .select('profile_id', { count: 'exact', head: true })
    .eq('profile_id', userId)
    .eq('organization_id', orgId)
    .eq('role', 'manager');
  return (count ?? 0) > 0;
}

/**
 * 団体長の操作を記録する（v20 の org_manager_actions）。
 * 書き込めるのは service_role だけなので、サーバー権限で書く。
 * 記録に失敗しても操作そのものは止めない（ログに残す）。
 */
export async function logManagerAction(entry: {
  actorId: string;
  organizationId: string;
  action: string;
  targetEmail?: string | null;
  targetProfileId?: string | null;
}) {
  const admin = createAdminClient();
  if (!admin) return;
  const { error } = await admin.from('org_manager_actions').insert({
    actor_id: entry.actorId,
    organization_id: entry.organizationId,
    action: entry.action,
    target_email: entry.targetEmail ?? null,
    target_profile_id: entry.targetProfileId ?? null,
  });
  if (error) console.error('OrgManager: failed to log action', error);
}

/** 直近1時間の「メールで追加」の試行回数（見つからなかった試行も含む） */
export async function recentAddAttempts(actorId: string): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('org_manager_actions')
    .select('id', { count: 'exact', head: true })
    .eq('actor_id', actorId)
    .like('action', 'add_member%')
    .gte('created_at', since);
  return count ?? 0;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function normalizeEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const e = v.trim().toLowerCase();
  return EMAIL_RE.test(e) && e.length <= 254 ? e : null;
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { MAX_OPEN_QUESTS_PER_ORG } from '@/lib/quest-form';

// その団体の未完了クエストの件数（依頼フォームに表示する）。
//
// 審査待ちのクエストは掲示した本人と運営にしか見えない（RLS）ので、
// 本人のセッションで数えると同じ団体の他のメンバーの審査待ちが漏れて、
// 上限の手前だと誤解させてしまう。サーバー権限で数える。
// 返すのは件数だけ（誰が何を出しているかは返さない）。
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    // その団体の所属者か運営だけが見られる
    const [{ count: memberCount }, { data: me }] = await Promise.all([
      supabase.from('profile_organizations')
        .select('profile_id', { count: 'exact', head: true })
        .eq('profile_id', user.id).eq('organization_id', id),
      supabase.from('profiles').select('role').eq('id', user.id).single(),
    ]);
    if ((memberCount ?? 0) === 0 && me?.role !== 'admin') {
      return NextResponse.json({ error: 'この団体に所属していません。' }, { status: 403 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ pending: 0, approved: 0, limit: MAX_OPEN_QUESTS_PER_ORG, available: false });
    }

    const [pending, approved] = await Promise.all([
      admin.from('quests').select('id', { count: 'exact', head: true }).eq('organization_id', id).eq('status', 'pending'),
      admin.from('quests').select('id', { count: 'exact', head: true }).eq('organization_id', id).eq('status', 'approved'),
    ]);

    return NextResponse.json({
      pending: pending.count ?? 0,
      approved: approved.count ?? 0,
      limit: MAX_OPEN_QUESTS_PER_ORG,
      available: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

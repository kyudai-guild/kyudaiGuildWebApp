import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

const PAGE_SIZE = 50;

// 団体の付与対象を探すためのユーザー検索（運営のみ）
//   ?q=... で表示名・メールアドレスの部分一致。空なら新しい順に先頭ページ。
// ユーザー数が増えても重くならないよう、必ず件数を絞って返す。
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: me } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (me?.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 });
    }

    const q = (new URL(request.url).searchParams.get('q') ?? '').trim();

    let query = supabase
      .from('profiles')
      .select('id, display_name, email, role, created_at')
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (q) {
      // カンマは or フィルタの区切り文字なので、含まれていると構文が壊れる
      const safe = q.replace(/[,()]/g, ' ').trim();
      if (safe) query = query.or(`display_name.ilike.%${safe}%,email.ilike.%${safe}%`);
    }

    const { data: users, error } = await query;
    if (error) {
      console.error('Error searching users:', error);
      return NextResponse.json({ error: 'ユーザーの検索に失敗しました。' }, { status: 500 });
    }

    // 返した分のユーザーについてだけ所属を引く（全件取得はしない）
    const ids = (users ?? []).map(u => u.id);
    let orgsByUser: Record<string, { id: string; name: string }[]> = {};
    if (ids.length > 0) {
      const { data: links } = await supabase
        .from('profile_organizations')
        .select('profile_id, organization:organization_id (id, name)')
        .in('profile_id', ids);
      orgsByUser = (links ?? []).reduce((acc: Record<string, { id: string; name: string }[]>, row: any) => {
        if (!row.organization) return acc;
        (acc[row.profile_id] ||= []).push({ id: row.organization.id, name: row.organization.name });
        return acc;
      }, {});
    }

    return NextResponse.json({
      users: (users ?? []).map(u => ({ ...u, organizations: orgsByUser[u.id] ?? [] })),
      truncated: (users ?? []).length === PAGE_SIZE,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

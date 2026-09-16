import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// 団体マスタ
//   GET : 有効な団体一覧 + 自分の所属 + 自分の申請状況
//         （管理者は論理削除済みの団体と所属人数も受け取る）
//   POST: 団体を追加（運営のみ）
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isAdmin = profile?.role === 'admin';

    // 管理者は無効化済みも含めて全件見る（再有効化できるようにするため）
    let orgQuery = supabase
      .from('organizations')
      .select('id, name, description, sort_order, is_active')
      .order('sort_order')
      .order('name');
    if (!isAdmin) orgQuery = orgQuery.eq('is_active', true);

    const [orgs, mine, myRequests] = await Promise.all([
      orgQuery,
      supabase.from('profile_organizations').select('organization_id').eq('profile_id', user.id),
      supabase
        .from('organization_requests')
        .select('id, organization_id, requested_name, message, status, review_note, created_at, reviewed_at')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (orgs.error || mine.error || myRequests.error) {
      console.error('Error fetching organizations:', orgs.error || mine.error || myRequests.error);
      return NextResponse.json({ error: '団体情報の取得に失敗しました。' }, { status: 500 });
    }

    // 所属人数は管理画面でのみ必要。団体数・所属数とも小さいのでまとめて取って数える。
    let memberCounts: Record<string, number> = {};
    if (isAdmin) {
      const { data: all } = await supabase.from('profile_organizations').select('organization_id');
      memberCounts = (all ?? []).reduce((acc: Record<string, number>, row: any) => {
        acc[row.organization_id] = (acc[row.organization_id] ?? 0) + 1;
        return acc;
      }, {});
    }

    return NextResponse.json({
      organizations: (orgs.data ?? []).map(o => ({ ...o, member_count: memberCounts[o.id] ?? 0 })),
      mine: (mine.data ?? []).map((r: any) => r.organization_id),
      my_requests: myRequests.data ?? [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 });
    }

    const body = await request.json();
    const name = (body.name ?? '').trim();
    const description = (body.description ?? '').trim() || null;
    const sortOrder = Number.isFinite(body.sort_order) ? Number(body.sort_order) : 0;

    if (!name) {
      return NextResponse.json({ error: '団体名は必須です。' }, { status: 400 });
    }

    const { data: org, error } = await supabase
      .from('organizations')
      .insert({ name, description, sort_order: sortOrder })
      .select('id, name, description, sort_order, is_active')
      .single();

    if (error) {
      // name は unique 制約つき
      if (error.code === '23505') {
        return NextResponse.json({ error: `「${name}」はすでに登録されています。` }, { status: 409 });
      }
      console.error('Error creating organization:', error);
      return NextResponse.json({ error: '団体の追加に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json({ ...org, member_count: 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

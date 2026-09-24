import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

// 団体の所属メンバー管理（すべて運営のみ）
//   GET   : この団体に所属しているユーザー一覧
//   POST  : ユーザーに所属を付与     body { profile_id }
//   DELETE: ユーザーの所属を剥奪     ?profile_id=...
//
// ユーザーが自分で所属を付けられないことが重要なので、RLS 側でも
// profile_organizations の insert/delete は is_guild_admin() のみに絞っている。

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 }) };
  }
  return { supabase, user };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { id } = await params;

    // メール列は一般の権限では読めない（v22）。運営確認済みなのでサーバー権限で読む
    const { data, error } = await (createAdminClient() ?? auth.supabase!)
      .from('profile_organizations')
      .select('created_at, role, profile:profile_id (id, display_name, email)')
      .eq('organization_id', id)
      .order('created_at');

    if (error) {
      console.error('Error fetching organization members:', error);
      return NextResponse.json({ error: '所属メンバーの取得に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json((data ?? []).map((row: any) => ({
      id: row.profile?.id,
      display_name: row.profile?.display_name ?? null,
      email: row.profile?.email ?? null,
      role: row.role ?? 'member',
      created_at: row.created_at,
    })));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { id } = await params;

    const body = await request.json();
    const profileId = body.profile_id;
    if (!profileId) {
      return NextResponse.json({ error: '対象ユーザーが指定されていません。' }, { status: 400 });
    }

    const { error } = await auth.supabase!
      .from('profile_organizations')
      .upsert(
        { profile_id: profileId, organization_id: id, granted_by: auth.user!.id },
        { onConflict: 'profile_id,organization_id' }
      );

    if (error) {
      console.error('Error granting organization:', error);
      return NextResponse.json({ error: '所属の付与に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 団体長の指名・解除（運営のみ）   body { profile_id, role: 'manager' | 'member' }
// 団体長を作れるのは運営だけ。団体長が団体長を増やせると権限が際限なく広がるため（DB側でも運営のみ）。
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { id } = await params;

    const body = await request.json();
    const profileId = body.profile_id;
    const role = body.role;
    if (!profileId || (role !== 'manager' && role !== 'member')) {
      return NextResponse.json({ error: '指定が正しくありません。' }, { status: 400 });
    }

    const { data, error } = await auth.supabase!
      .from('profile_organizations')
      .update({ role })
      .eq('organization_id', id)
      .eq('profile_id', profileId)
      .select('profile_id');
    if (error) {
      console.error('Error updating member role:', error);
      return NextResponse.json({ error: '役割の変更に失敗しました。v20 が未実行かもしれません。' }, { status: 500 });
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'この団体のメンバーではありません。' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { id } = await params;

    const profileId = new URL(request.url).searchParams.get('profile_id');
    if (!profileId) {
      return NextResponse.json({ error: '対象ユーザーが指定されていません。' }, { status: 400 });
    }

    const { error } = await auth.supabase!
      .from('profile_organizations')
      .delete()
      .eq('organization_id', id)
      .eq('profile_id', profileId);

    if (error) {
      console.error('Error revoking organization:', error);
      return NextResponse.json({ error: '所属の解除に失敗しました。' }, { status: 500 });
    }

    // 過去のクエストの organization_id / organization_name はあえて残す。
    // 「当時どの団体として申請したか」は審査の記録なので消さない。
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

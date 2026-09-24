import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { requireSignedIn, isManagerOf } from '@/lib/org-manager';

// 団体長の画面用
//   GET  : 自分が団体長を務める団体と、そのメンバー一覧
//   PATCH: 団体情報（団体の紹介・問い合わせ先）の更新   body { organization_id, description, public_contact }
//
// メンバー一覧に出すのは**メールアドレスと役割だけ**で、表示名は出さない。
// 「メールで追加 → 一覧で表示名を見る」を繰り返せば、任意のアドレスの持ち主の
// 表示名を割り出せてしまうため（2026-09 会議の指示）。
export async function GET() {
  try {
    const auth = await requireSignedIn();
    if (auth.error) return auth.error;

    const { data: managed, error } = await auth.supabase
      .from('profile_organizations')
      .select('organization:organization_id (id, name, description, public_contact, is_active)')
      .eq('profile_id', auth.userId)
      .eq('role', 'manager');

    if (error) {
      console.error('OrgManager: failed to load managed orgs', error);
      return NextResponse.json({ error: '団体情報の取得に失敗しました。' }, { status: 500 });
    }

    const orgs = (managed ?? []).map((r: any) => r.organization).filter(Boolean);
    if (orgs.length === 0) return NextResponse.json({ organizations: [] });

    // メールアドレスは一般の権限では読めない（v22）。団体長であることを上で
    // 確かめた団体に限り、サーバー権限でそのメンバーのメールだけを読む。
    const admin = createAdminClient();
    const db = admin ?? auth.supabase;
    const { data: members } = await db
      .from('profile_organizations')
      .select('organization_id, profile_id, role, created_at, profile:profile_id (email)')
      .in('organization_id', orgs.map((o: any) => o.id))
      .order('created_at');

    const byOrg = new Map<string, any[]>();
    for (const m of members ?? []) {
      const list = byOrg.get((m as any).organization_id) ?? [];
      list.push({
        profile_id: (m as any).profile_id,
        email: (m as any).profile?.email ?? null,
        role: (m as any).role,
        is_me: (m as any).profile_id === auth.userId,
        created_at: (m as any).created_at,
      });
      byOrg.set((m as any).organization_id, list);
    }

    return NextResponse.json({
      organizations: orgs.map((o: any) => ({ ...o, members: byOrg.get(o.id) ?? [] })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireSignedIn();
    if (auth.error) return auth.error;

    const body = await request.json();
    const orgId = typeof body.organization_id === 'string' ? body.organization_id : '';
    if (!orgId) return NextResponse.json({ error: '団体が指定されていません。' }, { status: 400 });

    if (!(await isManagerOf(auth.supabase, auth.userId, orgId))) {
      return NextResponse.json({ error: 'この団体の団体長ではありません。' }, { status: 403 });
    }

    // 団体長が変えられるのは紹介と問い合わせ先だけ（団体名などはDB側のトリガーでも拒否される）
    const patch: Record<string, string | null> = {};
    if (typeof body.description === 'string') patch.description = body.description.trim().slice(0, 500) || null;
    if (typeof body.public_contact === 'string') patch.public_contact = body.public_contact.trim().slice(0, 300) || null;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: '変更内容がありません。' }, { status: 400 });
    }

    const { error } = await auth.supabase.from('organizations').update(patch).eq('id', orgId);
    if (error) {
      console.error('OrgManager: failed to update organization', error);
      return NextResponse.json({ error: '団体情報の保存に失敗しました。' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

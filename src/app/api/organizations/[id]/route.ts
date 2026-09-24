import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// 団体の編集（運営のみ）
//   名称・説明・並び順の変更と、is_active による有効/無効の切り替え。
//   物理削除はしない。無効化しても既存の所属とクエストの参照は残る。
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();

    const patch: Record<string, any> = {};
    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ error: '団体名は必須です。' }, { status: 400 });
      patch.name = name;
    }
    if (typeof body.description === 'string') patch.description = body.description.trim().slice(0, 500) || null;
    if (typeof body.public_contact === 'string') patch.public_contact = body.public_contact.trim().slice(0, 300) || null;
    if (typeof body.sort_order === 'number' && Number.isFinite(body.sort_order)) patch.sort_order = body.sort_order;
    if (typeof body.is_active === 'boolean') patch.is_active = body.is_active;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: '変更内容がありません。' }, { status: 400 });
    }

    const { data: org, error } = await supabase
      .from('organizations')
      .update(patch)
      .eq('id', id)
      .select('id, name, description, public_contact, sort_order, is_active')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `「${patch.name}」はすでに登録されています。` }, { status: 409 });
      }
      console.error('Error updating organization:', error);
      return NextResponse.json({ error: '団体の更新に失敗しました。' }, { status: 500 });
    }
    if (!org) {
      return NextResponse.json({ error: '団体が見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(org);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

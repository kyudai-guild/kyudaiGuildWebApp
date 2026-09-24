import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { validateEventInput } from '@/lib/event-form';

// イベントの編集・削除（運営のみ）
//   PATCH : 内容を更新（登録と同じ項目・同じ検証）
//   DELETE: 削除（間違えて登録したものを消す用途。画面側で確認ダイアログを出す）
//
// これまでは作成しかできず、削除のポリシーもDBに無かった（v21 で追加）。

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: '管理者のみ操作できます。' }, { status: 403 }) };
  }
  return { supabase };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { id } = await params;

    const checked = validateEventInput(await request.json());
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

    const { data, error } = await auth.supabase!
      .from('events')
      .update(checked.value)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) {
      console.error('Error updating event:', error);
      return NextResponse.json({ error: 'イベントの更新に失敗しました。' }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: 'イベントが見つかりません。' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const { id } = await params;

    const { data, error } = await auth.supabase!
      .from('events')
      .delete()
      .eq('id', id)
      .select('id');
    if (error) {
      console.error('Error deleting event:', error);
      return NextResponse.json({ error: 'イベントの削除に失敗しました。' }, { status: 500 });
    }
    // 削除のポリシーが無い（v21 未実行）と、エラーにならず0件になる
    if (!data || data.length === 0) {
      return NextResponse.json({ error: '削除できませんでした。v21 のマイグレーションが未実行かもしれません。' }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { isMemberOf } from '@/lib/org-manager';

// 完了報告。掲示中(approved)の依頼を completed にする。
// できるのは、掲示した本人と、掲示した団体の所属者（2026-09: クエストは団体単位で運用する）。
// 団体の所属者はクエストを本人の権限では更新できないので、権限を確かめたうえでサーバー権限で更新する。
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'サーバーの設定が不足しています。' }, { status: 500 });
    }

    const { data: quest } = await admin
      .from('quests')
      .select('id, creator_id, status, organization_id')
      .eq('id', id)
      .maybeSingle();
    if (!quest) {
      return NextResponse.json({ error: 'クエストが見つかりません。' }, { status: 404 });
    }
    const allowed = quest.creator_id === user.id || await isMemberOf(supabase, user.id, quest.organization_id);
    if (!allowed) {
      return NextResponse.json({ error: '掲示した団体のメンバーだけが完了報告できます。' }, { status: 403 });
    }
    if (quest.status !== 'approved') {
      return NextResponse.json({ error: '掲示中の依頼のみ完了報告できます。' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await admin
      .from('quests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'approved')
      .select('id, status, completed_at')
      .maybeSingle();
    if (updateError) {
      console.error('Error completing quest:', updateError);
      return NextResponse.json({ error: '完了報告に失敗しました。' }, { status: 500 });
    }
    if (!updated) {
      return NextResponse.json({ error: 'このクエストはすでに完了しています。' }, { status: 400 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

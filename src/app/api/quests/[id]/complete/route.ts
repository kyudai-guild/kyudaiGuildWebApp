import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// 完了報告（依頼者のみ）。掲示中(approved)の依頼を completed にする。
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

    const { data: quest, error: questError } = await supabase
      .from('quests')
      .select('id, creator_id, status')
      .eq('id', id)
      .single();
    if (questError || !quest) {
      return NextResponse.json({ error: 'クエストが見つかりません。' }, { status: 404 });
    }
    if (quest.creator_id !== user.id) {
      return NextResponse.json({ error: '依頼者のみ完了報告できます。' }, { status: 403 });
    }
    if (quest.status !== 'approved') {
      return NextResponse.json({ error: '掲示中の依頼のみ完了報告できます。' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('quests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (updateError) {
      console.error('Error completing quest:', updateError);
      return NextResponse.json({ error: '完了報告に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

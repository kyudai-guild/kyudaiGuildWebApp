import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: questId } = await params;
    const body = await request.json();
    const { message } = body;

    // クエストの存在確認と承認済みチェック
    const { data: quest, error: fetchError } = await supabase
      .from('quests')
      .select('*, applications:quest_applications (id)')
      .eq('id', questId)
      .single();

    if (fetchError || !quest) {
      return NextResponse.json({ error: 'クエストが見つかりません。' }, { status: 404 });
    }

    if (quest.status !== 'approved') {
      return NextResponse.json({ error: 'このクエストは現在応募を受け付けていません。' }, { status: 400 });
    }

    // 自分のクエストには応募不可
    if (quest.creator_id === user.id) {
      return NextResponse.json({ error: '自分が作成したクエストには応募できません。' }, { status: 400 });
    }

    // 定員チェック
    const currentApplicants = quest.applications?.length || 0;
    if (currentApplicants >= quest.max_applicants) {
      return NextResponse.json({ error: '定員に達しているため応募できません。' }, { status: 400 });
    }

    // 掲示期間チェック
    if (quest.effective_end_date) {
      const endDate = new Date(quest.effective_end_date);
      if (new Date() > endDate) {
        return NextResponse.json({ error: '掲示期間が終了しています。' }, { status: 400 });
      }
    }

    // 重複応募チェック
    const { data: existing } = await supabase
      .from('quest_applications')
      .select('id')
      .eq('quest_id', questId)
      .eq('applicant_id', user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'すでに応募済みです。' }, { status: 400 });
    }

    const { data: application, error: insertError } = await supabase
      .from('quest_applications')
      .insert({
        quest_id: questId,
        applicant_id: user.id,
        message: message || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error applying to quest:', insertError);
      return NextResponse.json({ error: '応募に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json(application);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

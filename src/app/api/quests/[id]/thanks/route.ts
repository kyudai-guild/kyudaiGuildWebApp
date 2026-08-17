import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// 感謝の言葉を送る。完了済みクエストの当事者（依頼者⇔承認された応募者）のみ。
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

    const { message, recipient_id } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: 'メッセージを入力してください。' }, { status: 400 });
    }

    const { data: quest, error: questError } = await supabase
      .from('quests')
      .select('id, creator_id, status')
      .eq('id', id)
      .single();
    if (questError || !quest) {
      return NextResponse.json({ error: 'クエストが見つかりません。' }, { status: 404 });
    }
    if (quest.status !== 'completed') {
      return NextResponse.json({ error: '完了報告されたクエストのみ感謝を送れます。' }, { status: 400 });
    }

    // 承認済み応募者の一覧（当事者判定に使用）
    const { data: accepted } = await supabase
      .from('quest_applications')
      .select('applicant_id')
      .eq('quest_id', id)
      .eq('status', 'accepted');
    const acceptedIds = (accepted ?? []).map(a => a.applicant_id);

    let recipient: string;
    if (user.id === quest.creator_id) {
      // 依頼者 → 承認済み応募者へ
      if (!recipient_id || !acceptedIds.includes(recipient_id)) {
        return NextResponse.json({ error: '送り先が正しくありません。' }, { status: 400 });
      }
      recipient = recipient_id;
    } else if (acceptedIds.includes(user.id)) {
      // 応募者 → 依頼者へ
      recipient = quest.creator_id;
    } else {
      return NextResponse.json({ error: 'このクエストの当事者のみ感謝を送れます。' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('quest_thanks')
      .insert({ quest_id: id, sender_id: user.id, recipient_id: recipient, message: message.trim() })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'このクエストではすでに感謝を送っています。' }, { status: 400 });
      }
      console.error('Error inserting thanks:', error);
      return NextResponse.json({ error: '感謝の送信に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { notifyMatchingUsers } from '@/lib/quest-notify';

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

    // 管理者チェック
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 });
    }

    const { id: questId } = await params;
    const body = await request.json();
    const { action, rejection_reason } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: '不正なアクションです。' }, { status: 400 });
    }

    if (action === 'reject' && !rejection_reason) {
      return NextResponse.json({ error: 'リジェクト理由は必須です。' }, { status: 400 });
    }

    // クエストの存在確認
    const { data: quest, error: fetchError } = await supabase
      .from('quests')
      .select('*')
      .eq('id', questId)
      .single();

    if (fetchError || !quest) {
      return NextResponse.json({ error: 'クエストが見つかりません。' }, { status: 404 });
    }

    const now = new Date();
    let effectiveEndDate: string | null = null;

    if (action === 'approve') {
      // 掲示終了日の計算
      if (quest.listing_duration_type === 'weeks' && quest.listing_duration_weeks) {
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + quest.listing_duration_weeks * 7);
        effectiveEndDate = endDate.toISOString().split('T')[0];
      } else if (quest.listing_duration_type === 'date' && quest.listing_end_date) {
        effectiveEndDate = quest.listing_end_date;
      }
    }

    const updateData: Record<string, any> = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_by: user.id,
      reviewed_at: now.toISOString(),
    };

    if (action === 'reject') {
      updateData.rejection_reason = rejection_reason;
    }

    if (action === 'approve' && effectiveEndDate) {
      updateData.effective_end_date = effectiveEndDate;
    }

    const { data: updated, error: updateError } = await supabase
      .from('quests')
      .update(updateData)
      .eq('id', questId)
      .select()
      .single();

    if (updateError) {
      console.error('Error reviewing quest:', updateError);
      return NextResponse.json({ error: '審査処理に失敗しました。' }, { status: 500 });
    }

    // 承認したら、興味分野が一致する連携済みユーザーへLINE通知
    // （通知の失敗で審査自体を巻き戻さない）
    let notified = 0;
    if (action === 'approve') {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
        const result = await notifyMatchingUsers(updated, siteUrl);
        notified = result.sent;
      } catch (notifyError) {
        console.error('Error sending LINE notifications:', notifyError);
      }
    }

    return NextResponse.json({ ...updated, notified });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

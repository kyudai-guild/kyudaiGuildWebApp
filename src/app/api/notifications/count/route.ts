import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// ヘッダーのバッジ用: 要対応件数（自分の依頼に来ている未処理の応募数）
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { count, error } = await supabase
      .from('quest_applications')
      .select('id, quest:quest_id!inner(creator_id)', { count: 'exact', head: true })
      .eq('quest.creator_id', user.id)
      .eq('status', 'pending');
    if (error) {
      console.error('Error counting notifications:', error);
      return NextResponse.json({ error: '通知件数の取得に失敗しました。' }, { status: 500 });
    }

    const pendingApplications = count ?? 0;
    return NextResponse.json({
      pending_applications: pendingApplications,
      total: pendingApplications,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

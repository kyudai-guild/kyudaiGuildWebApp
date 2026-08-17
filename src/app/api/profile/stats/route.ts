import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// プロフィール画面の統計。一覧を取得せず count クエリのみで返す（データ増加に耐える）
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [posted, postedCompleted, acceptedCompleted, thanksReceived, profile] = await Promise.all([
      supabase.from('quests').select('id', { count: 'exact', head: true })
        .eq('creator_id', user.id),
      supabase.from('quests').select('id', { count: 'exact', head: true })
        .eq('creator_id', user.id).eq('status', 'completed'),
      supabase.from('quest_applications').select('id, quest:quest_id!inner(status)', { count: 'exact', head: true })
        .eq('applicant_id', user.id).eq('status', 'accepted').eq('quest.status', 'completed'),
      supabase.from('quest_thanks').select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id),
      supabase.from('profiles').select('created_at').eq('id', user.id).single(),
    ]);

    return NextResponse.json({
      posted_total: posted.count ?? 0,
      posted_completed: postedCompleted.count ?? 0,
      accepted_completed: acceptedCompleted.count ?? 0,
      thanks_received: thanksReceived.count ?? 0,
      member_since: profile.data?.created_at ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

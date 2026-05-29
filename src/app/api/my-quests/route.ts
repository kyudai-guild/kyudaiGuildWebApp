import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 自分が作成したクエストを取得（応募者情報含む）
    const { data: quests, error } = await supabase
      .from('quests')
      .select(`
        *,
        reviewer:reviewed_by (display_name),
        applications:quest_applications (
          id,
          message,
          status,
          applied_at,
          applicant:applicant_id (display_name, email)
        )
      `)
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching my quests:', error);
      return NextResponse.json({ error: 'マイクエストの取得に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json(quests || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

const PAGE_SIZE = 10;

// クエスト履歴（ページネーション付き。role=posted|applied, offset=数値）
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') === 'applied' ? 'applied' : 'posted';
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

    if (role === 'posted') {
      const { data, error } = await supabase
        .from('quests')
        .select('id, title, quest_type, status, reward, created_at, completed_at')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE);
      if (error) throw error;
      const hasMore = (data ?? []).length > PAGE_SIZE;
      return NextResponse.json({ items: (data ?? []).slice(0, PAGE_SIZE), hasMore });
    }

    const { data, error } = await supabase
      .from('quest_applications')
      .select(`
        id, status, applied_at,
        quest:quest_id (
          id, title, quest_type, status, reward, completed_at,
          contact_email_public, preferred_contact,
          creator:creator_id (display_name, email)
        )
      `)
      .eq('applicant_id', user.id)
      .order('applied_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE);
    if (error) throw error;
    const hasMore = (data ?? []).length > PAGE_SIZE;
    return NextResponse.json({ items: (data ?? []).slice(0, PAGE_SIZE), hasMore });
  } catch (err: any) {
    console.error('Error fetching history:', err);
    return NextResponse.json({ error: '履歴の取得に失敗しました。' }, { status: 500 });
  }
}

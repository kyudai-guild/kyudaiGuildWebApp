import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

const PAGE_SIZE = 20;

// 自分がもらった/おくった感謝の一覧（dir=received|sent, offset）
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dir = searchParams.get('dir') === 'sent' ? 'sent' : 'received';
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0);

    const { data, error } = await supabase
      .from('quest_thanks')
      .select(`
        id, message, created_at,
        quest:quest_id (title),
        sender:sender_id (display_name),
        recipient:recipient_id (display_name)
      `)
      .eq(dir === 'received' ? 'recipient_id' : 'sender_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE);
    if (error) {
      console.error('Error fetching thanks:', error);
      return NextResponse.json({ error: '感謝の取得に失敗しました。' }, { status: 500 });
    }

    const hasMore = (data ?? []).length > PAGE_SIZE;
    return NextResponse.json({ items: (data ?? []).slice(0, PAGE_SIZE), hasMore });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

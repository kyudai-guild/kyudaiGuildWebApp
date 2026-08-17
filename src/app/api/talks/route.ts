import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// 自分が参加しているトークルームの一覧（RLSでメンバーのルームのみ返る）
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: memberships, error: memberError } = await supabase
      .from('talk_members')
      .select('room_id')
      .eq('profile_id', user.id);
    if (memberError) throw memberError;

    const roomIds = (memberships ?? []).map(m => m.room_id);
    if (roomIds.length === 0) return NextResponse.json([]);

    const { data: rooms, error: roomError } = await supabase
      .from('talk_rooms')
      .select(`
        id, created_at,
        quest:quest_id (id, title, quest_type, status),
        members:talk_members (profile_id, profile:profile_id (display_name))
      `)
      .in('id', roomIds)
      .order('created_at', { ascending: false });
    if (roomError) throw roomError;

    // 各ルームの最新メッセージ（一覧プレビュー用）
    const { data: lastMessages } = await supabase
      .from('talk_messages')
      .select('room_id, body, created_at')
      .in('room_id', roomIds)
      .order('created_at', { ascending: false });
    const latestByRoom = new Map<string, { body: string; created_at: string }>();
    for (const m of lastMessages ?? []) {
      if (!latestByRoom.has(m.room_id)) latestByRoom.set(m.room_id, m);
    }

    return NextResponse.json((rooms ?? []).map(r => ({
      ...r,
      last_message: latestByRoom.get(r.id) ?? null,
    })));
  } catch (err: any) {
    console.error('Error fetching talk rooms:', err);
    return NextResponse.json({ error: 'トークルームの取得に失敗しました。' }, { status: 500 });
  }
}

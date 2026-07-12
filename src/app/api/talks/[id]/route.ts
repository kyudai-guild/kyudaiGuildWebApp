import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// ルームの情報とメッセージ取得。?after=<ISO日時> を渡すと差分のみ（ポーリング用）
export async function GET(
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

    const { searchParams } = new URL(request.url);
    const after = searchParams.get('after');

    let query = supabase
      .from('talk_messages')
      .select('id, body, created_at, sender_id, sender:sender_id (display_name)')
      .eq('room_id', id)
      .order('created_at', { ascending: true })
      .limit(200);
    if (after) query = query.gt('created_at', after);

    const { data: messages, error: msgError } = await query;
    if (msgError) throw msgError;

    // 差分取得時はメッセージのみ返す
    if (after) return NextResponse.json({ messages: messages ?? [] });

    const { data: room, error: roomError } = await supabase
      .from('talk_rooms')
      .select(`
        id,
        quest:quest_id (id, title, quest_type, status, creator_id),
        members:talk_members (profile_id, profile:profile_id (display_name))
      `)
      .eq('id', id)
      .single();
    if (roomError || !room) {
      return NextResponse.json({ error: 'トークルームが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json({ room, messages: messages ?? [] });
  } catch (err: any) {
    console.error('Error fetching talk room:', err);
    return NextResponse.json({ error: 'トークの取得に失敗しました。' }, { status: 500 });
  }
}

// メッセージ送信（RLSがメンバー以外の書き込みを拒否する）
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

    const { body } = await request.json();
    if (!body?.trim()) {
      return NextResponse.json({ error: 'メッセージを入力してください。' }, { status: 400 });
    }
    if (body.length > 2000) {
      return NextResponse.json({ error: 'メッセージは2000文字以内で入力してください。' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('talk_messages')
      .insert({ room_id: id, sender_id: user.id, body: body.trim() })
      .select('id, body, created_at, sender_id, sender:sender_id (display_name)')
      .single();
    if (error) {
      console.error('Error sending message:', error);
      return NextResponse.json({ error: 'メッセージの送信に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

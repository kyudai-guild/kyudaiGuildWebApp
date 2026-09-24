import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

// トークルームの一覧
//   - 自分が参加しているルーム
//   - 自分が団体長を務める団体のクエストのルーム（参加していなくても人員を管理できるように）
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

    const memberRoomIds = new Set((memberships ?? []).map(m => m.room_id));

    // 団体長として管理できるルーム。完了したクエストは本人のセッションでは見えない
    // 場合があるので、団体長であることを確かめたうえでサーバー権限で探す。
    const managedRoomIds = new Set<string>();
    const { data: managed } = await supabase
      .from('profile_organizations')
      .select('organization_id')
      .eq('profile_id', user.id)
      .eq('role', 'manager');
    const managedOrgIds = (managed ?? []).map(m => m.organization_id);
    const admin = createAdminClient();
    if (admin && managedOrgIds.length > 0) {
      const { data: orgQuests } = await admin.from('quests').select('id').in('organization_id', managedOrgIds);
      const questIds = (orgQuests ?? []).map(q => q.id);
      if (questIds.length > 0) {
        const { data: rooms } = await admin.from('talk_rooms').select('id').in('quest_id', questIds);
        for (const r of rooms ?? []) managedRoomIds.add(r.id);
      }
    }

    const roomIds = [...new Set([...memberRoomIds, ...managedRoomIds])];
    if (roomIds.length === 0) return NextResponse.json([]);

    // 団体長として見るだけのルームも含むので、サーバー権限で読む（対象IDは上で絞り込み済み）
    const reader = admin ?? supabase;
    const { data: rooms, error: roomError } = await reader
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
    // 最新メッセージのプレビューは、自分が参加しているルームだけ（参加していないルームの中身は見せない）
    const { data: lastMessages } = await supabase
      .from('talk_messages')
      .select('room_id, body, created_at')
      .in('room_id', [...memberRoomIds])
      .order('created_at', { ascending: false });
    const latestByRoom = new Map<string, { body: string; created_at: string }>();
    for (const m of lastMessages ?? []) {
      if (!latestByRoom.has(m.room_id)) latestByRoom.set(m.room_id, m);
    }

    return NextResponse.json((rooms ?? []).map(r => ({
      ...r,
      last_message: latestByRoom.get(r.id) ?? null,
      // 団体長として管理できるが、まだ自分は参加していないルーム
      managed_only: !memberRoomIds.has(r.id),
    })));
  } catch (err: any) {
    console.error('Error fetching talk rooms:', err);
    return NextResponse.json({ error: 'トークルームの取得に失敗しました。' }, { status: 500 });
  }
}

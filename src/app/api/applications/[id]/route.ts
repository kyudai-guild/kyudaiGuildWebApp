import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// 応募の承認（マッチング成立）/ 見送り。クエストの依頼者のみ。
export async function PATCH(
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

    const { action } = await request.json();
    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json({ error: '不正な操作です。' }, { status: 400 });
    }

    const { data: application, error: appError } = await supabase
      .from('quest_applications')
      .select('id, status, applicant_id, quest:quest_id (id, creator_id, status, max_applicants)')
      .eq('id', id)
      .single();
    if (appError || !application) {
      return NextResponse.json({ error: '応募が見つかりません。' }, { status: 404 });
    }

    const quest = application.quest as unknown as { id: string; creator_id: string; status: string; max_applicants: number };
    if (quest.creator_id !== user.id) {
      return NextResponse.json({ error: '依頼者のみ操作できます。' }, { status: 403 });
    }
    if (application.status !== 'pending') {
      return NextResponse.json({ error: 'この応募はすでに処理済みです。' }, { status: 400 });
    }

    if (action === 'accept') {
      const { count } = await supabase
        .from('quest_applications')
        .select('id', { count: 'exact', head: true })
        .eq('quest_id', quest.id)
        .eq('status', 'accepted');
      if ((count ?? 0) >= quest.max_applicants) {
        return NextResponse.json({ error: '募集人数に達しています。' }, { status: 400 });
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('quest_applications')
      .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
      .eq('id', id)
      .select('id, status, applicant_id, applicant:applicant_id (display_name, email)')
      .single();
    if (updateError) {
      console.error('Error updating application:', updateError);
      return NextResponse.json({ error: '応募の更新に失敗しました。' }, { status: 500 });
    }

    // マッチング成立 → トークルームを用意し、依頼者と応募者を参加させる
    let talkRoomWarning: string | null = null;
    if (action === 'accept') {
      try {
        let { data: room } = await supabase
          .from('talk_rooms')
          .select('id')
          .eq('quest_id', quest.id)
          .maybeSingle();
        if (!room) {
          const { data: created, error: roomError } = await supabase
            .from('talk_rooms')
            .insert({ quest_id: quest.id })
            .select('id')
            .single();
          if (roomError) throw roomError;
          room = created;
        }
        if (room) {
          const { error: memberError } = await supabase
            .from('talk_members')
            .upsert(
              [
                { room_id: room.id, profile_id: user.id },
                { room_id: room.id, profile_id: application.applicant_id },
              ],
              { onConflict: 'room_id,profile_id', ignoreDuplicates: true }
            );
          if (memberError) throw memberError;
        }
      } catch (roomErr) {
        // ルーム作成の失敗で承認自体は巻き戻さない。ただし黙殺せず画面に伝える。
        console.error('Error creating talk room:', roomErr);
        talkRoomWarning = '承認は完了しましたが、トークルームの作成に失敗しました。運営にご連絡ください。';
      }
    }

    return NextResponse.json({ ...updated, warning: talkRoomWarning });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

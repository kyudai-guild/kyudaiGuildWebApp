import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { isMemberOf } from '@/lib/org-manager';

// 応募の承認（マッチング成立）/ 見送り。
// できるのは、掲示した本人と、掲示した団体の所属者（2026-09: クエストは団体単位で運用する）。
// 団体の所属者は応募やクエストを本人の権限では読み書きできないので、
// ここで権限を確かめたうえで、サーバー権限で処理する。
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
    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'サーバーの設定が不足しています。' }, { status: 500 });
    }

    const { action } = await request.json();
    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json({ error: '不正な操作です。' }, { status: 400 });
    }

    const { data: application } = await admin
      .from('quest_applications')
      .select('id, status, applicant_id, quest:quest_id (id, creator_id, status, max_applicants, organization_id)')
      .eq('id', id)
      .maybeSingle();
    if (!application) {
      return NextResponse.json({ error: '応募が見つかりません。' }, { status: 404 });
    }

    const quest = application.quest as unknown as {
      id: string; creator_id: string; status: string; max_applicants: number; organization_id: string | null;
    };
    const allowed = quest.creator_id === user.id || await isMemberOf(supabase, user.id, quest.organization_id);
    if (!allowed) {
      return NextResponse.json({ error: '掲示した団体のメンバーだけが操作できます。' }, { status: 403 });
    }
    if (application.status !== 'pending') {
      return NextResponse.json({ error: 'この応募はすでに処理済みです。' }, { status: 400 });
    }

    if (action === 'accept') {
      const { count } = await admin
        .from('quest_applications')
        .select('id', { count: 'exact', head: true })
        .eq('quest_id', quest.id)
        .eq('status', 'accepted');
      if ((count ?? 0) >= quest.max_applicants) {
        return NextResponse.json({ error: '募集人数に達しています。' }, { status: 400 });
      }
    }

    // 同じ応募を2人が同時に処理しても二重にならないよう、未処理のものだけを更新する
    const { data: updated, error: updateError } = await admin
      .from('quest_applications')
      .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id, status, applicant_id, applicant:applicant_id (display_name)')
      .maybeSingle();
    if (updateError) {
      console.error('Error updating application:', updateError);
      return NextResponse.json({ error: '応募の更新に失敗しました。' }, { status: 500 });
    }
    if (!updated) {
      return NextResponse.json({ error: 'この応募はすでに処理済みです。' }, { status: 400 });
    }

    // マッチング成立 → トークルームを用意する
    let talkRoomWarning: string | null = null;
    if (action === 'accept') {
      try {
        await setupTalkRoom(admin, quest, user.id, application.applicant_id);
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

/**
 * クエストのトークルームを用意し、最初の参加者を入れる。
 *   - 承認した人
 *   - 掲示した団体の団体長（全員）
 *   - 承認された応募者（学生）
 * 掲示した本人や他のメンバーは、トーク一覧の「（未参加）」から自分で参加できる。
 * すでに参加している人（一意制約違反 23505）は成功とみなす。
 */
async function setupTalkRoom(
  admin: SupabaseClient,
  quest: { id: string; organization_id: string | null },
  approverId: string,
  applicantId: string,
) {
  let { data: room } = await admin.from('talk_rooms').select('id').eq('quest_id', quest.id).maybeSingle();
  if (!room) {
    const { data: created, error } = await admin.from('talk_rooms').insert({ quest_id: quest.id }).select('id').single();
    if (error) throw error;
    room = created;
  }

  const managerIds: string[] = [];
  if (quest.organization_id) {
    const { data: managers } = await admin
      .from('profile_organizations')
      .select('profile_id')
      .eq('organization_id', quest.organization_id)
      .eq('role', 'manager');
    for (const m of managers ?? []) managerIds.push(m.profile_id);
  }

  for (const profileId of new Set([approverId, ...managerIds, applicantId])) {
    const { error } = await admin.from('talk_members').insert({ room_id: room!.id, profile_id: profileId });
    if (error && error.code !== '23505') throw error;
  }
}

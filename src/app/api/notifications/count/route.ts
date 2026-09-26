import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { unreadByRoom, totalUnread } from '@/lib/talk-unread';
import { createAdminClient } from '@/lib/supabase-admin';
import { myOrganizationIds } from '@/lib/org-manager';

// ヘッダーのバッジ用: 要対応件数
//   pending_applications : 自分と自分の団体の依頼に来ている未処理の応募（→ マイクエスト）
//   pending_quests       : 審査待ちのクエスト（運営のみ。→ 管理）
//   pending_org_requests : 審査待ちの所属団体申請（運営のみ。→ 管理）
//   talk_unread          : 参加しているトークの未読メッセージ数（→ トーク）
//
// マイクエストのバッジは pending_applications だけを見る。
// 運営向けの件数を total に混ぜるとマイクエストの数字が実態とズレるため、
// 用途ごとにフィールドを分けて返している。
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 未処理の応募: 自分が掲示したクエストと、自分の団体の名義のクエストの分
    // （団体の所属者なら誰でも承認できるため。2026-09）。
    // 団体の分は本人の権限では読めないので、所属を確かめてからサーバー権限で数える
    const orgIds = await myOrganizationIds(supabase, user.id);
    const admin = orgIds.length > 0 ? createAdminClient() : null;
    let pendingApplications = 0;
    if (admin) {
      const { data: quests } = await admin
        .from('quests')
        .select('id')
        .or(`creator_id.eq.${user.id},organization_id.in.(${orgIds.join(',')})`);
      const questIds = (quests ?? []).map(q => q.id);
      if (questIds.length > 0) {
        const { count } = await admin
          .from('quest_applications')
          .select('id', { count: 'exact', head: true })
          .in('quest_id', questIds)
          .eq('status', 'pending');
        pendingApplications = count ?? 0;
      }
    } else {
      const { count, error } = await supabase
        .from('quest_applications')
        .select('id, quest:quest_id!inner(creator_id)', { count: 'exact', head: true })
        .eq('quest.creator_id', user.id)
        .eq('status', 'pending');
      if (error) {
        console.error('Error counting notifications:', error);
        return NextResponse.json({ error: '通知件数の取得に失敗しました。' }, { status: 500 });
      }
      pendingApplications = count ?? 0;
    }

    // トークの未読。数えられなくてもバッジ全体は落とさない
    const talkUnread = await unreadByRoom(supabase, user.id).then(totalUnread).catch(() => 0);

    // 運営向けの件数は管理者のときだけ数える
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    let pendingQuests = 0;
    let pendingOrgRequests = 0;
    if (profile?.role === 'admin') {
      const [quests, orgReqs] = await Promise.all([
        supabase.from('quests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('organization_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      pendingQuests = quests.count ?? 0;
      // v13 未実行の環境では organization_requests が無いため、
      // ここでエラーになってもバッジ全体を落とさず 0 として続行する。
      if (orgReqs.error) {
        console.error('Error counting organization requests:', orgReqs.error);
      } else {
        pendingOrgRequests = orgReqs.count ?? 0;
      }
    }

    return NextResponse.json({
      pending_applications: pendingApplications,
      pending_quests: pendingQuests,
      pending_org_requests: pendingOrgRequests,
      admin_total: pendingQuests + pendingOrgRequests,
      talk_unread: talkUnread,
      // 後方互換: 既存の呼び出し元が total を読んでいる
      total: pendingApplications,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

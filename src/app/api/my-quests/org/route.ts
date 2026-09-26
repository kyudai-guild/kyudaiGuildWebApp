import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { myOrganizationIds } from '@/lib/org-manager';

// マイクエストの「自団体の掲示クエスト」。
// 自分が所属する団体の名義で出されたクエストを、掲示した人を問わず返す
// （応募の承認・完了報告は、団体の所属者なら誰でもできるため）。
// 団体の所属者は他の人が出したクエストや応募を本人の権限では読めないので、
// 所属を確かめたうえで、その団体のものに限ってサーバー権限で読む。
const MAX_QUESTS = 200;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgIds = await myOrganizationIds(supabase, user.id);
    if (orgIds.length === 0) return NextResponse.json({ organizations: [], quests: [] });

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'サーバーの設定が不足しています。' }, { status: 500 });
    }

    const [{ data: orgs }, { data: quests, error }] = await Promise.all([
      admin.from('organizations').select('id, name').in('id', orgIds),
      admin
        .from('quests')
        .select(`
          *,
          creator:creator_id (display_name),
          reviewer:reviewed_by (display_name),
          organization:organization_id (id, name, is_active),
          private_details:quest_private_details (receiver_name, receiver_contact),
          applications:quest_applications (
            id,
            message,
            status,
            applied_at,
            applicant_id,
            applicant:applicant_id (display_name)
          )
        `)
        .in('organization_id', orgIds)
        .order('created_at', { ascending: false })
        .limit(MAX_QUESTS),
    ]);
    if (error) {
      console.error('Error fetching org quests:', error);
      return NextResponse.json({ error: '団体のクエストの取得に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json({ organizations: orgs ?? [], quests: quests ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// 他ユーザーの公開プロフィール（依頼者が応募者を確認する用途）
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

    // 所属団体は「承認済み（profile_organizations に入っている）」もののみ。
    // 申請中のものを他人に見せると、所属していない団体を名乗っている状態が公開される。
    const [profile, purposes, interests, organizations, acceptedCompleted, thanksReceived] = await Promise.all([
      supabase.from('profiles')
        .select('id, display_name, bio, qualifications, tags, created_at')
        .eq('id', id).single(),
      supabase.from('profile_purposes')
        .select('purpose:purpose_id(label, is_active)').eq('profile_id', id),
      supabase.from('profile_interests')
        .select('interest:interest_id(label, is_active)').eq('profile_id', id),
      supabase.from('profile_organizations')
        .select('organization:organization_id(name, is_active)').eq('profile_id', id),
      supabase.from('quest_applications')
        .select('id, quest:quest_id!inner(status)', { count: 'exact', head: true })
        .eq('applicant_id', id).eq('status', 'accepted').eq('quest.status', 'completed'),
      supabase.from('quest_thanks')
        .select('id', { count: 'exact', head: true }).eq('recipient_id', id),
    ]);

    if (profile.error || !profile.data) {
      return NextResponse.json({ error: 'ユーザーが見つかりません。' }, { status: 404 });
    }

    const pickLabels = (rows: any[] | null, key: string) =>
      (rows ?? [])
        .map(r => r[key])
        .filter((o: any) => o && o.is_active !== false)
        .map((o: any) => o.label);

    return NextResponse.json({
      id: profile.data.id,
      display_name: profile.data.display_name,
      bio: profile.data.bio,
      qualifications: profile.data.qualifications ?? [],
      tags: profile.data.tags ?? [],
      member_since: profile.data.created_at,
      purposes: pickLabels(purposes.data as any[], 'purpose'),
      interests: pickLabels(interests.data as any[], 'interest'),
      // 団体マスタの列は label ではなく name なので pickLabels は使わない
      organizations: (organizations.data ?? [])
        .map((r: any) => r.organization)
        .filter((o: any) => o && o.is_active !== false)
        .map((o: any) => o.name),
      accepted_completed: acceptedCompleted.count ?? 0,
      thanks_received: thanksReceived.count ?? 0,
    });
  } catch (err: any) {
    console.error('Error fetching user profile:', err);
    return NextResponse.json({ error: 'プロフィールの取得に失敗しました。' }, { status: 500 });
  }
}

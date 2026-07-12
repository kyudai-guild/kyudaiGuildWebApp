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

    const [profile, purposes, interests, acceptedCompleted, thanksReceived] = await Promise.all([
      supabase.from('profiles')
        .select('id, display_name, bio, qualifications, tags, created_at')
        .eq('id', id).single(),
      supabase.from('profile_purposes')
        .select('purpose:purpose_id(label, is_active)').eq('profile_id', id),
      supabase.from('profile_interests')
        .select('interest:interest_id(label, is_active)').eq('profile_id', id),
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
      accepted_completed: acceptedCompleted.count ?? 0,
      thanks_received: thanksReceived.count ?? 0,
    });
  } catch (err: any) {
    console.error('Error fetching user profile:', err);
    return NextResponse.json({ error: 'プロフィールの取得に失敗しました。' }, { status: 500 });
  }
}

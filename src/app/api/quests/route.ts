import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('quests')
      .select(`
        *,
        creator:creator_id (display_name),
        applications:quest_applications (id)
      `)
      .order('created_at', { ascending: false });

    // 管理者なら全件、一般ユーザーなら承認済みのみ
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        query = query.eq('status', 'approved');
      }
    } else {
      query = query.eq('status', 'approved');
    }

    const { data: quests, error } = await query;

    if (error) {
      console.error('Error fetching quests:', error);
      return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 });
    }

    // 応募数を付加
    const questsWithCount = (quests || []).map(q => ({
      ...q,
      application_count: q.applications?.length || 0,
      applications: undefined, // 詳細は別APIで返す
    }));

    return NextResponse.json(questsWithCount);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      quest_type,
      max_applicants,
      reward,
      tags,
      listing_duration_type,
      listing_duration_weeks,
      listing_end_date,
    } = body;

    if (!title || !quest_type) {
      return NextResponse.json({ error: 'クエスト名とクエスト種別は必須です。' }, { status: 400 });
    }

    // 掲示期間のバリデーション
    if (listing_duration_type === 'weeks' && listing_duration_weeks) {
      if (listing_duration_weeks < 1 || listing_duration_weeks > 26) {
        return NextResponse.json({ error: '掲示期間は1〜26週間で指定してください。' }, { status: 400 });
      }
    }

    if (listing_duration_type === 'date' && listing_end_date) {
      const endDate = new Date(listing_end_date);
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 6);
      if (endDate > maxDate) {
        return NextResponse.json({ error: '掲示期間は半年以内で指定してください。' }, { status: 400 });
      }
    }

    const { data: quest, error: insertError } = await supabase
      .from('quests')
      .insert({
        creator_id: user.id,
        title,
        description,
        quest_type,
        max_applicants: max_applicants || 1,
        reward: reward || '',
        tags: tags || [],
        listing_duration_type,
        listing_duration_weeks,
        listing_end_date,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting quest:', insertError);
      return NextResponse.json({ error: 'クエストの作成に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json(quest);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

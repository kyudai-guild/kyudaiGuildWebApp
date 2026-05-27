import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: quests, error } = await supabase
      .from('quests')
      .select(`
        *,
        creator:creator_id (display_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quests:', error);
      return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 });
    }

    return NextResponse.json(quests);
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
    const { title, description, category, reward, skill_name, difficulty, deadline } = body;

    // クエスト作成
    const { data: quest, error: insertError } = await supabase
      .from('quests')
      .insert({
        creator_id: user.id,
        title,
        description,
        category,
        reward,
        skill_name,
        difficulty,
        deadline,
        status: 'open'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting quest:', insertError);
      return NextResponse.json({ error: 'Failed to create quest' }, { status: 500 });
    }

    return NextResponse.json(quest);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { searchParams } = new URL(request.url);
    const year  = searchParams.get('year');
    const month = searchParams.get('month');
    const upcoming = searchParams.get('upcoming'); // "3" など件数指定

    let query = supabase
      .from('events')
      .select('*, organizer:organizer_id(display_name)')
      .order('event_date', { ascending: true });

    // 管理者以外は承認済みのみ
    if (user) {
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') {
        query = query.eq('status', 'approved');
      }
    } else {
      query = query.eq('status', 'approved');
    }

    // 月絞り込み
    if (year && month) {
      const start = new Date(Number(year), Number(month) - 1, 1).toISOString();
      const end   = new Date(Number(year), Number(month), 0, 23, 59, 59).toISOString();
      query = query.gte('event_date', start).lte('event_date', end);
    }

    // 直近 n 件
    if (upcoming) {
      query = query
        .gte('event_date', new Date().toISOString())
        .limit(Number(upcoming));
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
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

    // 管理者チェック
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: '管理者のみイベントを登録できます。' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title, description, event_date, event_end_date,
      location, location_url, category, capacity, tags,
    } = body;

    if (!title || !event_date) {
      return NextResponse.json({ error: 'タイトルと開催日時は必須です。' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('events')
      .insert({
        organizer_id: user.id,
        title, description, event_date, event_end_date: event_end_date || null,
        location, location_url, category: category || 'その他',
        capacity: capacity || null, tags: tags || [],
        status: 'approved', // 管理者が直接登録 → 即承認
      })
      .select().single();

    if (error) {
      return NextResponse.json({ error: `[${error.code}] ${error.message}` }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

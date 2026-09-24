import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { validateEventInput } from '@/lib/event-form';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const year  = searchParams.get('year');
    const month = searchParams.get('month');
    const upcoming = searchParams.get('upcoming'); // "3" など件数指定

    // 表示してよい範囲は events_select の RLS が決める
    //   （承認済み / 自分が登録したもの / 管理者は全件）。
    // 以前はここで getUser() と profiles を引いて管理者かどうかを調べ、
    // 非管理者には status='approved' を付けていたが、RLS が同じことを
    // しているため往復2回ぶんまるごと無駄だった。
    // イベントを登録できるのは管理者だけなので、一般ユーザーに
    // 「自分が登録した未承認イベント」は存在せず、挙動は変わらない。
    let query = supabase
      .from('events')
      .select('*, organizer:organizer_id(display_name)')
      .order('event_date', { ascending: true });

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

    const checked = validateEventInput(await request.json());
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

    const { data, error } = await supabase
      .from('events')
      .insert({
        organizer_id: user.id,
        // organizer_name は表示用の主催団体名。登録者（organizer_id）とは別に持つ
        ...checked.value,
        status: 'approved', // 管理者が直接登録 → 即承認
      })
      .select().single();

    if (error) {
      console.error('Error inserting event:', error);
      return NextResponse.json({ error: 'イベントの登録に失敗しました。' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

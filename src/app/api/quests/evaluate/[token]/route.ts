import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: トークンからクエスト情報を取得
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('quest_completions')
    .select('*')
    .eq('evaluation_token', token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '評価URLが無効です' }, { status: 404 });
  }

  if (data.evaluated) {
    return NextResponse.json({ error: 'すでに評価済みです' }, { status: 409 });
  }

  return NextResponse.json(data);
}

// POST: 評価を送信
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createAdminClient();

  // トークン検証
  const { data: completion, error: fetchError } = await supabase
    .from('quest_completions')
    .select('id, evaluated')
    .eq('evaluation_token', token)
    .single();

  if (fetchError || !completion) {
    return NextResponse.json({ error: '評価URLが無効です' }, { status: 404 });
  }

  if (completion.evaluated) {
    return NextResponse.json({ error: 'すでに評価済みです' }, { status: 409 });
  }

  const body = await req.json();
  const { rating_speed, rating_quality, rating_communication, would_request_again, comment } = body;

  // 評価を保存
  const { error: evalError } = await supabase.from('evaluations').insert({
    quest_completion_id: completion.id,
    rating_speed,
    rating_quality,
    rating_communication,
    would_request_again,
    comment: comment || null,
  });

  if (evalError) {
    console.error('Evaluation insert error:', evalError);
    return NextResponse.json({ error: 'DBエラーが発生しました' }, { status: 500 });
  }

  // evaluated フラグを立てる
  await supabase
    .from('quest_completions')
    .update({ evaluated: true })
    .eq('id', completion.id);

  return NextResponse.json({ success: true });
}

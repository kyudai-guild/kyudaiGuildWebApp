import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    if (!name) return NextResponse.json([], { status: 200 });

    const supabase = createAdminClient();

    // 直近の実績（クエスト完了＋評価）を取得
    const { data, error } = await supabase
      .from('quest_completions')
      .select(`
        *,
        evaluations (*)
      `)
      .ilike('member_name', name)
      .order('completed_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Fetch achievements error:', error);
      // フロント側は Array.isArray で判定しているため、空配列で縮退して
      // 「読み込み中...」のまま固まる事象を避ける
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('Achievements handler unexpected error:', err);
    return NextResponse.json([], { status: 200 });
  }
}

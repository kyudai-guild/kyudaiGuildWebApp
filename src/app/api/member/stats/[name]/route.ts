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

    // スキルごとの集計SQLを実行
    // ベイズ平均の計算式：(C * m + sum(ratings)) / (C + n)
    // C (補正件数) = 5, m (全体平均) = 3.5 と仮定
    const { data, error } = await supabase.rpc('get_skill_stats', { member_name_input: name });

    if (!error && Array.isArray(data)) {
      return NextResponse.json(data);
    }

    if (error) {
      console.warn('RPC get_skill_stats failed, falling back to manual aggregation:', error.message);
    }

    // RPCがない場合のフォールバックとして通常の集計を行う
    const { data: rawData, error: rawError } = await supabase
      .from('quest_completions')
      .select(`
        skill_name,
        evaluations (
          rating_speed,
          rating_quality,
          rating_communication
        )
      `)
      .ilike('member_name', name)
      .eq('evaluated', true);

    if (rawError) {
      console.error('Fetch skill stats fallback error:', rawError);
      // フロント側で Array.isArray チェックがあるため、空配列で縮退
      return NextResponse.json([], { status: 200 });
    }

    const stats = (rawData ?? []).reduce((acc: Record<string, { count: number; totalRating: number; evalCount: number }>, item: any) => {
      const skill = item.skill_name;
      if (!acc[skill]) acc[skill] = { count: 0, totalRating: 0, evalCount: 0 };

      acc[skill].count += 1;

      const evals = item.evaluations;
      if (evals && evals.length > 0) {
        const avg = (evals[0].rating_speed + evals[0].rating_quality + evals[0].rating_communication) / 3;
        acc[skill].totalRating += avg;
        acc[skill].evalCount += 1;
      }
      return acc;
    }, {});

    const result = Object.keys(stats).map(skill => {
      const s = stats[skill];
      const C = 5;
      const m = 3.5;
      const n = s.evalCount;
      const bayesianAvg = n > 0 ? (C * m + s.totalRating) / (C + n) : m;

      return {
        skill_name: skill,
        level: s.count, // 完了数 = レベル
        rating: Math.round(bayesianAvg * 10) / 10,
        count: n
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Stats handler unexpected error:', err);
    return NextResponse.json([], { status: 200 });
  }
}

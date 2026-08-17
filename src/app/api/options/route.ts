import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// 利用目的・興味分野マスタ（有効なもののみ）
export async function GET() {
  try {
    const supabase = await createClient();
    const [purposes, interests] = await Promise.all([
      supabase.from('purpose_options').select('id, label, description').eq('is_active', true).order('sort_order'),
      supabase.from('interest_options').select('id, label').eq('is_active', true).order('sort_order'),
    ]);
    if (purposes.error || interests.error) {
      console.error('Error fetching options:', purposes.error || interests.error);
      return NextResponse.json({ error: '選択肢の取得に失敗しました。' }, { status: 500 });
    }
    return NextResponse.json({ purposes: purposes.data ?? [], interests: interests.data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

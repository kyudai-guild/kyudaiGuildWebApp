import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// リジェクトされた依頼を「確認した」と記録する。
//   - マイクエストを開いたとき（＝実際に目にしたとき）
//   - ホーム画面のバナーを閉じたとき（＝本人が「了解」と示したとき）
// の2か所から呼ばれる。
//
// 以降そのリジェクトについてバナーは出ない。
// 新しくリジェクトされた依頼は rejection_seen_at が NULL のままなので、
// またバナーに出る（「一度閉じたら二度と出ない」にはしない）。
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('quests')
      .update({ rejection_seen_at: new Date().toISOString() })
      .eq('creator_id', user.id)
      .eq('status', 'rejected')
      .is('rejection_seen_at', null)
      .select('id');

    if (error) {
      console.error('Error marking rejections as seen:', error);
      return NextResponse.json({ error: '確認状態の保存に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json({ marked: data?.length ?? 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

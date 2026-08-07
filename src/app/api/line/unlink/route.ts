import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// LINE連携の解除（本人のみ）
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        line_user_id: null,
        line_display_name: null,
        line_picture_url: null,
        line_linked_at: null,
        line_friend: false,
      })
      .eq('id', user.id);
    if (error) {
      console.error('Error unlinking LINE account:', error);
      return NextResponse.json({ error: 'LINE連携の解除に失敗しました。' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

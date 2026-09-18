import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// 運営が管理画面から切り替える設定（v18 の app_settings）。
//   GET   : 現在の設定
//   PATCH : 変更   body { slack_notifications: boolean }
//
// RLS 側でも運営以外は読み書きできないが、ここでも明示的に確認する。

const ALLOWED_KEYS = ['slack_notifications'] as const;
type AllowedKey = typeof ALLOWED_KEYS[number];

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return { error: NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 }) };
  }
  return { supabase, user };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { data, error } = await auth.supabase!
      .from('app_settings')
      .select('key, value, updated_at');

    if (error) {
      // v18 未実行のときはここに来る。画面を壊さず既定値を返す。
      console.error('Error fetching app settings:', error);
      return NextResponse.json({ slack_notifications: true, available: false });
    }

    const map = new Map((data ?? []).map(r => [r.key, r.value]));
    return NextResponse.json({
      // 設定が無い場合は既定のON
      slack_notifications: map.get('slack_notifications') !== false,
      available: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();

    const updates = ALLOWED_KEYS
      .filter((key: AllowedKey) => typeof body[key] === 'boolean')
      .map((key: AllowedKey) => ({
        key,
        value: body[key] as boolean,
        updated_at: new Date().toISOString(),
        updated_by: auth.user!.id,
      }));

    if (updates.length === 0) {
      return NextResponse.json({ error: '変更内容がありません。' }, { status: 400 });
    }

    const { error } = await auth.supabase!
      .from('app_settings')
      .upsert(updates, { onConflict: 'key' });

    if (error) {
      console.error('Error updating app settings:', error);
      return NextResponse.json(
        { error: '設定の保存に失敗しました。v18 のマイグレーションが未実行かもしれません。' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

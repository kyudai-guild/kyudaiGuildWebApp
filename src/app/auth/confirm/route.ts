import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';

/**
 * メール確認リンクの着地点。
 *
 * 既定の `{{ .ConfirmationURL }}` は `<project-ref>.supabase.co` を指すため、
 * 「送信元ドメイン」と「本文中のリンク先ドメイン」が食い違い、
 * 迷惑メール・フィッシング判定を受けやすくなる。
 *
 * そこでメールテンプレート側を
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
 * に変更し、ここでトークンを検証してセッションを張る。
 * これでメール内のリンクが自分のドメインに統一される。
 *
 * 旧形式のリンク（/auth/callback?code=...）も引き続き有効なので、
 * 送信済みのメールが無効になることはない。
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/';

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent('確認リンクが正しくありません。')}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    console.error('Error verifying email token:', error);
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent('確認リンクの有効期限が切れているか、すでに使用されています。お手数ですが再度ご登録ください。')}`
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}

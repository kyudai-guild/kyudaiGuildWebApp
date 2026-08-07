import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import {
  buildAuthorizeUrl, isLineLoginConfigured, lineRedirectUri, randomToken, LINE_OAUTH_COOKIE,
} from '@/lib/line';

/**
 * LINEログインの開始。
 *   ?mode=link   … ログイン中のユーザーにLINEを紐付ける（プロフィール画面から）
 *   ?mode=signin … 紐付け済みLINEアカウントでサイトにログインする（ログイン画面から）
 *   ?next=/path  … 完了後の戻り先
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const mode = searchParams.get('mode') === 'signin' ? 'signin' : 'link';
  const next = searchParams.get('next') ?? (mode === 'signin' ? '/' : '/profile');

  if (!isLineLoginConfigured()) {
    return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent('LINE連携は準備中です。')}`);
  }

  const state = randomToken();
  const nonce = randomToken();

  const cookieStore = await cookies();
  cookieStore.set(LINE_OAUTH_COOKIE, JSON.stringify({ state, nonce, mode, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10分
  });

  const url = buildAuthorizeUrl({
    redirectUri: lineRedirectUri(origin),
    state,
    nonce,
    // 通知が目的なので、ログインついでに公式アカウントの友だち追加を促す
    botPrompt: 'aggressive',
  });

  return NextResponse.redirect(url);
}

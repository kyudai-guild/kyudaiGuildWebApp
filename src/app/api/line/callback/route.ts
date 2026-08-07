import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  exchangeCodeForToken, fetchFriendshipStatus, lineRedirectUri, verifyIdToken, LINE_OAUTH_COOKIE,
} from '@/lib/line';

type OAuthState = { state: string; nonce: string; mode: 'link' | 'signin'; next: string };

const fail = (origin: string, path: string, message: string) =>
  NextResponse.redirect(`${origin}${path}?error=${encodeURIComponent(message)}`);

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const cookieStore = await cookies();

  const raw = cookieStore.get(LINE_OAUTH_COOKIE)?.value;
  cookieStore.delete(LINE_OAUTH_COOKIE);

  let saved: OAuthState;
  try {
    saved = JSON.parse(raw ?? '');
  } catch {
    return fail(origin, '/auth', 'LINE連携の有効期限が切れました。もう一度お試しください。');
  }
  const backTo = saved.mode === 'signin' ? '/auth' : '/profile';

  // ユーザーが同意画面でキャンセルした場合
  const errorParam = searchParams.get('error');
  if (errorParam) {
    return fail(origin, backTo, 'LINE連携をキャンセルしました。');
  }

  // CSRF 対策: 開始時に発行した state と一致することを確認
  const state = searchParams.get('state');
  const code = searchParams.get('code');
  if (!code || !state || state !== saved.state) {
    return fail(origin, backTo, 'LINE連携の検証に失敗しました。もう一度お試しください。');
  }

  try {
    const token = await exchangeCodeForToken(code, lineRedirectUri(origin));
    const payload = await verifyIdToken(token.id_token, saved.nonce);
    const lineUserId = payload.sub;

    // 公式アカウントの友だち状態（チャネル未連携なら false のまま進む）
    let isFriend = false;
    try {
      isFriend = await fetchFriendshipStatus(token.access_token);
    } catch {
      /* 友だち状態が取れなくても連携自体は続行する */
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    /* ---------- ログイン中 → 紐付け ---------- */
    if (user) {
      // 他のアカウントで使われているLINEは紐付けさせない
      const { data: taken } = await supabase
        .from('profiles')
        .select('id')
        .eq('line_user_id', lineUserId)
        .neq('id', user.id)
        .maybeSingle();
      if (taken) {
        return fail(origin, '/profile', 'このLINEアカウントは別のギルドアカウントに連携済みです。');
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          line_user_id: lineUserId,
          line_display_name: payload.name ?? null,
          line_picture_url: payload.picture ?? null,
          line_linked_at: new Date().toISOString(),
          line_friend: isFriend,
        })
        .eq('id', user.id);
      if (error) {
        console.error('Error linking LINE account:', error);
        return fail(origin, '/profile', 'LINE連携の保存に失敗しました。');
      }
      return NextResponse.redirect(`${origin}${saved.next}?line=linked`);
    }

    /* ---------- 未ログイン → 紐付け済みならログイン ---------- */
    const admin = createAdminClient();
    if (!admin) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not configured; LINE sign-in unavailable');
      return fail(origin, '/auth', 'LINEログインは現在利用できません。メールアドレスでログインしてください。');
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('id, email')
      .eq('line_user_id', lineUserId)
      .maybeSingle();

    if (!profile?.email) {
      return fail(
        origin, '/auth',
        'このLINEアカウントはまだ連携されていません。九大メールでログインし、プロフィール画面から連携してください。'
      );
    }

    // 友だち状態だけ最新化しておく
    await admin.from('profiles').update({ line_friend: isFriend }).eq('id', profile.id);

    // 本人確認済みのLINEアカウントに対してのみセッションを発行する
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: profile.email,
    });
    const tokenHash = link?.properties?.hashed_token;
    if (linkError || !tokenHash) {
      console.error('Error generating session link:', linkError);
      return fail(origin, '/auth', 'LINEログインに失敗しました。メールアドレスでログインしてください。');
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink',
    });
    if (verifyError) {
      console.error('Error verifying session token:', verifyError);
      return fail(origin, '/auth', 'LINEログインに失敗しました。メールアドレスでログインしてください。');
    }

    return NextResponse.redirect(`${origin}${saved.next}`);
  } catch (err) {
    console.error('LINE callback error:', err);
    return fail(origin, backTo, 'LINE連携に失敗しました。時間をおいてお試しください。');
  }
}

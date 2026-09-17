import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // 保護ルート: ログインが必要なページ
  const protectedRoutes = ['/my-quests', '/admin']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  // メール未認証のユーザーは保護ルートからブロック
  if (isProtectedRoute && user && !user.email_confirmed_at) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('error', 'メールアドレスの認証が完了していません。')
    return NextResponse.redirect(url)
  }

  // 管理者ページのアクセス制御（profilesテーブルのroleで判定）
  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // api/ を除外している。ここが重要:
    //   このミドルウェアは supabase.auth.getUser() を呼ぶが、これは
    //   Supabase の認証APIへの**ネットワーク往復**であってローカル検証ではない。
    //   各ルートハンドラも先頭で同じ getUser() を呼んでいるため、
    //   除外しないと 1回のAPI呼び出しにつき認証の往復が2回発生する。
    //   ミドルウェアが守っているのは /my-quests と /admin の**ページ遷移**だけで、
    //   APIの認可はルートハンドラ側と RLS が担っているので、除外しても穴は空かない。
    //
    //   ページ側を matcher に残しているのはセッション更新のため。
    //   久しぶりの訪問でアクセストークンが期限切れのとき、ここで
    //   Cookie が更新されるので、直後のAPI呼び出しが 401 にならずに済む。
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

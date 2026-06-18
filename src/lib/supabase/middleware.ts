import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { type Database } from '@/types/database'

export async function updateSession(request: NextRequest) {

  const { pathname } = request.nextUrl

  // Pozwól działać cron jobs bez sesji użytkownika
  if (pathname.startsWith('/api/cron')) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  const publicPaths = ['/', '/auth', '/auth/callback', '/api/og', '/manifest.json', '/join', '/terms']
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p))

  console.log(`[MIDDLEWARE] ${pathname} | user=${user?.id ?? 'none'} | public=${isPublicPath}${authError ? ` | authError=${authError.message}` : ''}`)

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
    console.log(`[MIDDLEWARE] redirect → /auth?next=${pathname} | reason=no_session`)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

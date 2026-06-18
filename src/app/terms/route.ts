import { NextResponse, type NextRequest } from 'next/server'

export function GET(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = '/'
  url.searchParams.set('terms', 'true')
  return NextResponse.redirect(url, { status: 302 })
}



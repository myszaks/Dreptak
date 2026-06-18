import { createServerClient } from '@supabase/ssr'
import { type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { email } = await request.json()

  if (!email) {
    return Response.json(
      { error: 'Email is required' },
      { status: 400 }
    )
  }

  try {
    // Use service role to check auth.users directly
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
      }
    )

    if (!response.ok) {
      // If service role key is not available, fallback to empty result
      return Response.json({ exists: false })
    }

    const { users } = await response.json()
    const exists = users?.some((u: any) => u.email?.toLowerCase() === email.toLowerCase())

    return Response.json({ exists: !!exists })
  } catch (error) {
    console.error('Error checking email:', error)
    // On error, return false to allow signup attempt (will fail with proper Supabase error)
    return Response.json({ exists: false })
  }
}

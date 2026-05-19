import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Ensure profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!existingProfile) {
        // For Google: pre-fill username from display name
        // For email: leave username blank → onboarding will set it
        const isGoogle = !!data.user.user_metadata?.full_name
        if (isGoogle) {
          const displayName = data.user.user_metadata.full_name
          const username =
            displayName.replace(/\s+/g, '_').toLowerCase().slice(0, 20) +
            '_' +
            Math.random().toString(36).slice(2, 5)
          await supabase.from('profiles').insert({
            id: data.user.id,
            username,
            avatar_url: data.user.user_metadata?.avatar_url ?? null,
          })
        }
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_failed`)
}

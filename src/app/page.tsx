import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams
  const showTerms = params.terms === 'true'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Allow unlogged users to see the terms modal
  if (!user && !showTerms) {
    redirect('/auth')
  }

  // If user is logged in, check profile
  if (user) {
    // Check if profile exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      redirect('/onboarding')
    }

    redirect('/home')
  }

  // If we reach here, user is not logged in but is showing terms
  // Render the terms modal on the home page
  return (
    <div className="min-h-dvh">
      {/* Home page content would go here, but for now just render empty */}
    </div>
  )
}


import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/navigation/bottom-nav'
import { AuthInitializer } from '@/components/providers/auth-initializer'
import { NotificationsProvider } from '@/components/providers/notifications-provider'
import { PushPermissionSheet } from '@/components/notifications/push-permission-sheet'
import type { Profile } from '@/types/database'

// This layout runs as a Server Component on every navigation, which lets us
// pass a fresh profile directly to the AuthInitializer client component.
// AuthInitializer writes it into Zustand *synchronously during render* (not in
// a useEffect), so NotificationsProvider and every other client component in
// the tree already see the correct profileId on their very first render tick.
// This eliminates the "enabled: !!profileId → disabled on first render" race
// that was the primary cause of intermittent infinite loading.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-dvh bg-background">
      <AuthInitializer profile={profile as Profile | null} />
      <NotificationsProvider />
      {children}
      <BottomNav />
      <PushPermissionSheet />
    </div>
  )
}

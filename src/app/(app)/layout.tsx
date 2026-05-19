import { BottomNav } from '@/components/navigation/bottom-nav'
import { AuthInitializer } from '@/components/providers/auth-initializer'
import { NotificationsProvider } from '@/components/providers/notifications-provider'
import { PushPermissionSheet } from '@/components/notifications/push-permission-sheet'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <AuthInitializer />
      <NotificationsProvider />
      {children}
      <BottomNav />
      <PushPermissionSheet />
    </div>
  )
}

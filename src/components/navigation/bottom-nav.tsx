'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Trophy, Upload, Bell, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/app-store'

const NAV_ITEMS = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/challenges', icon: Trophy, label: 'Wyzwania' },
  { href: '/upload', icon: Upload, label: 'Dodaj', primary: true },
  { href: '/notifications', icon: Bell, label: 'Powiadom.' },
  { href: '/profile', icon: User, label: 'Profil' },
]

export function BottomNav() {
  const pathname = usePathname()
  const { unreadCount } = useAppStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-area-pb">
      <div className="bg-background/80 backdrop-blur-xl border-t border-white/10 shadow-2xl">
        <div className="flex items-center justify-around px-2 h-16 max-w-lg mx-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon

            if (item.primary) {
              return (
                <Link key={item.href} href={item.href} className="relative -mt-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-xl shadow-blue-500/40 active:scale-90 transition-transform duration-150">
                    <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                </Link>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center gap-0.5 px-3 py-2 min-w-[52px]"
              >
                {/* Active indicator — uses transform (composited) */}
                <span
                  className={cn(
                    'absolute -top-0.5 inset-x-0 mx-auto w-4 h-0.5 bg-primary rounded-full transition-opacity duration-200',
                    isActive ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="relative">
                  {/* Two overlapping icons — transition via opacity (composited) */}
                  <Icon
                    className="w-6 h-6 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <Icon
                    className={cn(
                      'w-6 h-6 text-primary absolute inset-0 transition-opacity duration-200',
                      isActive ? 'opacity-100' : 'opacity-0'
                    )}
                    strokeWidth={2.5}
                  />
                  {item.href === '/notifications' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                {/* Two overlapping labels — transition via opacity (composited) */}
                <span className="text-[10px] font-semibold text-muted-foreground">{item.label}</span>
                <span
                  className={cn(
                    'text-[10px] font-semibold text-primary absolute bottom-2 transition-opacity duration-200',
                    isActive ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
 

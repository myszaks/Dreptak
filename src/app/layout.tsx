import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/lib/query-provider'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'Dreptak – Step Challenge dla przyjaciół',
  description: 'Rywalizuj ze znajomymi na kroki. Fun, memy, rywalizacja.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Dreptak',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'pl_PL',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'Dreptak',
    title: 'Dreptak – Step Challenge dla przyjaciół',
    description: 'Rywalizuj ze znajomymi na kroki.',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
    { media: '(prefers-color-scheme: light)', color: '#0a0a0f' },
  ],
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <QueryProvider>
          {children}
          <Toaster
            position="top-center"
            richColors
            toastOptions={{
              style: {
                background: 'hsl(var(--card))',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'hsl(var(--foreground))',
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  )
}

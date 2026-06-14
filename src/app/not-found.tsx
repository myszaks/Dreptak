import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center gap-5 p-6">
      <p className="text-6xl">🔍</p>
      <div className="text-center">
        <h1 className="text-2xl font-black mb-1">Strona nie znaleziona</h1>
        <p className="text-sm text-muted-foreground">Ta strona nie istnieje lub została usunięta</p>
      </div>
      <Link href="/home">
        <Button variant="gradient">Wróć na ekran główny</Button>
      </Link>
    </div>
  )
}

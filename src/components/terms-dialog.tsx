'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export function TermsDialog() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const showTerms = searchParams.get('terms') === 'true'
    setOpen(showTerms)
  }, [searchParams])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Remove terms param from URL
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      params.delete('terms')
      const newUrl = params.toString()
      const newPath = newUrl ? `?${newUrl}` : '/'
      router.replace(newPath)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-lg sm:text-xl">Regulamin</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm text-muted-foreground">
          <p className="leading-relaxed">
            Niniejszy regulamin opisuje zasady korzystania z aplikacji Dreptak. Korzystając z aplikacji, akceptujesz zasady i zobowiązujesz się do przestrzegania ich postanowień.
          </p>

          <div>
            <h3 className="font-semibold text-foreground text-sm sm:text-base mb-1">1. Rejestracja i konto</h3>
            <p className="leading-relaxed">Masz prawo utworzyć konto i korzystać z funkcji aplikacji. Dbaj o poufność danych logowania.</p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground text-sm sm:text-base mb-1">2. Wyzwania i treści</h3>
            <p className="leading-relaxed">Tworząc wyzwania akceptujesz odpowiedzialność za treści oraz zachowanie innych uczestników. Zabronione są treści obraźliwe, nielegalne lub naruszające prawa osób trzecich.</p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground text-sm sm:text-base mb-1">3. Dane i prywatność</h3>
            <p className="leading-relaxed">Dane użytkowników są wykorzystywane wyłącznie do celów funkcjonowania wyzwań i statystyk. Szczegóły polityki prywatności dostępne są w aplikacji.</p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground text-sm sm:text-base mb-1">4. Usuwanie wyzwania</h3>
            <p className="leading-relaxed">Autor wyzwania może je usunąć. Usunięcie jest nieodwracalne i powoduje utratę powiązanych danych.</p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground text-sm sm:text-base mb-1">5. Kontakt</h3>
            <p className="leading-relaxed">W razie pytań skontaktuj się z administracją aplikacji.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


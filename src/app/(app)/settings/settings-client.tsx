'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/store/app-store'
import { toast } from 'sonner'
import type { Profile } from '@/types/database'
import { Textarea } from "@/components/ui/textarea";

interface SettingsClientProps {
  profile: Profile | null
}

export function SettingsClient({ profile: initialProfile }: SettingsClientProps) {
  const supabase = createClient()
  const { setProfile } = useAppStore()
  const [username, setUsername] = useState(initialProfile?.username ?? '')
  const [bio, setBio] = useState(initialProfile?.bio ?? '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile)
      setUsername(initialProfile.username ?? '')
      setBio(initialProfile.bio ?? '')
    }
  }, [initialProfile, setProfile])

  const handleSave = async () => {
    // Use the prop ID — it never changes between server render and client interaction,
    // and avoids reading from the global Zustand store inside an event handler.
    if (!initialProfile?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ username: username.trim(), bio: bio.trim() })
        .eq('id', initialProfile.id)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          toast.error('Ta nazwa jest zajęta!')
        } else {
          throw error
        }
        return
      }

      setProfile(data)
      toast.success('Profil zaktualizowany!')
    } catch {
      toast.error('Nie udało się zapisać')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container space-y-5">
      <div className="sticky-header -mx-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="p-2 rounded-xl bg-white/5">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-black">Ustawienia</h1>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <h2 className="font-bold">Profil</h2>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">Nazwa użytkownika</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={15}
              placeholder="Twoja nazwa..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">Bio</label>
            <Textarea
              value={bio}
              onChange={(e) => {
                const textarea = e.currentTarget;
                textarea.style.height = "auto";
                textarea.style.height = `${textarea.scrollHeight}px`;
                setBio(e.target.value);
              }}
              maxLength={100}
              placeholder="Krótki opis..."
              className="min-h-[40px] resize-none"
            />
          </div>

          <Button
            variant="gradient"
            className="w-full"
            onClick={handleSave}
            loading={loading}
            disabled={!username.trim()}
          >
            Zapisz
          </Button>
        </CardContent>
      </Card>

      {/* App info */}
      <Card>
        <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
          <p className="font-bold text-foreground">O aplikacji</p>
          <p>Dreptak v1.0.0 – Social Step Challenge</p>
          <p>Made with ❤️ for lazy walkers</p>
        </CardContent>
      </Card>
    </div>
  )
}

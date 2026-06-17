import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile, Challenge, Notification } from '@/types/database'

interface AppState {
  // Auth
  profile: Profile | null
  setProfile: (profile: Profile | null) => void

  // Active challenge context
  activeChallengeId: string | null
  setActiveChallengeId: (id: string | null) => void

  // Notifications
  unreadCount: number
  setUnreadCount: (count: number) => void

  // Push notifications
  showPushPrompt: boolean
  setShowPushPrompt: (show: boolean) => void
  /** Timestamp of last time we showed the push notification prompt (ms). */
  lastPushPromptTime: number | null
  setLastPushPromptTime: (time: number | null) => void

  // PWA install
  /** Timestamp of last time we showed the PWA install prompt (ms). */
  lastPwaPromptTime: number | null
  setLastPwaPromptTime: (time: number | null) => void

  // UI
  isUploadOpen: boolean
  setIsUploadOpen: (open: boolean) => void

  // Onboarding
  hasCompletedOnboarding: boolean
  setHasCompletedOnboarding: (done: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),

      activeChallengeId: null,
      setActiveChallengeId: (activeChallengeId) => set({ activeChallengeId }),

      unreadCount: 0,
      setUnreadCount: (unreadCount) => set({ unreadCount }),

      showPushPrompt: false,
      setShowPushPrompt: (showPushPrompt) => set({ showPushPrompt }),
      lastPushPromptTime: null,
      setLastPushPromptTime: (lastPushPromptTime) => set({ lastPushPromptTime }),

      lastPwaPromptTime: null,
      setLastPwaPromptTime: (lastPwaPromptTime) => set({ lastPwaPromptTime }),

      isUploadOpen: false,
      setIsUploadOpen: (isUploadOpen) => set({ isUploadOpen }),

      hasCompletedOnboarding: false,
      setHasCompletedOnboarding: (hasCompletedOnboarding) => set({ hasCompletedOnboarding }),
    }),
    {
      name: 'dreptak-store',
      partialize: (state) => ({
        lastPwaPromptTime:       state.lastPwaPromptTime,
        hasCompletedOnboarding:  state.hasCompletedOnboarding,
        activeChallengeId:       state.activeChallengeId,
        lastPushPromptTime:      state.lastPushPromptTime,
      }),
    }
  )
)

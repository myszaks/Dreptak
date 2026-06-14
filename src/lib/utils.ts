import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSteps(steps: number): string {
  if (steps >= 1_000_000) return `${(steps / 1_000_000).toFixed(1)}M`
  if (steps >= 1000) return steps.toLocaleString('pl-PL')
  return steps.toString()
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

export function getRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'przed chwilą'
  if (diffMins < 60) return `${diffMins} min temu`
  if (diffHours < 24) return `${diffHours}h temu`
  if (diffDays === 1) return 'wczoraj'
  if (diffDays < 7) return `${diffDays} dni temu`
  return formatDate(d)
}

export function getRankEmoji(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

export function getRankColor(rank: number): string {
  if (rank === 1) return 'text-yellow-400'
  if (rank === 2) return 'text-slate-300'
  if (rank === 3) return 'text-amber-600'
  return 'text-muted-foreground'
}

export function generateInviteUrl(inviteCode: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${appUrl}/join/${inviteCode}`
}

export function isEditWindowOpen(editExpiresAt: string | null): boolean {
  if (!editExpiresAt) return false
  return new Date(editExpiresAt) > new Date()
}

export function getEditTimeRemaining(editExpiresAt: string | null): string {
  if (!editExpiresAt) return ''
  const diff = new Date(editExpiresAt).getTime() - Date.now()
  if (diff <= 0) return 'wygasł'
  const mins = Math.floor(diff / 60_000)
  const secs = Math.floor((diff % 60_000) / 1000)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 1) + '…'
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

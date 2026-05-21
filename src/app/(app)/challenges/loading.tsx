import { Skeleton } from '@/components/ui/skeleton'

export default function ChallengesLoading() {
  return (
    <div className="page-container space-y-5">
      {/* Header */}
      <div className="sticky-header -mx-4 px-4 py-3 flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>

      {/* Search bar */}
      <Skeleton className="h-10 w-full rounded-xl" />

      {/* Tabs */}
      <Skeleton className="h-10 w-full rounded-xl" />

      {/* Challenge cards */}
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  )
}

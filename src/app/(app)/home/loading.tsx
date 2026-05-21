import { Skeleton } from '@/components/ui/skeleton'

export default function HomeLoading() {
  return (
    <div className="page-container space-y-5">
      {/* Header */}
      <div className="sticky-header -mx-4 px-4 py-3 flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-40" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      {/* Today's step card */}
      <Skeleton className="h-32 w-full" />

      {/* Section heading */}
      <Skeleton className="h-5 w-36" />

      {/* Challenge cards */}
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  )
}

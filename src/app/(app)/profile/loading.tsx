import { Skeleton } from '@/components/ui/skeleton'

export default function ProfileLoading() {
  return (
    <div className="page-container space-y-5">
      {/* Header */}
      <div className="sticky-header -mx-4 px-4 py-3">
        <Skeleton className="h-7 w-32" />
      </div>

      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-3 pt-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>

      {/* Achievements */}
      <Skeleton className="h-5 w-32" />
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  )
}

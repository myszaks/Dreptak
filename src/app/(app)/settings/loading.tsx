import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className="page-container space-y-5">
      {/* Header */}
      <div className="sticky-header -mx-4 px-4 py-3">
        <Skeleton className="h-7 w-28" />
      </div>

      {/* Settings sections */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ))}
    </div>
  )
}

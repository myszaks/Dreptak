import { Skeleton } from '@/components/ui/skeleton'

export default function AppLoading() {
  return (
    <div className="page-container space-y-5">
      <div className="sticky-header -mx-4 px-4 py-3">
        <Skeleton className="h-7 w-48" />
      </div>
      <Skeleton className="h-40 w-full" />
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  )
}

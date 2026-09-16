import { Skeleton } from '@/components/ui/skeleton'

/**
 * Layout-matched loading placeholders.
 *
 * These are deliberately shaped like the content that replaces them. A centred
 * spinner tells the user "something is happening somewhere"; a skeleton that
 * mirrors the real layout tells them "your three stat tiles are arriving here",
 * which measurably reduces how slow a page *feels* even when the network time
 * is identical. It also eliminates the layout shift that happens when a spinner
 * collapses and real content pushes everything down.
 */

export function PageHeaderSkeleton() {
  return (
    <div className="flex items-start gap-4">
      <Skeleton className="hidden h-12 w-12 rounded-2xl sm:block" />
      <div className="space-y-2.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="surface flex items-center gap-4 p-5">
      <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-16" />
      </div>
    </div>
  )
}

export function StatRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="surface space-y-4 p-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="surface flex items-center gap-4 p-4">
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="surface space-y-4 p-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3.5 w-64" />
      </div>
      <Skeleton className="w-full rounded-xl" style={{ height }} />
    </div>
  )
}

/** Full-page shell used by the route-level `loading.tsx` files. */
export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      <PageHeaderSkeleton />
      <StatRowSkeleton />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
      </div>
    </div>
  )
}

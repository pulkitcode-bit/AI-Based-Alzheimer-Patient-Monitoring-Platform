import {
  ChartSkeleton,
  PageHeaderSkeleton,
  StatRowSkeleton,
} from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      <PageHeaderSkeleton />
      <StatRowSkeleton />
      <ChartSkeleton />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartSkeleton height={220} />
        <ChartSkeleton height={220} />
      </div>
    </div>
  )
}

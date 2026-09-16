import { CardGridSkeleton, PageHeaderSkeleton } from '@/components/shared/skeletons'

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      <PageHeaderSkeleton />
      <CardGridSkeleton count={6} />
    </div>
  )
}

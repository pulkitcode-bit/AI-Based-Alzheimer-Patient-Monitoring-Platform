import { DashboardSkeleton } from '@/components/shared/skeletons'

/**
 * Streamed instantly by Next while the patient route segment resolves, so the
 * chrome (sidebar, header) stays painted and only the content area swaps.
 */
export default function Loading() {
  return <DashboardSkeleton />
}

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Accent ramps come from the design tokens rather than raw Tailwind palette
 * colours, so every tint stays consistent and dark mode is handled for free.
 */
const TONES = {
  primary: 'bg-primary-soft text-primary-muted',
  info: 'bg-info-soft text-info-strong',
  success: 'bg-success-soft text-success-strong',
  warning: 'bg-warning-soft text-warning-strong',
  ai: 'bg-ai-soft text-ai-strong',
} as const

export type StatTone = keyof typeof TONES

interface StatCardProps {
  label: string
  value: React.ReactNode
  /** Small qualifier under the value, e.g. "across 12 sessions". */
  hint?: string
  icon: LucideIcon
  tone?: StatTone
  loading?: boolean
  className?: string
}

/**
 * A single metric tile. The value is rendered in the display face at a large
 * size because these numbers are the thing patients and clinicians scan for
 * first — everything else on the tile is supporting context.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'primary',
  loading = false,
  className,
}: StatCardProps) {
  return (
    <div className={cn('surface flex items-center gap-4 p-5', className)}>
      <span
        aria-hidden
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
          TONES[tone],
        )}
      >
        <Icon className="h-6 w-6" />
      </span>

      <div className="min-w-0 space-y-0.5">
        <p className="eyebrow">{label}</p>
        {loading ? (
          <Skeleton className="mt-1 h-8 w-20" />
        ) : (
          <p className="font-display text-2xl font-bold leading-none text-foreground">
            {value}
          </p>
        )}
        {hint && !loading && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
    </div>
  )
}

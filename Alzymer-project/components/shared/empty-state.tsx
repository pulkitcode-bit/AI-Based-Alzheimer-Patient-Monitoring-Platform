import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  /** `error` swaps the tint to the destructive ramp for failure states. */
  tone?: 'neutral' | 'error'
  className?: string
}

/**
 * Shown whenever a list has nothing in it or a fetch failed.
 *
 * The copy convention across the product is: say plainly what is missing, then
 * give one obvious next step. Never leave a patient staring at a blank panel
 * wondering whether the app is broken or they simply have no data yet.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = 'neutral',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-10 text-center',
        tone === 'error'
          ? 'border-destructive/30 bg-destructive-soft/40'
          : 'border-border bg-card',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-2xl',
          tone === 'error'
            ? 'bg-destructive-soft text-destructive-strong'
            : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="h-7 w-7" />
      </span>

      <div className="space-y-1">
        <p className="font-display text-lg font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  )
}

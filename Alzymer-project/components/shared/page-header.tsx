import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  /** Small uppercase label above the title, e.g. "Care team" or a date. */
  eyebrow?: React.ReactNode
  title: string
  description?: string
  icon?: LucideIcon
  /** Buttons or controls pinned to the right on desktop. */
  actions?: React.ReactNode
  className?: string
}

/**
 * The single page-title treatment used across every screen.
 *
 * Before this existed each page hand-rolled its own heading block with slightly
 * different sizes and spacing, so no two screens lined up. Centralising it means
 * a change to the product's title rhythm is one edit, not seventeen.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 md:flex-row md:items-start md:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-4 min-w-0">
        {Icon && (
          <span
            aria-hidden
            className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-muted"
          >
            <Icon className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0 space-y-1.5">
          {eyebrow && <div className="eyebrow flex items-center gap-2">{eyebrow}</div>}
          <h1 className="text-3xl md:text-4xl">{title}</h1>
          {description && (
            <p className="max-w-2xl text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}

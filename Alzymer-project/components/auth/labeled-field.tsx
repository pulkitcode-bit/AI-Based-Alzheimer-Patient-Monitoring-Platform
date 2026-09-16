'use client'

import { useId } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface LabeledFieldProps extends Omit<React.ComponentProps<typeof Input>, 'id'> {
  label: string
  icon: LucideIcon
  error?: string
  hint?: string
  id?: string
}

/**
 * Icon-prefixed input with a label, hint, and error slot.
 *
 * Every auth form previously repeated this exact markup by hand — and every
 * copy had the same accessibility gap: the <label> had no `htmlFor`, so a
 * screen reader never announced it when the input received focus. `useId()`
 * gives each instance a stable, unique id and wires it up once, here, so the
 * fix applies everywhere this is used instead of needing sixteen separate edits.
 */
export function LabeledField({
  label,
  icon: Icon,
  error,
  hint,
  id,
  className,
  ...props
}: LabeledFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={inputId}
          className={cn('h-12 rounded-xl pl-12 text-base', className)}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          {...props}
        />
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs font-medium text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          className="mt-1 flex animate-in items-center gap-1 fade-in text-xs font-medium text-destructive-strong duration-150"
        >
          <AlertCircle className="h-3.5 w-3.5" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

'use client'

import { useId, useState } from 'react'
import { AlertCircle, Eye, EyeOff, Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface PasswordFieldProps extends Omit<React.ComponentProps<typeof Input>, 'id' | 'type'> {
  label: string
  error?: string
  hint?: string
  /** Shows a live strength meter beneath the field — only meaningful on a "new password" field, not a login field. */
  showStrength?: boolean
  id?: string
}

function scorePassword(pw: string) {
  if (!pw) return { score: 0, label: '', tone: 'muted' as const }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++

  const capped = Math.min(score, 4)
  const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'] as const
  const tones = ['destructive', 'destructive', 'warning', 'success', 'success'] as const
  return { score: capped, label: labels[capped], tone: tones[capped] }
}

const TONE_BAR: Record<string, string> = {
  destructive: 'bg-destructive',
  warning: 'bg-warning',
  success: 'bg-success',
  muted: 'bg-muted',
}

const TONE_TEXT: Record<string, string> = {
  destructive: 'text-destructive-strong',
  warning: 'text-warning-strong',
  success: 'text-success-strong',
  muted: 'text-muted-foreground',
}

/**
 * Password input with a show/hide toggle — none of this app's password
 * fields had one before, which is a small but real usability gap (typos in a
 * masked field are easy to make and hard to catch). `showStrength` adds a
 * four-segment meter for registration flows; a login field should never pass
 * it, since judging the strength of an existing password is meaningless.
 */
export function PasswordField({
  label,
  error,
  hint,
  showStrength,
  id,
  className,
  value,
  ...props
}: PasswordFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const [visible, setVisible] = useState(false)
  const strength = showStrength ? scorePassword(String(value ?? '')) : null

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      <div className="relative">
        <Lock
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={inputId}
          type={visible ? 'text' : 'password'}
          value={value}
          className={cn('h-12 rounded-xl pl-12 pr-12 text-base', className)}
          aria-invalid={!!error}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
        </button>
      </div>

      {strength && String(value ?? '').length > 0 && (
        <div className="flex items-center gap-2 pt-0.5">
          <div className="flex flex-1 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  i < strength.score ? TONE_BAR[strength.tone] : 'bg-muted',
                )}
              />
            ))}
          </div>
          <span className={cn('text-xs font-semibold', TONE_TEXT[strength.tone])}>{strength.label}</span>
        </div>
      )}

      {hint && !error && <p className="mt-1 text-xs font-medium text-muted-foreground">{hint}</p>}
      {error && (
        <p className="mt-1 flex animate-in items-center gap-1 fade-in text-xs font-medium text-destructive-strong duration-150">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

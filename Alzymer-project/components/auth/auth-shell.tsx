import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, Brain, Sparkles } from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

export interface AuthFeature {
  icon: LucideIcon
  title: string
  description: string
  tone?: 'primary' | 'success' | 'warning' | 'info' | 'ai'
}

const TONE_CLASS: Record<NonNullable<AuthFeature['tone']>, string> = {
  primary: 'bg-primary-soft text-primary-muted',
  success: 'bg-success-soft text-success-strong',
  warning: 'bg-warning-soft text-warning-strong',
  info: 'bg-info-soft text-info-strong',
  ai: 'bg-ai-soft text-ai-strong',
}

interface AuthShellProps {
  /** Icon shown in the badge above the form card's title. */
  formIcon: LucideIcon
  formTitle: string
  formDescription: string
  /** The form itself, plus any below-card links (sign-up / sign-in toggle). */
  children: React.ReactNode

  /** Right-hand branded panel — hidden below the lg breakpoint. */
  panelEyebrow: string
  panelHeadline: string
  panelDescription: string
  panelFeatures: AuthFeature[]
  panelQuote: { icon: LucideIcon; text: string }

  /** Registration forms are longer, so they get a wider form column. */
  wideForm?: boolean
}

/**
 * Shared chrome for every auth screen — patient login, doctor login, and
 * doctor registration were each independently repeating the same ~120 lines
 * (back-to-home header, decorative blobs, split-screen grid, branded right
 * panel with its SVG backdrop). One layout change previously meant editing
 * three files and hoping they stayed in sync; now it means editing one.
 */
export function AuthShell({
  formIcon: FormIcon,
  formTitle,
  formDescription,
  children,
  panelEyebrow,
  panelHeadline,
  panelDescription,
  panelFeatures,
  panelQuote,
  wideForm = false,
}: AuthShellProps) {
  const QuoteIcon = panelQuote.icon

  return (
    <div className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-full w-full max-w-7xl -translate-x-1/2 overflow-hidden"
      >
        <div className="absolute -top-24 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/12 blur-[100px]" />
        <div className="absolute bottom-10 right-10 h-[450px] w-[450px] rounded-full bg-warning/10 blur-[95px]" />
      </div>

      <header className="z-10 mx-auto flex w-full max-w-7xl items-center justify-between p-4 sm:p-6">
        <Link
          href={ROUTES.HOME}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to home
        </Link>

        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold transition-opacity hover:opacity-90">
          <span className="rounded-lg bg-primary-soft p-1.5 text-primary-muted">
            <Brain className="h-5 w-5" aria-hidden />
          </span>
          Neuro<span className="text-primary">Mind</span>
        </Link>
      </header>

      <main className="mx-auto my-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
        <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Form column */}
          <div
            className={cn(
              'mx-auto w-full max-w-md space-y-6 lg:mx-0 lg:max-w-none',
              wideForm ? 'lg:col-span-7' : 'lg:col-span-6 xl:col-span-5',
            )}
          >
            <div className="surface relative space-y-6 overflow-hidden p-7 shadow-soft-xl sm:p-9">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
              />

              <div className="space-y-3 text-center sm:text-left">
                <span className="inline-flex rounded-2xl bg-primary-soft p-3.5 text-primary-muted shadow-soft-xs">
                  <FormIcon className="h-7 w-7" aria-hidden />
                </span>
                <div className="space-y-1.5">
                  <h1 className="text-2xl sm:text-3xl">{formTitle}</h1>
                  <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {formDescription}
                  </p>
                </div>
              </div>

              {children}
            </div>
          </div>

          {/* Branded panel */}
          <div className={cn('hidden lg:block', wideForm ? 'lg:col-span-5' : 'lg:col-span-6 xl:col-span-7')}>
            <div className="relative space-y-7 overflow-hidden rounded-3xl border border-border/80 bg-linear-to-br from-card/80 via-primary/5 to-muted/40 p-8 shadow-soft-lg backdrop-blur-md sm:p-10">
              <div aria-hidden className="pointer-events-none absolute -bottom-6 -right-6 h-44 w-44 opacity-15">
                <svg viewBox="0 0 100 100" fill="none" className="h-full w-full text-primary">
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                  <circle cx="30" cy="30" r="6" fill="currentColor" />
                  <circle cx="70" cy="40" r="5" fill="currentColor" />
                  <circle cx="50" cy="70" r="7" fill="currentColor" />
                  <path d="M30 30 L70 40 L50 70 Z" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>

              <div className="max-w-lg space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary-muted">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  {panelEyebrow}
                </span>
                <h2 className="text-2xl sm:text-3xl">{panelHeadline}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {panelDescription}
                </p>
              </div>

              <div className="space-y-3.5 pt-1">
                {panelFeatures.map(({ icon: Icon, title, description, tone = 'primary' }) => (
                  <div
                    key={title}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/90 p-3.5 shadow-soft-xs"
                  >
                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', TONE_CLASS[tone])}>
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-3.5 rounded-2xl border border-primary/20 bg-primary-soft p-4">
                <QuoteIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <p className="text-xs leading-relaxed text-foreground sm:text-sm">{panelQuote.text}</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="z-10 p-4 text-center text-xs font-medium text-muted-foreground">
        &copy; {new Date().getFullYear()} NeuroMind. All rights reserved.
      </footer>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Root error boundary.
 *
 * Copy is written for a distressed, possibly confused reader: no stack traces,
 * no jargon, no blame. State plainly that the app (not the user) went wrong,
 * and offer exactly two actions. The technical digest is kept behind a details
 * element so it is available for support without dominating the page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Replace with a real reporter (Sentry etc.) when one is wired up.
    console.error('[NeuroMind] Unhandled error:', error)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="surface w-full max-w-md space-y-5 p-8 text-center">
        <span
          aria-hidden
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-warning-soft text-warning-strong"
        >
          <AlertTriangle className="h-8 w-8" />
        </span>

        <div className="space-y-2">
          <h1 className="text-2xl">Something went wrong on our side</h1>
          <p className="text-muted-foreground">
            This isn’t anything you did. Try loading the page again — if it keeps
            happening, head back to the dashboard and we’ll pick things up there.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Button onClick={reset} size="lg" className="flex-1 gap-2 rounded-xl">
            <RotateCw className="h-4 w-4" />
            Try again
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="flex-1 gap-2 rounded-xl"
          >
            <Link href="/">
              <Home className="h-4 w-4" />
              Go home
            </Link>
          </Button>
        </div>

        {error.digest && (
          <details className="pt-1 text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              Technical details
            </summary>
            <code className="mt-2 block break-all rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
              {error.digest}
            </code>
          </details>
        )}
      </div>
    </main>
  )
}

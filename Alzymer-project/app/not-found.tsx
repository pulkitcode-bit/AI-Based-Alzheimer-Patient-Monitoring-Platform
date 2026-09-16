import Link from 'next/link'
import { Compass, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="surface w-full max-w-md space-y-5 p-8 text-center">
        <span
          aria-hidden
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary-muted"
        >
          <Compass className="h-8 w-8" />
        </span>

        <div className="space-y-2">
          {/* No "404" as the headline — the number means nothing to most of the
              people using this product. Say what happened in plain words. */}
          <h1 className="text-2xl">We couldn’t find that page</h1>
          <p className="text-muted-foreground">
            The link may be out of date, or the page may have moved. Let’s get
            you back somewhere familiar.
          </p>
        </div>

        <Button asChild size="lg" className="w-full gap-2 rounded-xl">
          <Link href="/">
            <Home className="h-4 w-4" />
            Back to home
          </Link>
        </Button>
      </div>
    </main>
  )
}

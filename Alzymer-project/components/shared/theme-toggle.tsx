'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

/**
 * Light/dark switch.
 *
 * The dark palette already existed in globals.css but was never reachable —
 * next-themes was installed and the provider written, yet nothing mounted it
 * and nothing let a user flip it. This is that missing control.
 *
 * Dark mode matters more here than on a typical product: evening use is common
 * for this user base ("sundowning" restlessness peaks late in the day), and a
 * dim, low-glare interface is easier on tired eyes than a bright one.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // The server has no idea which theme the browser will resolve to, so render a
  // stable placeholder until hydration to avoid a mismatch and an icon flicker.
  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground
                 transition-colors hover:bg-muted hover:text-foreground active:scale-95"
    >
      {mounted ? (
        isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
      ) : (
        <span className="h-5 w-5" />
      )}
    </button>
  )
}

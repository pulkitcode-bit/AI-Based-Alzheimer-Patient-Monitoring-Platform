'use client'

import { useEffect, useState } from 'react'
import { Type, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const STORAGE_KEY = 'neuromind:text-scale'

const SIZES = [
  { label: 'Standard', scale: 1, sample: 'Aa' },
  { label: 'Large', scale: 1.15, sample: 'Aa' },
  { label: 'Larger', scale: 1.3, sample: 'Aa' },
  { label: 'Largest', scale: 1.5, sample: 'Aa' },
] as const

/**
 * In-app text scaling.
 *
 * Why this rather than telling people to use browser zoom: browser zoom scales
 * the layout as well as the text, which pushes sidebars and game boards off
 * screen and forces horizontal scrolling — actively harmful for a user who is
 * already struggling. This control only moves the `--text-scale` token, which
 * every font-size in the product derives from, so copy grows while the layout
 * grid stays put.
 *
 * The preference persists per-device in localStorage. It is intentionally not
 * synced to the server: a patient and their caregiver often share an account
 * but not a screen, and each needs their own comfortable size.
 */
export function TextSizeControl() {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    try {
      const stored = Number(localStorage.getItem(STORAGE_KEY))
      if (stored && stored >= 1 && stored <= 1.5) apply(stored)
    } catch {
      // Private browsing or blocked storage — fall back to the default size.
    }
  }, [])

  function apply(next: number) {
    setScale(next)
    document.documentElement.style.setProperty('--text-scale', String(next))
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // Non-fatal: the size still applies for this session.
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Change text size"
          title="Change text size"
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground
                     transition-colors hover:bg-muted hover:text-foreground active:scale-95"
        >
          <Type className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Text size</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SIZES.map((size) => (
          <DropdownMenuItem
            key={size.scale}
            onSelect={() => apply(size.scale)}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <span className="flex items-baseline gap-2.5">
              <span
                aria-hidden
                className="font-display font-semibold text-foreground"
                style={{ fontSize: `${size.scale}rem` }}
              >
                {size.sample}
              </span>
              <span>{size.label}</span>
            </span>
            {scale === size.scale && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

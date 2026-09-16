'use client'

import { useEffect, useState } from 'react'

export interface ChartColors {
  border: string
  muted: string
  primary: string
  ai: string
  success: string
  card: string
  series: string[]
}

const FALLBACK: ChartColors = {
  border: '#e5e0d8',
  muted: '#8a8578',
  primary: '#3d8f96',
  ai: '#8b5fbf',
  success: '#4f9d6e',
  card: '#ffffff',
  series: ['#3d8f96', '#4f9d6e', '#c98a2e', '#4a6fb5', '#8b5fbf'],
}

/**
 * Resolves design-token CSS custom properties to concrete color strings for
 * Recharts. Recharts renders to raw SVG attributes — passing a literal
 * `var(--color-primary)` string works inconsistently there (some internal
 * color computations, like legend swatches and gradients, don't re-resolve
 * custom properties), so this reads getComputedStyle once after mount and
 * hands back plain hex/oklch strings instead.
 *
 * `series` cycles the five curated chart tokens (--chart-1..5) for
 * multi-line/bar charts with an arbitrary number of categories, rather than
 * inventing a long list of ad-hoc hex colors that would drift from the rest
 * of the app's palette.
 */
export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(FALLBACK)

  useEffect(() => {
    const style = getComputedStyle(document.documentElement)
    const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback

    setColors({
      border: read('--border', FALLBACK.border),
      muted: read('--muted-foreground', FALLBACK.muted),
      primary: read('--primary', FALLBACK.primary),
      ai: read('--ai', FALLBACK.ai),
      success: read('--success', FALLBACK.success),
      card: read('--card', FALLBACK.card),
      series: [1, 2, 3, 4, 5].map((n) => read(`--chart-${n}`, FALLBACK.series[n - 1])),
    })
  }, [])

  return colors
}

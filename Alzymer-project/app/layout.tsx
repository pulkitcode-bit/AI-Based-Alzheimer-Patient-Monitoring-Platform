import type { Metadata, Viewport } from 'next'
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

/**
 * Body / UI typeface.
 *
 * Atkinson Hyperlegible Next was commissioned by the Braille Institute and
 * drawn specifically so that low-vision readers can tell confusable glyphs
 * apart — I vs l vs 1, O vs 0, rn vs m. Given that this product's primary
 * users are people living with Alzheimer's (a population with a high rate of
 * co-occurring visual impairment), legibility is a clinical requirement here,
 * not a stylistic preference.
 */
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ['latin'],
  variable: '--font-atkinson',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
})

/**
 * Display typeface for headings.
 *
 * Bricolage Grotesque carries warmth and a little personality, which keeps the
 * interface from reading as a clinical intake form. It is only ever used at
 * large sizes where its quirks aid recognition rather than hinder reading.
 */
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: {
    default: 'NeuroMind — Cognitive Care for Alzheimer’s Patients',
    template: '%s · NeuroMind',
  },
  description:
    'NeuroMind pairs adaptive cognitive exercises with clinician oversight — helping people living with Alzheimer’s train memory daily while their care team tracks real progress.',
  applicationName: 'NeuroMind',
  keywords: [
    'Alzheimer’s care',
    'cognitive training',
    'dementia support',
    'memory exercises',
    'patient monitoring',
  ],
  authors: [{ name: 'NeuroMind' }],
  openGraph: {
    title: 'NeuroMind — Cognitive Care for Alzheimer’s Patients',
    description:
      'Adaptive cognitive exercises with clinician oversight, built for people living with Alzheimer’s.',
    siteName: 'NeuroMind',
    type: 'website',
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8f4' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1d21' },
  ],
  width: 'device-width',
  initialScale: 1,
  // Deliberately NOT locking maximum-scale — pinch-zoom must stay available
  // for users who rely on it.
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${atkinson.variable} ${bricolage.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}

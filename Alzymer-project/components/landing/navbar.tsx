'use client'

import Link from 'next/link'
import { Brain, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/shared/theme-toggle'

const LINKS = [
  { href: '/doctor-login', label: 'Doctor login' },
  { href: '/doctor/register', label: 'Doctor register' },
]

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/85 shadow-soft-xs backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-display text-xl font-bold tracking-tight sm:text-2xl"
        >
          <span className="rounded-xl bg-primary-soft p-2 text-primary-muted shadow-soft-xs transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
            <Brain className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
          </span>
          <span>
            Neuro<span className="text-primary">Mind</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden items-center gap-1 sm:flex">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg px-3 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </div>

          <ThemeToggle />

          <Link href="/patient-login" className="hidden sm:block">
            <Button size="lg" className="h-11 rounded-xl px-6 font-semibold shadow-soft-sm sm:px-7">
              Patient login
            </Button>
          </Link>

          {/* Below the sm breakpoint the doctor links previously vanished with
              no replacement, leaving the site half-navigable on a phone. */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="sm:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="font-display">Menu</SheetTitle>
              <nav className="mt-6 flex flex-col gap-2">
                <Link href="/patient-login">
                  <Button size="lg" className="w-full rounded-xl font-semibold">
                    Patient login
                  </Button>
                </Link>
                {LINKS.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-xl px-3 py-3 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}

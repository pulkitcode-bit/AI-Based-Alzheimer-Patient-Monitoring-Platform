'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { Brain, ChevronRight, LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { TextSizeControl } from '@/components/shared/text-size-control'
import { getStoredEmail, signOut, type Role } from '@/lib/auth'
import { cn } from '@/lib/utils'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

interface AppShellProps {
  role: Role
  navItems: NavItem[]
  profileHref: string
  /** Label under the avatar, e.g. "Patient account". */
  accountLabel: string
  /** Rendered in the top bar, e.g. the notification bell. */
  headerSlot?: React.ReactNode
  children: React.ReactNode
}

/**
 * The application chrome shared by both the patient and doctor areas.
 *
 * These two layouts were previously separate files with 95% identical markup,
 * which is why their sidebars had already drifted apart (different avatar
 * colours, different active states). One component, two configs.
 *
 * Also fixes the two structural problems the old layouts had:
 *   1. Neither was usable below ~768px — the 256px sidebar simply ate the
 *      screen with no way to collapse it. There is now a proper drawer.
 *   2. Both blanked the whole page behind an auth spinner on every navigation.
 *      The shell now paints immediately; see `useAuthGuard`.
 */
export function AppShell({
  role,
  navItems,
  profileHref,
  accountLabel,
  headerSlot,
  children,
}: AppShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close the drawer whenever the route changes, otherwise it stays open over
  // the page the user just navigated to.
  useEffect(() => setMobileOpen(false), [pathname])

  return (
    <div className="flex min-h-screen bg-background">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:flex">
        <SidebarBody
          role={role}
          navItems={navItems}
          profileHref={profileHref}
          accountLabel={accountLabel}
          pathname={pathname}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/60 bg-background/85 px-4 backdrop-blur-md md:px-6">
          {/* Mobile drawer trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarBody
                role={role}
                navItems={navItems}
                profileHref={profileHref}
                accountLabel={accountLabel}
                pathname={pathname}
              />
            </SheetContent>
          </Sheet>

          <Link
            href="/"
            className="flex items-center gap-2 font-display text-lg font-bold text-primary md:hidden"
          >
            <Brain className="h-5 w-5" />
            NeuroMind
          </Link>

          <div className="ml-auto flex items-center gap-1">
            {headerSlot}
            <TextSizeControl />
            <ThemeToggle />
          </div>
        </header>

        <main id="main-content" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}

function SidebarBody({
  role,
  navItems,
  profileHref,
  accountLabel,
  pathname,
}: {
  role: Role
  navItems: NavItem[]
  profileHref: string
  accountLabel: string
  pathname: string
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')

  useEffect(() => setEmail(getStoredEmail(role)), [role])

  const initial = email ? email[0].toUpperCase() : role === 'patient' ? 'P' : 'D'

  return (
    <div className="flex h-full w-full flex-col p-5">
      <Link
        href="/"
        className="mb-7 flex items-center gap-2.5 px-1 font-display text-xl font-bold text-sidebar-primary"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
          <Brain className="h-5 w-5" />
        </span>
        NeuroMind
      </Link>

      <nav className="flex-1 space-y-1" aria-label="Main navigation">
        {navItems.map(({ label, href, icon: Icon }) => {
          // startsWith rather than equality so nested routes (e.g. a patient
          // detail page under /doctor/patients/12) keep the parent highlighted.
          const isActive = pathname === href || pathname.startsWith(`${href}/`)

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-3 font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-soft-sm'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="space-y-2.5 border-t border-sidebar-border/60 pt-4">
        <Link
          href={profileHref}
          className={cn(
            'group flex items-center gap-3 rounded-xl border p-2.5 transition-all',
            pathname === profileHref
              ? 'border-sidebar-primary/40 bg-sidebar-accent'
              : 'border-border/60 hover:border-sidebar-primary/30 hover:bg-sidebar-accent/50',
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-sidebar-foreground">
              {accountLabel}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {email || 'View profile'}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Button
          onClick={() => {
            signOut(role)
            router.push('/')
          }}
          variant="outline"
          className="w-full justify-center gap-2 rounded-xl"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}

'use client'

import {
  BarChart3,
  Calendar,
  Gamepad2,
  LayoutDashboard,
  User,
} from 'lucide-react'
import { AppShell, type NavItem } from '@/components/shared/app-shell'
import NotificationBell from '@/components/patient/notification-bell'
import FloatingChatWidget from '@/components/patient/floating-chat-widget'
import { DashboardSkeleton } from '@/components/shared/skeletons'
import { useAuthGuard } from '@/lib/auth'
import { ROUTES } from '@/lib/constants'

const NAV: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.PATIENT_DASHBOARD, icon: LayoutDashboard },
  { label: 'Games', href: ROUTES.PATIENT_GAMES, icon: Gamepad2 },
  { label: 'Progress', href: ROUTES.PATIENT_PROGRESS, icon: BarChart3 },
  { label: 'Appointments', href: ROUTES.PATIENT_APPOINTMENT, icon: Calendar },
  { label: 'Profile', href: ROUTES.PATIENT_PROFILE, icon: User },
]

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = useAuthGuard('patient')

  return (
    <AppShell
      role="patient"
      navItems={NAV}
      profileHref={ROUTES.PATIENT_PROFILE}
      accountLabel="Patient account"
      headerSlot={auth === 'authorised' ? <NotificationBell /> : null}
    >
      {/* The shell itself always paints. Only the content area waits on the
          auth check, and it waits behind a layout-shaped skeleton rather than
          a blank screen — so navigation no longer flashes white. */}
      {auth === 'authorised' ? children : <DashboardSkeleton />}
      {auth === 'authorised' && <FloatingChatWidget />}
    </AppShell>
  )
}

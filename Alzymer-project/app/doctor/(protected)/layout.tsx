'use client'

import { BarChart3, LayoutDashboard, User, Users } from 'lucide-react'
import { AppShell, type NavItem } from '@/components/shared/app-shell'
import { DashboardSkeleton } from '@/components/shared/skeletons'
import { useAuthGuard } from '@/lib/auth'
import { ROUTES } from '@/lib/constants'

const NAV: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.DOCTOR_DASHBOARD, icon: LayoutDashboard },
  { label: 'My Patients', href: ROUTES.DOCTOR_PATIENTS, icon: Users },
  { label: 'Analytics', href: ROUTES.DOCTOR_ANALYTICS, icon: BarChart3 },
  { label: 'Profile', href: ROUTES.DOCTOR_PROFILE, icon: User },
]

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = useAuthGuard('doctor')

  return (
    <AppShell
      role="doctor"
      navItems={NAV}
      profileHref={ROUTES.DOCTOR_PROFILE}
      accountLabel="Doctor account"
    >
      {auth === 'authorised' ? children : <DashboardSkeleton />}
    </AppShell>
  )
}

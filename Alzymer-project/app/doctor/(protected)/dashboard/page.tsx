'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  LayoutDashboard,
  TrendingUp,
  UserX,
  Users,
} from 'lucide-react'
import { ROUTES } from '@/lib/constants'
import { api } from '@/lib/api'
import { getStoredId } from '@/lib/auth'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { EmptyState } from '@/components/shared/empty-state'
import { StatRowSkeleton, ListSkeleton } from '@/components/shared/skeletons'

interface DashboardStats {
  totalPatients: number
  avgCompletion: number
  avgImprovement: number
}

interface PatientSummary {
  id: string
  name: string
  lastActive: string
  score: number
}

interface Appointment {
  id: string | number
  patientId: string | number
  patientName: string
  doctorName: string
  date: string
  time: string
  type: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  notes?: string
}

export default function DoctorDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    avgCompletion: 0,
    avgImprovement: 0,
  })
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState<string | number | null>(null)
  const [error, setError] = useState<string>()
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(undefined)

    const doctorId = getStoredId('doctor')
    if (!doctorId) {
      router.push(ROUTES.DOCTOR_LOGIN)
      return
    }

    // Patients, analytics and appointments are three independent resources —
    // the previous version awaited them one after another, so the page took
    // the sum of three round trips before anything rendered. Promise.all runs
    // them concurrently; the page now waits only as long as the slowest call.
    // A single genuine failure here (unlike the patient dashboard) should
    // surface as a real error rather than partial data, since a doctor acting
    // on an incomplete patient list is a safety concern, not a cosmetic one.
    Promise.all([
      api.getDoctorPatients(doctorId),
      api.getDoctorAnalytics(doctorId),
      api.getDoctorAppointments(doctorId),
    ])
      .then(([patientsData, analyticsData, appointmentsData]: [any, any, any]) => {
        if (cancelled) return
        setPatients(patientsData.patients ?? (Array.isArray(patientsData) ? patientsData : []))
        setStats({
          totalPatients: analyticsData.totalPatients ?? 0,
          avgCompletion: analyticsData.avgCompletion ?? 0,
          avgImprovement: analyticsData.avgImprovement ?? 0,
        })
        setAppointments(Array.isArray(appointmentsData) ? appointmentsData : [])
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || 'Could not load the dashboard. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [router, retryCount])

  const handleRetry = useCallback(() => setRetryCount((n) => n + 1), [])

  const handleUpdateStatus = useCallback(
    async (id: string | number, status: 'approved' | 'rejected') => {
      setIsActionLoading(id)
      const previous = appointments
      // Optimistic update — the doctor sees the request move out of the
      // pending list immediately instead of waiting on the round trip.
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
      try {
        await api.updateAppointmentStatus(id.toString(), status)
      } catch (err: any) {
        setAppointments(previous)
        setError(err.message || `Could not ${status === 'approved' ? 'approve' : 'reject'} the appointment.`)
      } finally {
        setIsActionLoading(null)
      }
    },
    [appointments],
  )

  const pending = appointments.filter((a) => a.status === 'pending')

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      <PageHeader
        title="Dashboard"
        description="Welcome back — here’s an overview of your patients and their care."
        icon={LayoutDashboard}
      />

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive-soft p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
            <p className="text-sm text-destructive-strong">{error}</p>
          </div>
          <button
            onClick={handleRetry}
            className="shrink-0 text-xs font-semibold text-destructive-strong underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Stats ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <StatRowSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Active patients"
            value={stats.totalPatients}
            hint="Under your active care"
            icon={Users}
            tone="primary"
          />
          <StatCard
            label="Avg. game completion"
            value={`${stats.avgCompletion}%`}
            hint="Across all patients"
            icon={CheckCircle2}
            tone="success"
          />
          <StatCard
            label="Avg. improvement"
            value={`+${stats.avgImprovement}%`}
            hint="Overall gain this month"
            icon={TrendingUp}
            tone="warning"
          />
        </div>
      )}

      {/* ── Appointment requests ────────────────────────────────────── */}
      <section className="surface p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl">Appointment requests</h2>
            <p className="text-sm text-muted-foreground">Manage upcoming patient appointments</p>
          </div>
          {!isLoading && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-warning/20 bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning-strong">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {pending.length} pending
            </span>
          )}
        </div>

        {isLoading ? (
          <ListSkeleton count={2} />
        ) : pending.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No pending requests"
            description="All appointment requests have been handled. New booking requests will appear here."
          />
        ) : (
          <div className="space-y-3">
            {pending.map((apt) => (
              <div
                key={apt.id}
                className="flex flex-col justify-between gap-4 rounded-xl border border-border p-4 transition-colors hover:border-primary/25 md:flex-row md:items-center"
              >
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">
                      {apt.patientName || `Patient #${apt.patientId}`}
                    </p>
                    <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary-muted">
                      {apt.type}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" aria-hidden />
                      {apt.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {apt.time}
                    </span>
                  </div>
                  {apt.notes && (
                    <p className="mt-1 rounded-lg border border-border/40 bg-muted/50 p-2 text-sm italic text-muted-foreground">
                      “{apt.notes}”
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive/20 font-medium text-destructive hover:bg-destructive-soft"
                    onClick={() => handleUpdateStatus(apt.id, 'rejected')}
                    disabled={isActionLoading === apt.id}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="font-semibold"
                    onClick={() => handleUpdateStatus(apt.id, 'approved')}
                    disabled={isActionLoading === apt.id}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Recent patients ─────────────────────────────────────────── */}
      <section className="surface p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl">Recent patients</h2>
            <p className="text-sm text-muted-foreground">Your patients and their latest activity</p>
          </div>
          <Link href={ROUTES.DOCTOR_PATIENTS}>
            <Button variant="outline" size="sm" className="gap-1.5 font-semibold">
              View all
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <ListSkeleton count={4} />
        ) : patients.length === 0 ? (
          <EmptyState
            icon={UserX}
            title="No patients yet"
            description="No patient records are currently assigned to your account."
          />
        ) : (
          <div className="space-y-2.5">
            {patients.map((patient) => {
              const initials = patient.name
                ? patient.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                : 'P'

              return (
                <div
                  key={patient.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/doctor/patients/${patient.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') router.push(`/doctor/patients/${patient.id}`)
                  }}
                  className="group flex cursor-pointer items-center justify-between rounded-xl border border-border p-4 transition-all hover:border-primary/30 hover:bg-accent/40"
                >
                  <div className="flex flex-1 items-center gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-muted transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      {initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground transition-colors group-hover:text-primary">
                        {patient.name}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" aria-hidden />
                        Last active: {patient.lastActive}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-display text-lg font-extrabold text-primary">{patient.score}</p>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Score
                      </p>
                    </div>
                    <ChevronRight
                      className="h-5 w-5 text-muted-foreground/50 transition-all group-hover:translate-x-1 group-hover:text-primary"
                      aria-hidden
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

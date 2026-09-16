'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  Award,
  Brain,
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  Flame,
  Gamepad2,
  Info,
  Play,
  Sparkles,
  Star,
  Stethoscope,
  Target,
  Timer,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import { api } from '@/lib/api'
import { getStoredEmail, getStoredId } from '@/lib/auth'
import { ROUTES } from '@/lib/constants'
import { StatCard } from '@/components/shared/stat-card'
import { EmptyState } from '@/components/shared/empty-state'
import { ListSkeleton } from '@/components/shared/skeletons'
import { Skeleton } from '@/components/ui/skeleton'
import ScheduledRemindersCard from '@/components/patient/scheduled-reminders-card'

interface Doctor {
  id: number
  fullName: string
  specialization?: string
  hospitalName?: string
  yearsOfExperience?: string
  email?: string
}

interface Recommendation {
  recommended_activity: string
  difficulty: string
  category: string
  reason: string
  suggested_duration_minutes: number
  confidence: number
  caregiver_alert: boolean
}

interface PatientStats {
  totalGames: number
  averageScore: number
  currentStreak: number
}

const QUICK_ACTIONS = [
  {
    icon: Gamepad2,
    title: 'Play games',
    description: 'Work on your memory with fun cognitive exercises',
    href: ROUTES.PATIENT_GAMES,
    tone: 'bg-primary-soft text-primary-muted',
  },
  {
    icon: TrendingUp,
    title: 'View progress',
    description: 'See how you have been improving over time',
    href: ROUTES.PATIENT_PROGRESS,
    tone: 'bg-success-soft text-success-strong',
  },
  {
    icon: Calendar,
    title: 'Book an appointment',
    description: 'Schedule a visit with your doctor',
    href: ROUTES.PATIENT_APPOINTMENT,
    tone: 'bg-info-soft text-info-strong',
  },
] as const

const TIPS = [
  'Play consistently — even 10 to 15 minutes a day helps maintain cognitive focus.',
  'Don’t worry about perfect scores. The games adapt to give you the right challenge.',
  'Share your progress with your doctor so they can tailor your care plan.',
]

export default function PatientDashboard() {
  const router = useRouter()
  const [primaryDoctor, setPrimaryDoctor] = useState<Doctor | null>(null)
  const [otherDoctors, setOtherDoctors] = useState<Doctor[]>([])
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [stats, setStats] = useState<PatientStats | null>(null)

  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [loadingRecs, setLoadingRecs] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [doctorError, setDoctorError] = useState<string>()

  const [patientName, setPatientName] = useState('there')

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  useEffect(() => {
    const patientId = getStoredId('patient')
    const email = getStoredEmail('patient')

    if (email) {
      const namePart = email.split('@')[0]
      setPatientName(namePart.charAt(0).toUpperCase() + namePart.slice(1))
    }

    if (!patientId) {
      router.push(ROUTES.PATIENT_LOGIN)
      return
    }

    // ── Why Promise.allSettled and not three sequential awaits ──────────────
    // The previous version awaited doctors, then stats, then recommendations
    // one after another, so the page took the SUM of three round trips before
    // it finished painting. These three calls are completely independent, so
    // they now run concurrently and the page takes the time of the SLOWEST one.
    //
    // allSettled rather than all: the recommendations call hops through Spring
    // Boot to a separate Flask service, and if that service is down we still
    // want the doctor card and the stat tiles to render. With Promise.all a
    // single rejection would blank all three.
    let cancelled = false

    Promise.allSettled([
      api.getDoctorsForPatient(patientId),
      api.getPatientStats(patientId),
      api.getRecommendations(patientId),
    ]).then(([doctorsResult, statsResult, recsResult]) => {
      if (cancelled) return

      if (doctorsResult.status === 'fulfilled') {
        setPrimaryDoctor(doctorsResult.value.primaryDoctor)
        setOtherDoctors(doctorsResult.value.otherDoctors ?? [])
      } else {
        setDoctorError('We couldn’t load your care team just now.')
      }
      setLoadingDoctors(false)

      if (statsResult.status === 'fulfilled' && statsResult.value) {
        const s = statsResult.value as any
        setStats({
          totalGames: s.totalGames ?? 0,
          averageScore: s.averageScore ?? 0,
          currentStreak: s.currentStreak ?? 0,
        })
      }
      setLoadingStats(false)

      if (recsResult.status === 'fulfilled' && recsResult.value && !recsResult.value.error) {
        setRecommendation(recsResult.value)
      }
      setLoadingRecs(false)
    })

    // Guards against setting state after the user navigates away mid-flight.
    return () => {
      cancelled = true
    }
  }, [router])

  const bookWith = useCallback(
    (doctor: Doctor) => {
      router.push(
        `${ROUTES.PATIENT_APPOINTMENT}?doctorId=${doctor.id}&doctorName=${encodeURIComponent(
          `Dr. ${doctor.fullName}`,
        )}`,
      )
    },
    [router],
  )

  const makePrimary = useCallback(
    async (doctor: Doctor) => {
      const patientId = getStoredId('patient')
      if (!patientId) return

      const previousPrimary = primaryDoctor

      // Optimistic swap so the card updates the instant it is tapped; the
      // network round trip happens behind the already-updated UI.
      setPrimaryDoctor(doctor)
      setOtherDoctors((prev) => {
        const without = prev.filter((d) => d.id !== doctor.id)
        return previousPrimary ? [previousPrimary, ...without] : without
      })

      try {
        await api.setPrimaryDoctor(patientId, doctor.id)
      } catch {
        // Roll back to exactly what was on screen before.
        setPrimaryDoctor(previousPrimary)
        setOtherDoctors((prev) => [doctor, ...prev.filter((d) => d.id !== doctor.id)])
      }
    },
    [primaryDoctor],
  )

  const streak = stats?.currentStreak ?? 0

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      {/* ── Greeting ───────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5">
          <div className="eyebrow flex items-center gap-2">
            <span>{today}</span>
            {streak > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-1 font-bold text-warning-strong">
                  <Flame className="h-3.5 w-3.5" />
                  {streak} day streak
                </span>
              </>
            )}
          </div>
          <h1>Welcome back, {patientName}</h1>
          <p className="text-muted-foreground">
            Keep up with your cognitive training and stay connected with your care team.
          </p>
        </div>

        {streak > 0 && (
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-warning/25 bg-warning-soft px-4 py-3">
            <Award className="h-8 w-8 shrink-0 text-warning" aria-hidden />
            <div>
              <p className="eyebrow text-warning-strong">Active streak</p>
              <p className="text-sm font-bold text-foreground">
                {streak} day{streak > 1 ? 's' : ''} in a row
              </p>
            </div>
          </div>
        )}
      </header>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total games"
          value={stats?.totalGames ?? 0}
          icon={Gamepad2}
          tone="primary"
          loading={loadingStats}
        />
        <StatCard
          label="Current streak"
          value={`${streak} ${streak === 1 ? 'day' : 'days'}`}
          icon={Flame}
          tone="warning"
          loading={loadingStats}
        />
        <StatCard
          label="Average score"
          value={stats?.averageScore ?? 0}
          icon={Target}
          tone="success"
          loading={loadingStats}
        />
      </div>

      {/* ── Primary call to action ─────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-between gap-6 overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-soft-lg md:flex-row md:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-white/10 blur-2xl"
        />

        <div className="relative flex items-center gap-5">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15">
            <Brain className="h-8 w-8" aria-hidden />
          </span>
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Daily brain exercise
            </span>
            <h2 className="text-2xl text-primary-foreground md:text-3xl">
              Ready to challenge your memory?
            </h2>
            <p className="max-w-xl text-sm text-primary-foreground/85">
              Keep your mind sharp with interactive activities tailored to you.
            </p>
          </div>
        </div>

        <Link
          href={ROUTES.PATIENT_GAMES}
          className="relative flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-card px-6 py-3.5 font-bold text-primary shadow-soft-md transition-transform hover:scale-[1.03] active:scale-95 md:w-auto"
        >
          <Play className="h-5 w-5 fill-current" aria-hidden />
          Play a game now
        </Link>
      </section>

      {/* ── Your reminders ─────────────────────────────────────────────── */}
      <ScheduledRemindersCard />

      {/* ── Primary doctor ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl">
          <UserCheck className="h-5 w-5 text-info" aria-hidden />
          Your primary doctor
        </h2>

        {loadingDoctors ? (
          <Skeleton className="h-28 w-full rounded-2xl" />
        ) : doctorError ? (
          <EmptyState
            icon={AlertCircle}
            tone="error"
            title="Care team unavailable"
            description={doctorError}
          />
        ) : primaryDoctor ? (
          <div className="surface flex flex-col justify-between gap-5 border-info/25 p-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-info text-2xl font-bold text-info-foreground">
                {primaryDoctor.fullName.charAt(0)}
              </span>
              <div className="space-y-1.5">
                <p className="font-display text-xl font-bold">Dr. {primaryDoctor.fullName}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                  {primaryDoctor.specialization && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-info-soft px-2.5 py-0.5 font-medium text-info-strong">
                      <Star className="h-3.5 w-3.5" aria-hidden />
                      {primaryDoctor.specialization}
                    </span>
                  )}
                  {primaryDoctor.hospitalName && (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" aria-hidden />
                      {primaryDoctor.hospitalName}
                    </span>
                  )}
                  {primaryDoctor.yearsOfExperience && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {primaryDoctor.yearsOfExperience} yrs experience
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => bookWith(primaryDoctor)}
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-info px-5 py-3 text-sm font-semibold text-info-foreground transition-all hover:shadow-soft-md active:scale-95"
            >
              <Calendar className="h-4 w-4" aria-hidden />
              Book appointment
            </button>
          </div>
        ) : (
          <EmptyState
            icon={Stethoscope}
            title="No primary doctor yet"
            description="Choose a doctor to oversee your care and review your progress."
            action={
              <Link
                href={ROUTES.PATIENT_SELECT_DOCTOR}
                className="inline-flex items-center gap-1 text-sm font-semibold text-info-strong hover:underline"
              >
                Choose a doctor <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            }
          />
        )}
      </section>

      {/* ── AI recommendation ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xl">
            <Brain className="h-5 w-5 text-ai" aria-hidden />
            Recommended for you
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ai/25 bg-ai-soft px-3 py-1 text-xs font-semibold text-ai-strong">
            <Sparkles className="h-3 w-3" aria-hidden />
            Personalised
          </span>
        </div>

        {loadingRecs ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        ) : recommendation ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="surface flex flex-col justify-between gap-4 border-ai/20 bg-ai-soft/40 p-6">
              <div className="flex items-start gap-4">
                <span className="flex shrink-0 items-center justify-center rounded-2xl bg-ai-soft p-3.5 text-ai-strong">
                  <Gamepad2 className="h-7 w-7" aria-hidden />
                </span>
                <div className="space-y-2">
                  <div>
                    <h3 className="text-xl">{recommendation.recommended_activity}</h3>
                    <p className="eyebrow mt-0.5 text-ai-strong">
                      {recommendation.category} · {recommendation.difficulty} difficulty
                    </p>
                  </div>
                  <div className="flex items-center gap-4 pt-1 text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Timer className="h-4 w-4 text-ai" aria-hidden />
                      {recommendation.suggested_duration_minutes} mins
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 text-warning" aria-hidden />
                      {Math.round(recommendation.confidence * 100)}% match
                    </span>
                  </div>
                </div>
              </div>

              <Link
                href={ROUTES.PATIENT_GAMES}
                className="inline-flex w-fit items-center gap-2 rounded-xl bg-ai px-4 py-2.5 text-sm font-semibold text-ai-foreground transition-all hover:shadow-soft-md active:scale-95"
              >
                Start activity
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>

            <div className="surface flex flex-col justify-center gap-3 p-6">
              <p className="eyebrow flex items-center gap-2 text-ai-strong">
                <Info className="h-4 w-4" aria-hidden />
                Why this activity
              </p>
              <p className="leading-relaxed text-foreground">{recommendation.reason}</p>
              {recommendation.caregiver_alert && (
                <p className="flex items-center gap-2 rounded-xl border border-destructive/25 bg-destructive-soft px-3 py-2.5 text-xs font-semibold text-destructive-strong">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                  Flagged for caregiver review.
                </p>
              )}
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Brain}
            title="No recommendation right now"
            description="Play a few activities and we’ll start tailoring suggestions to you."
          />
        )}
      </section>

      {/* ── Other doctors ──────────────────────────────────────────────── */}
      {loadingDoctors ? (
        <ListSkeleton count={2} />
      ) : (
        otherDoctors.length > 0 && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-muted-foreground" aria-hidden />
              Other available doctors
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {otherDoctors.map((doctor) => (
                <div key={doctor.id} className="surface flex items-start gap-3 p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-lg font-bold">
                    {doctor.fullName.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">Dr. {doctor.fullName}</p>
                    {doctor.specialization && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {doctor.specialization}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => bookWith(doctor)}
                        className="flex items-center gap-1 rounded-lg bg-info-soft px-3 py-1.5 text-xs font-medium text-info-strong transition-colors hover:bg-info/20"
                      >
                        <Calendar className="h-3.5 w-3.5" aria-hidden />
                        Book
                      </button>
                      <button
                        onClick={() => makePrimary(doctor)}
                        className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70"
                      >
                        <UserCheck className="h-3.5 w-3.5" aria-hidden />
                        Set as primary
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      )}

      {/* ── Quick actions ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xl">Quick actions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {QUICK_ACTIONS.map(({ icon: Icon, title, description, href, tone }) => (
            <Link key={href} href={href} className="surface-interactive group flex items-start gap-4 p-5">
              <span className={`shrink-0 rounded-xl p-3 ${tone}`}>
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block font-display font-bold text-foreground">{title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {description}
                </span>
              </span>
              <ArrowRight
                className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </section>

      {/* ── Tips ───────────────────────────────────────────────────────── */}
      <section className="surface space-y-3 bg-primary-soft/40 p-6">
        <h3 className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden />
          Tips for better cognitive health
        </h3>
        <div className="grid grid-cols-1 gap-4 pt-1 md:grid-cols-3">
          {TIPS.map((tip) => (
            <div
              key={tip}
              className="flex items-start gap-3 rounded-xl border border-border/50 bg-card/70 p-3.5"
            >
              <span
                aria-hidden
                className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary"
              />
              <p className="text-sm leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bell,
  Loader2,
  MoonStar,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { api } from '@/lib/api'
import { getStoredId } from '@/lib/auth'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { EmptyState } from '@/components/shared/empty-state'
import { ChartSkeleton, ListSkeleton, StatRowSkeleton } from '@/components/shared/skeletons'
import { cn } from '@/lib/utils'

interface AnalyticsData {
  totalPatients: number
  activeUsers: number
  averageScore: number
  improvementTrend: number
  gameCompletionData: any[]
  scoreProgressData: any[]
  gameTypeData: any[]
}

interface DeclineAlert {
  patientId: number
  patientName: string
  declinePercent: number
  thisWeekAvg: number
  prevWeekAvg: number
}

interface InactivePatient {
  patientId: number
  patientName: string
  lastPlayedDate: string | null
  daysSinceLastPlayed: number | null
}

const RANGE_OPTIONS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
] as const

// Resolved once on the client and reused for every chart — recharts reads
// plain strings, not live CSS custom properties, so these are captured after
// mount rather than passed as var(--x) which Recharts cannot resolve itself.
function useChartColors() {
  const [colors, setColors] = useState({
    border: '#e5e0d8',
    muted: '#8a8578',
    primary: '#3d8f96',
    ai: '#8b5fbf',
    card: '#ffffff',
  })

  useEffect(() => {
    const style = getComputedStyle(document.documentElement)
    const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
    setColors((prev) => ({
      border: read('--border', prev.border),
      muted: read('--muted-foreground', prev.muted),
      primary: read('--primary', prev.primary),
      ai: read('--ai', prev.ai),
      card: read('--card', prev.card),
    }))
  }, [])

  return colors
}

export default function AnalyticsPage() {
  const router = useRouter()
  const colors = useChartColors()

  const [data, setData] = useState<AnalyticsData | null>(null)
  const [alerts, setAlerts] = useState<DeclineAlert[]>([])
  const [inactive, setInactive] = useState<InactivePatient[]>([])

  const [rangeDays, setRangeDays] = useState<number>(30)
  const [isLoadingCharts, setIsLoadingCharts] = useState(true)
  const [isLoadingSide, setIsLoadingSide] = useState(true)
  const [error, setError] = useState<string>()
  const [nudgingId, setNudgingId] = useState<number | null>(null)

  const doctorId = getStoredId('doctor')

  // Alerts and inactivity aren't windowed by date range, so they only need to
  // load once — only the chart data re-fetches when the range selector changes.
  useEffect(() => {
    if (!doctorId) {
      router.push(ROUTES.DOCTOR_LOGIN)
      return
    }

    Promise.allSettled([api.getDoctorDeclineAlerts(doctorId), api.getDoctorInactivePatients(doctorId, 3)])
      .then(([alertsResult, inactiveResult]) => {
        if (alertsResult.status === 'fulfilled') setAlerts(alertsResult.value)
        if (inactiveResult.status === 'fulfilled') setInactive(inactiveResult.value)
      })
      .finally(() => setIsLoadingSide(false))
    // Only ever needs to run once per doctor session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!doctorId) return

    setIsLoadingCharts(true)
    api
      .getDoctorAnalytics(doctorId, rangeDays)
      .then((res: any) => {
        setData(res)
        setError(undefined)
      })
      .catch((err: any) => setError(err.message || 'Could not load analytics.'))
      .finally(() => setIsLoadingCharts(false))
  }, [doctorId, rangeDays])

  const sendNudge = useCallback(
    async (patientId: number, message: string) => {
      if (!doctorId) return
      setNudgingId(patientId)
      try {
        await api.sendReminder(String(patientId), message, doctorId)
        toast.success('Reminder sent')
      } catch (err: any) {
        toast.error(err.message || 'Could not send the reminder.')
      } finally {
        setNudgingId(null)
      }
    },
    [doctorId],
  )

  const tooltipStyle = {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: '12px',
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      <PageHeader
        title="Analytics"
        description="Aggregate statistics and trends across your patients."
        icon={BarChart3}
        actions={
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setRangeDays(opt.days)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  rangeDays === opt.days
                    ? 'bg-primary text-primary-foreground shadow-soft-xs'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive-soft p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
          <p className="text-sm text-destructive-strong">{error}</p>
        </div>
      )}

      {/* ── Key metrics ──────────────────────────────────────────────── */}
      {isLoadingCharts ? (
        <StatRowSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total patients" value={data?.totalPatients ?? 0} icon={Users} tone="primary" />
          <StatCard
            label="Active users"
            value={data?.activeUsers ?? 0}
            icon={Users}
            tone="info"
            hint="Assigned to your care"
          />
          <StatCard label="Average score" value={data?.averageScore ?? 0} icon={Target} tone="ai" />
          <StatCard
            label="Improvement trend"
            value={`${(data?.improvementTrend ?? 0) > 0 ? '+' : ''}${data?.improvementTrend ?? 0}%`}
            hint="This week vs last week"
            icon={(data?.improvementTrend ?? 0) >= 0 ? TrendingUp : TrendingDown}
            tone={(data?.improvementTrend ?? 0) >= 0 ? 'success' : 'warning'}
          />
        </div>
      )}

      {/* ── Patients needing attention ──────────────────────────────── */}
      <section className="surface p-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" aria-hidden />
          <h2 className="text-xl">Patients needing attention</h2>
        </div>

        {isLoadingSide ? (
          <ListSkeleton count={2} />
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No concerning trends"
            description="No patient's weekly average has dropped 20% or more. This list updates automatically."
          />
        ) : (
          <div className="space-y-2.5">
            {alerts.map((a) => (
              <div
                key={a.patientId}
                className="flex flex-col justify-between gap-3 rounded-xl border border-warning/20 bg-warning-soft/40 p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <Link
                    href={`/doctor/patients/${a.patientId}`}
                    className="font-semibold text-foreground hover:text-primary hover:underline"
                  >
                    {a.patientName}
                  </Link>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    <span className="font-semibold text-destructive-strong">
                      −{a.declinePercent}%
                    </span>{' '}
                    this week ({a.prevWeekAvg} → {a.thisWeekAvg} avg score)
                  </p>
                </div>
                <button
                  onClick={() =>
                    sendNudge(
                      a.patientId,
                      "We noticed your recent scores dipped a little — no worries at all. Let's check in soon.",
                    )
                  }
                  disabled={nudgingId === a.patientId}
                  className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-warning px-3 py-1.5 text-xs font-semibold text-warning-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {nudgingId === a.patientId ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Bell className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Send reminder
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Not played recently ─────────────────────────────────────── */}
      <section className="surface p-6">
        <div className="mb-4 flex items-center gap-2">
          <MoonStar className="h-5 w-5 text-info" aria-hidden />
          <h2 className="text-xl">Not played recently</h2>
        </div>

        {isLoadingSide ? (
          <ListSkeleton count={2} />
        ) : inactive.length === 0 ? (
          <EmptyState
            icon={MoonStar}
            title="Everyone's active"
            description="All of your patients have played within the last 3 days."
          />
        ) : (
          <div className="space-y-2.5">
            {inactive.map((p) => (
              <div
                key={p.patientId}
                className="flex flex-col justify-between gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <Link
                    href={`/doctor/patients/${p.patientId}`}
                    className="font-semibold text-foreground hover:text-primary hover:underline"
                  >
                    {p.patientName}
                  </Link>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {p.daysSinceLastPlayed == null
                      ? 'Has never played an activity'
                      : `Last played ${p.daysSinceLastPlayed} day${p.daysSinceLastPlayed === 1 ? '' : 's'} ago`}
                  </p>
                </div>
                <button
                  onClick={() =>
                    sendNudge(
                      p.patientId,
                      'We miss seeing you! Come back and play a quick game whenever you have a few minutes today.',
                    )
                  }
                  disabled={nudgingId === p.patientId}
                  className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-info-soft px-3 py-1.5 text-xs font-semibold text-info-strong transition-colors hover:bg-info/20 disabled:opacity-60"
                >
                  {nudgingId === p.patientId ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Bell className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Nudge
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Trend charts ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {isLoadingCharts ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : (
          <>
            <div className="surface p-6">
              <h2 className="text-xl">Game completions</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Games completed by all patients, last {rangeDays} days
              </p>
              {data?.gameCompletionData?.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.gameCompletionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                    <XAxis dataKey="date" stroke={colors.muted} fontSize={12} />
                    <YAxis stroke={colors.muted} fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="completed" fill={colors.primary} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title="No activity yet"
                  description="Once patients start playing, completions will show up here."
                  className="border-0 bg-transparent"
                />
              )}
            </div>

            <div className="surface p-6">
              <h2 className="text-xl">Average score progression</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Patient scores across the selected range
              </p>
              {data?.scoreProgressData?.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.scoreProgressData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                    <XAxis dataKey="week" stroke={colors.muted} fontSize={12} />
                    <YAxis stroke={colors.muted} fontSize={12} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="avgScore"
                      stroke={colors.ai}
                      strokeWidth={2.5}
                      dot={{ fill: colors.ai, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={TrendingUp}
                  title="Not enough data yet"
                  description="Score trends appear once patients have a few weeks of sessions."
                  className="border-0 bg-transparent"
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Game distribution ────────────────────────────────────────── */}
      <div className="surface p-6">
        <h2 className="text-xl">Game distribution</h2>
        <p className="mb-4 text-sm text-muted-foreground">Which games are played most frequently</p>

        {isLoadingCharts ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : data?.gameTypeData?.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {data.gameTypeData.map((game, i) => (
              <div key={i} className="rounded-xl bg-muted/50 p-5 text-center">
                <p className="mb-1.5 truncate text-sm text-muted-foreground" title={game.name}>
                  {game.name}
                </p>
                <p className="font-display text-3xl font-bold text-primary">{game.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">sessions</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No game data yet"
            description="Distribution appears once your patients start playing activities."
            className="border-0 bg-transparent"
          />
        )}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { AlertCircle, ChevronDown, ChevronUp, Flame, Gamepad2, Sparkles, Target } from 'lucide-react'
import { api } from '@/lib/api'
import { getStoredId } from '@/lib/auth'
import { ROUTES } from '@/lib/constants'
import { useChartColors } from '@/lib/use-chart-colors'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { EmptyState } from '@/components/shared/empty-state'
import { ChartSkeleton, PageHeaderSkeleton, StatRowSkeleton } from '@/components/shared/skeletons'

const INITIAL_VISIBLE_COUNT = 5

// Every domain is listed even when a patient hasn't played anything in it
// yet — a radar chart with a "hole" is far more informative than one that
// silently omits an axis, since the gap itself is the signal (this domain
// needs attention, or simply hasn't been tried).
const ALL_DOMAINS = [
  'Processing Speed',
  'Executive Function',
  'Attention & Inhibition',
  'Working Memory',
  'Visuospatial Memory',
  'Language',
]

interface GameSession {
  id: string
  gameType: string
  score: number
  date: string
  time: number
  moves?: number
}

interface ProgressStats {
  totalGames: number
  averageScore: number
  currentStreak: number
  scoreHistory: Array<Record<string, any>>
  gameDistribution: any[]
  recentSessions: GameSession[]
}

export default function ProgressPage() {
  const router = useRouter()
  const chartColors = useChartColors()
  const [data, setData] = useState<ProgressStats | null>(null)
  const [domainScores, setDomainScores] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT)

  useEffect(() => {
    const patientId = getStoredId('patient')
    if (!patientId) {
      router.push(ROUTES.PATIENT_LOGIN)
      return
    }

    Promise.all([
      api.getPatientHistory(patientId),
      api.getPatientStats(patientId),
      api.getPatientDomainScores(patientId),
    ])
      .then(([historyData, statsData, domains]: [any, any, any]) => {
        setData({
          totalGames: statsData.totalGames || 0,
          averageScore: statsData.averageScore || 0,
          currentStreak: statsData.currentStreak || 0,
          scoreHistory: historyData.scoreHistory || [],
          gameDistribution: historyData.gameDistribution || [],
          recentSessions: historyData.recentSessions || [],
        })
        setDomainScores(domains || {})
      })
      .catch((err: any) => setError(err.message || 'Failed to load progress data'))
      .finally(() => setIsLoading(false))
  }, [router])

  const distinctGameNames = Array.from(
    new Set((data?.scoreHistory || []).flatMap((entry) => Object.keys(entry).filter((key) => key !== 'date'))),
  )

  const radarData = ALL_DOMAINS.map((domain) => ({
    domain,
    score: domainScores[domain] ?? 0,
    played: domain in domainScores,
  }))
  const hasAnyDomainData = Object.keys(domainScores).length > 0

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
        <PageHeaderSkeleton />
        <StatRowSkeleton />
        <ChartSkeleton height={360} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      <PageHeader
        title="Your progress"
        description="Track your improvement and view game activity over time."
        icon={Target}
      />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive-soft p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
          <p className="text-sm text-destructive-strong">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total games played" value={data?.totalGames ?? 0} icon={Gamepad2} tone="primary" />
        <StatCard label="Average score" value={data?.averageScore ?? 0} icon={Target} tone="success" />
        <StatCard
          label="Current streak"
          value={`${data?.currentStreak ?? 0} ${data?.currentStreak === 1 ? 'day' : 'days'}`}
          icon={Flame}
          tone="warning"
        />
      </div>

      {/* ── Domain profile — the clinically meaningful view: 6 cognitive
          domains rather than 10 separate per-game lines, so a doctor (or the
          patient) can see at a glance where performance is genuinely weak. ── */}
      <Card className="surface">
        <CardHeader className="pb-2">
          <h2 className="text-xl">Cognitive domain profile</h2>
          <p className="text-sm text-muted-foreground">Your average score across each cognitive domain</p>
        </CardHeader>
        <CardContent className="px-2 pb-6 pt-2 sm:px-6">
          {hasAnyDomainData ? (
            <ResponsiveContainer width="100%" height={360}>
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke={chartColors.border} />
                <PolarAngleAxis dataKey="domain" tick={{ fill: chartColors.muted, fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: chartColors.muted, fontSize: 10 }} />
                <Radar
                  name="Average score"
                  dataKey="score"
                  stroke={chartColors.primary}
                  fill={chartColors.primary}
                  fillOpacity={0.35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartColors.card,
                    border: `1px solid ${chartColors.border}`,
                    borderRadius: '12px',
                  }}
                  formatter={(value: number, _name, entry: any) =>
                    entry?.payload?.played ? [value, 'Average score'] : ['Not played yet', 'Average score']
                  }
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={Target}
              title="No domain data yet"
              description="Play a few activities across different cognitive domains and your profile will appear here."
              className="border-0 bg-transparent"
            />
          )}
        </CardContent>
      </Card>

      {/* ── Per-game score trend — kept alongside the domain view, since a
          doctor may still want the finer-grained per-activity history. ── */}
      <Card className="surface">
        <CardHeader className="pb-2">
          <h2 className="text-xl">Score progress over time</h2>
          <p className="text-sm text-muted-foreground">Your game scores across distinct activity types</p>
        </CardHeader>
        <CardContent className="px-2 pb-6 pt-2 sm:px-6">
          {distinctGameNames.length > 0 ? (
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={data?.scoreHistory || []} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} opacity={0.6} />
                <XAxis dataKey="date" stroke={chartColors.muted} fontSize={12} tickLine={false} />
                <YAxis stroke={chartColors.muted} fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartColors.card,
                    border: `1px solid ${chartColors.border}`,
                    borderRadius: '12px',
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: 16, fontSize: 13 }} />
                {distinctGameNames.map((gameName, index) => (
                  <Line
                    key={gameName}
                    type="monotone"
                    dataKey={gameName}
                    stroke={chartColors.series[index % chartColors.series.length]}
                    strokeWidth={2.5}
                    name={gameName}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No score history yet"
              description="Play a few activities and your score trend will appear here."
              className="border-0 bg-transparent"
            />
          )}
        </CardContent>
      </Card>

      <Card className="surface">
        <CardHeader className="pb-2">
          <h2 className="text-xl">Game sessions completed</h2>
          <p className="text-sm text-muted-foreground">Total number of completed sessions by game type</p>
        </CardHeader>
        <CardContent className="px-2 pb-6 pt-2 sm:px-6">
          {(data?.gameDistribution?.length ?? 0) > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.gameDistribution || []} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} opacity={0.6} />
                <XAxis dataKey="game" stroke={chartColors.muted} fontSize={12} tickLine={false} />
                <YAxis stroke={chartColors.muted} fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: chartColors.card,
                    border: `1px solid ${chartColors.border}`,
                    borderRadius: '12px',
                  }}
                />
                <Bar dataKey="sessions" fill={chartColors.primary} radius={[8, 8, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              icon={Gamepad2}
              title="No sessions yet"
              description="Completed activities will be tallied here by game type."
              className="border-0 bg-transparent"
            />
          )}
        </CardContent>
      </Card>

      <Card className="surface">
        <CardHeader className="pb-2">
          <h2 className="text-xl">Recent game sessions</h2>
          <p className="text-sm text-muted-foreground">Detailed record of your recent gameplay performance</p>
        </CardHeader>
        <CardContent>
          {data?.recentSessions && data.recentSessions.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-border/60">
                <table className="w-full text-left">
                  <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3.5">Game</th>
                      <th className="px-5 py-3.5">Score</th>
                      <th className="px-5 py-3.5">Time</th>
                      <th className="px-5 py-3.5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.recentSessions.slice(0, visibleCount).map((session, index) => (
                      <tr key={`${session.id}-${index}`} className="transition-colors hover:bg-muted/30">
                        <td className="px-5 py-3.5 text-base font-medium capitalize text-foreground">{session.gameType}</td>
                        <td className="px-5 py-3.5 text-base font-bold text-primary">{session.score}</td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">{session.time}s</td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">
                          {new Date(session.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.recentSessions.length > INITIAL_VISIBLE_COUNT && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setVisibleCount((prev) =>
                        prev < data.recentSessions.length
                          ? Math.min(prev + 5, data.recentSessions.length)
                          : INITIAL_VISIBLE_COUNT,
                      )
                    }
                    className="flex items-center gap-2 rounded-xl font-semibold"
                  >
                    {visibleCount < data.recentSessions.length ? (
                      <>
                        Show more
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      </>
                    ) : (
                      <>
                        Show less
                        <ChevronUp className="h-4 w-4" aria-hidden />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <EmptyState icon={Gamepad2} title="No game sessions recorded yet" className="border-0 bg-transparent" />
          )}
        </CardContent>
      </Card>

      <Card className="surface bg-primary-soft/40">
        <CardHeader className="pb-2">
          <h3 className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
            Keep up the great practice!
          </h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground sm:text-base">
            Consistent practice helps build cognitive resilience. Every game you play supports your progress.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

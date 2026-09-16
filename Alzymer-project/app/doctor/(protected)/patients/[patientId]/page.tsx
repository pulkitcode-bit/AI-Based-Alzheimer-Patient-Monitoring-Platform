'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Award,
  TrendingUp,
  Gamepad2,
  Send,
  AlertCircle,
  Clock,
  Loader2,
  CheckCircle2
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { api } from '@/lib/api'
import { ROUTES } from '@/lib/constants'
import { useChartColors } from '@/lib/use-chart-colors'

interface PatientDetails {
  id: string | number
  name: string
  email: string
  phone?: string
  diagnosis?: string
  status?: string
  createdAt?: string
  latestScore: number
  totalGames: number
  improvementTrend: number
}

interface GameSessionItem {
  id: number
  gameType: string
  score: number
  time: number
  date: string
}

export default function PatientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const patientId = params.patientId as string
  const chartColors = useChartColors()

  const [patient, setPatient] = useState<PatientDetails | null>(null)
  const [history, setHistory] = useState<GameSessionItem[]>([])
  const [scoreChartData, setScoreChartData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  // Send Reminder state
  const [reminderMessage, setReminderMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string>()
  const [sendSuccess, setSendSuccess] = useState(false)

  useEffect(() => {
    if (!patientId) return

    const loadData = async () => {
      setIsLoading(true)
      setError(undefined)

      try {
        const doctorId = localStorage.getItem('doctor_id')
        if (!doctorId) {
          router.push(ROUTES.DOCTOR_LOGIN)
          return
        }

        // 1. Fetch patient details
        const detailsData: any = await api.getPatientDetails(patientId)
        setPatient(detailsData)

        // 2. Fetch full patient history (merged game_scores & game_sessions)
        const historyData: any = await api.getPatientHistory(patientId)
        if (historyData) {
          const sessions: GameSessionItem[] = historyData.recentSessions || []
          setHistory(sessions)

          // Process score trend for line chart (sorted chronologically for chart)
          if (historyData.scoreHistory && Array.isArray(historyData.scoreHistory)) {
            setScoreChartData(historyData.scoreHistory)
          } else if (sessions.length > 0) {
            // Build fallback score trend from sessions
            const chartPoints = [...sessions]
              .reverse()
              .map((s, idx) => ({
                index: idx + 1,
                date: s.date ? new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `Game ${idx + 1}`,
                score: s.score,
                game: s.gameType
              }))
            setScoreChartData(chartPoints)
          }
        }
      } catch (err: any) {
        console.error('[PatientDetailPage] Error loading patient details:', err)
        setError(err.message || 'Failed to load patient details.')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [patientId, router])

  const handleSendReminder = async () => {
    if (!reminderMessage.trim() || !patientId) return

    setIsSending(true)
    setSendError(undefined)
    setSendSuccess(false)

    try {
      const doctorId = localStorage.getItem('doctor_id') || undefined
      await api.sendReminder(patientId, reminderMessage.trim(), doctorId)
      setSendSuccess(true)
      setReminderMessage('')
      setTimeout(() => setSendSuccess(false), 4000)
    } catch (err: any) {
      setSendError(err.message || 'Failed to send reminder')
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}m ${secs}s`
    }
    return `${secs}s`
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading patient details...</p>
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="p-8 space-y-6">
        <Link href={ROUTES.DOCTOR_DASHBOARD}>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error || 'Patient not found'}</p>
        </div>
      </div>
    )
  }

  const joinedFormatted = patient.createdAt
    ? new Date(patient.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A'

  return (
    <div className="p-8 space-y-8">
      {/* ── Top Header Navigation ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={ROUTES.DOCTOR_DASHBOARD}>
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">{patient.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                patient.status === 'active' || !patient.status
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {(patient.status || 'Active').toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Patient Profile & Activity Tracking</p>
          </div>
        </div>

        <Link href={ROUTES.DOCTOR_DASHBOARD}>
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* ── Patient Info Header Card ───────────────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Email</p>
                <p className="font-semibold text-foreground text-sm truncate">{patient.email || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Phone</p>
                <p className="font-semibold text-foreground text-sm">{patient.phone || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Joined Date</p>
                <p className="font-semibold text-foreground text-sm">{joinedFormatted}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Diagnosis</p>
                <p className="font-semibold text-foreground text-sm">{patient.diagnosis || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Performance Summary Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              Latest Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{patient.latestScore}</div>
            <p className="text-xs text-muted-foreground mt-1">Average score across recent sessions</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-blue-500" />
              Total Games Played
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{patient.totalGames}</div>
            <p className="text-xs text-muted-foreground mt-1">Total completed game sessions</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Improvement Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${patient.improvementTrend >= 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
              {patient.improvementTrend >= 0 ? '+' : ''}{patient.improvementTrend}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Performance trajectory over time</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Score Over Time Line Chart ──────────────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Score Progression Over Time
          </CardTitle>
          <CardDescription>Track performance trends for {patient.name}</CardDescription>
        </CardHeader>
        <CardContent>
          {scoreChartData.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No score history available for chart visualization yet.
            </div>
          ) : (() => {
            // scoreHistory arrives wide-format — one column per game type per
            // date, e.g. {date, "Memory Match": 85, "Word Recall": 72} — never
            // a literal "score"/"avgScore"/"value" field. The previous version
            // looked for exactly those field names, found none, and silently
            // plotted a line with no data. This instead draws one line per
            // whatever fields are actually present, same approach the
            // patient-facing progress page already uses correctly.
            const distinctSeries = Array.from(
              new Set(
                scoreChartData.flatMap((entry) =>
                  Object.keys(entry).filter((key) => !['date', 'index', 'game'].includes(key)),
                ),
              ),
            )

            return (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={scoreChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} />
                  <XAxis dataKey="date" stroke={chartColors.muted} fontSize={12} />
                  <YAxis stroke={chartColors.muted} fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartColors.card,
                      border: `1px solid ${chartColors.border}`,
                      borderRadius: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  {distinctSeries.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      name={name}
                      stroke={chartColors.series[i % chartColors.series.length]}
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )
          })()}
        </CardContent>
      </Card>

      {/* ── Full Game History Table ────────────────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-primary" />
                Full Game History
              </CardTitle>
              <CardDescription>Complete list of all completed sessions merged from legacy scores and new sessions</CardDescription>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-muted text-muted-foreground rounded-full">
              {history.length} {history.length === 1 ? 'Session' : 'Sessions'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No game sessions recorded yet for this patient.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Game Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Score</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Time Spent</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((session, index) => (
                    <tr key={`${session.id}-${index}`} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground text-base flex items-center gap-2">
                        <Gamepad2 className="w-4 h-4 text-primary shrink-0" />
                        {session.gameType}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-primary text-base">{session.score}</span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatTime(session.time)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-sm">
                        {session.date ? new Date(session.date).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Send Reminder Section ──────────────────────────────────────── */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="w-5 h-5 text-amber-500" />
            Send Reminder to {patient.name}
          </CardTitle>
          <CardDescription>Compose and send a reminder message directly to the patient's dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sendError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{sendError}</span>
            </div>
          )}

          {sendSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Reminder sent successfully to patient!</span>
            </div>
          )}

          <textarea
            placeholder="Write a message or reminder for the patient (e.g. 'Please complete your memory activity today')..."
            value={reminderMessage}
            onChange={(e) => setReminderMessage(e.target.value)}
            className="w-full p-4 rounded-xl border border-border bg-background text-foreground text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-y"
          />

          <div className="flex justify-end">
            <Button
              onClick={handleSendReminder}
              disabled={!reminderMessage.trim() || isSending}
              className="h-11 px-6 text-sm font-semibold"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending Reminder...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Reminder
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

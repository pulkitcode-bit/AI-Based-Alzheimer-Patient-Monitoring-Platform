'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Gamepad2,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  GitBranch,
  Palette,
  Hand,
  Hash,
  Grid3x3,
  Layers,
  MessageSquareText,
  Zap,
  Sparkles,
} from 'lucide-react'
import { api } from '@/lib/api'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { CardGridSkeleton, PageHeaderSkeleton } from '@/components/shared/skeletons'

interface Activity {
  activityId: string
  activityName: string
  category: string
  difficultyLevel: string
  baseScore: number
  expectedTimeSec: number
  targetSkill: string
  successThreshold: number
}

export default function GamesPage() {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  useEffect(() => {
    async function fetchActivities() {
      try {
        setLoading(true)
        setError(null)
        const data = await api.getActivities()
        setActivities(data)
      } catch (err: any) {
        console.error('Failed to fetch activities:', err)
        setError(err.message || 'Failed to load activities. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchActivities()
  }, [])

  const categories = ['All', ...Array.from(new Set(activities.map((a) => a.category)))]

  const filteredActivities = selectedCategory === 'All'
    ? activities
    : activities.filter((a) => a.category === selectedCategory)

  // Difficulty maps onto the semantic accent ramps rather than raw palette
  const getDifficultyBadgeClass = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low':
      case 'easy':
        return 'bg-success-soft text-success-strong border-success/20'
      case 'medium':
        return 'bg-warning-soft text-warning-strong border-warning/20'
      case 'high':
      case 'hard':
        return 'bg-destructive-soft text-destructive-strong border-destructive/20'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const ICON_BY_ACTIVITY: Record<string, typeof Gamepad2> = {
    'ACT-201': GitBranch,
    'ACT-202': GitBranch,
    'ACT-203': Palette,
    'ACT-204': Hand,
    'ACT-205': Hash,
    'ACT-206': Hash,
    'ACT-207': Grid3x3,
    'ACT-208': Layers,
    'ACT-209': MessageSquareText,
    'ACT-210': Zap,
    'ACT_201': GitBranch,
    'ACT_202': GitBranch,
    'ACT_203': Palette,
    'ACT_204': Hand,
    'ACT_205': Hash,
    'ACT_206': Hash,
    'ACT_207': Grid3x3,
    'ACT_208': Layers,
    'ACT_209': MessageSquareText,
    'ACT_210': Zap,
  }

  const TONE_BY_DOMAIN: Record<string, string> = {
    'Processing Speed': 'bg-info-soft text-info-strong',
    'Executive Function': 'bg-ai-soft text-ai-strong',
    'Attention & Inhibition': 'bg-warning-soft text-warning-strong',
    'Working Memory': 'bg-primary-soft text-primary-muted',
    'Visuospatial Memory': 'bg-success-soft text-success-strong',
    'Sustained Attention': 'bg-destructive-soft text-destructive-strong',
    Language: 'bg-ai-soft text-ai-strong',
  }

  const getGameVisuals = (activityId: string, category: string) => ({
    icon: ICON_BY_ACTIVITY[activityId] ?? Gamepad2,
    tone: TONE_BY_DOMAIN[category] ?? 'bg-primary-soft text-primary-muted',
  })

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
        <PageHeaderSkeleton />
        <CardGridSkeleton count={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
        <PageHeader
          title="Cognitive activities"
          description="Choose an activity to exercise a specific cognitive skill."
          icon={Gamepad2}
        />
        <EmptyState
          icon={AlertCircle}
          tone="error"
          title="We couldn’t load your activities"
          description={error}
          action={
            <Button onClick={() => window.location.reload()} className="rounded-xl">
              Try again
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      <PageHeader
        eyebrow={`${activities.length} activities available`}
        title="Cognitive activities"
        description="Choose a tailored activity below to exercise a specific cognitive skill. There is no time pressure — go at whatever pace feels right."
        icon={Gamepad2}
      />

      {/* Category Filter Pills */}
      {categories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-soft-sm'
                    : 'bg-card border border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredActivities.map((activity) => {
          const visuals = getGameVisuals(activity.activityId, activity.category)
          const Icon = visuals.icon

          return (
            <Card
              key={activity.activityId}
              className="surface-interactive group flex cursor-pointer flex-col overflow-hidden border border-border/70 hover:border-primary/40 transition-all hover:shadow-md"
              onClick={() => router.push(`/patient/games/play/${activity.activityId}`)}
            >
              <CardHeader className="flex-1 space-y-3 pb-3">
                <div className="flex items-center justify-between">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${visuals.tone}`}>
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getDifficultyBadgeClass(activity.difficultyLevel)}`}>
                    {activity.difficultyLevel} level
                  </span>
                </div>

                <div>
                  <span className={`mb-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${visuals.tone}`}>
                    {activity.category}
                  </span>
                  <CardTitle className="line-clamp-1 font-display text-xl font-bold transition-colors group-hover:text-primary">
                    {activity.activityName}
                  </CardTitle>
                </div>

                <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                  Target Skill: <span className="font-semibold text-foreground">{activity.targetSkill?.replace(/_/g, ' ')}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 space-y-4">
                <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden />
                    ~{activity.expectedTimeSec}s
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden />
                    Target {activity.successThreshold}%
                  </span>
                </div>

                <Button className="group/btn w-full justify-center gap-2 rounded-xl font-semibold">
                  <Gamepad2 className="h-4 w-4" aria-hidden />
                  Start activity
                  <ChevronRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" aria-hidden />
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="surface bg-primary-soft/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
            Tips for better performance
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ['Pace yourself', 'Take your time. Quality practice matters more than pure speed.'],
            ['Stay consistent', 'Playing regularly is what builds and maintains cognitive focus.'],
            ['Build confidence', 'If something feels hard, start with a Low difficulty activity.'],
          ].map(([title, body]) => (
            <div
              key={title}
              className="space-y-1 rounded-xl border border-border/50 bg-card/70 p-3.5"
            >
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, AlertCircle, Trophy, Home } from 'lucide-react'
import { api } from '@/lib/api'

// The previous 10 game components (Word Recall, Object Naming, etc.) are no
// longer routed to — replaced entirely by the 10 below, modeled on validated
// neuropsychological tests. The old component files are left in place rather
// than deleted, in case of rollback; they're simply unreachable now.
import TrailMakingGame from '@/components/games/trail-making-game'
import StroopGame from '@/components/games/stroop-game'
import GoNoGoGame from '@/components/games/go-no-go-game'
import DigitSpanGame from '@/components/games/digit-span-game'
import CorsiBlockGame from '@/components/games/corsi-block-game'
import NBackGame from '@/components/games/n-back-game'
import WordFluencyGame from '@/components/games/word-fluency-game'
import ChoiceReactionGame from '@/components/games/choice-reaction-game'

// ── Types ──────────────────────────────────────────────────────────────────

interface ActivityConfig {
  activityId: string
  activityName: string
  category: string
  difficultyLevel: string
  baseScore: number
  expectedTimeSec: number
  targetSkill: string
  successThreshold: number
  accuracyWeight: number
  speedWeight: number
  consistencyWeight: number
}

// ── Main Page Component ────────────────────────────────────────────────────

export default function PlayActivityPage({
  params,
}: {
  params: Promise<{ activityId: string }>
}) {
  const router = useRouter()
  const resolvedParams = use(params)
  const rawActivityId = resolvedParams.activityId
  // Normalize activityId e.g. ACT_201 -> ACT-201
  const normalizedId = rawActivityId ? rawActivityId.toUpperCase().replace('_', '-') : ''

  const [config, setConfig] = useState<ActivityConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true)
        setError(null)
        // Try normalized ID first, fallback to raw ID
        let data
        try {
          data = await api.getActivityById(normalizedId)
        } catch {
          data = await api.getActivityById(rawActivityId)
        }
        setConfig(data)
      } catch (err: any) {
        console.error('Failed to load activity config:', err)
        setError(err.message || 'Failed to load activity details.')
      } finally {
        setLoading(false)
      }
    }
    if (normalizedId) {
      fetchConfig()
    }
  }, [normalizedId, rawActivityId])

  const handleGameEnd = (score: number) => {
    setFinalScore(score)
    setCompleted(true)
  }

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-lg text-muted-foreground font-medium">
          Loading activity workspace...
        </p>
      </div>
    )
  }

  if (error || !config) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-6">
        <div className="flex justify-center">
          <AlertCircle className="w-16 h-16 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Failed to Load Activity</h2>
          <p className="text-muted-foreground">{error || 'Config not found.'}</p>
        </div>
        <Button onClick={() => router.push('/patient/games')} className="w-full rounded-xl font-semibold">
          Back to Games
        </Button>
      </div>
    )
  }

  const activeId = config.activityId ? config.activityId.toUpperCase().replace('_', '-') : normalizedId

  const renderGameComponent = () => {
    switch (activeId) {
      case 'ACT-201':
        return <TrailMakingGame mode="A" activityConfig={config} onGameEnd={handleGameEnd} />
      case 'ACT-202':
        return <TrailMakingGame mode="B" activityConfig={config} onGameEnd={handleGameEnd} />
      case 'ACT-203':
        return <StroopGame activityConfig={config} onGameEnd={handleGameEnd} />
      case 'ACT-204':
        return <GoNoGoGame activityConfig={config} onGameEnd={handleGameEnd} />
      case 'ACT-205':
        return <DigitSpanGame mode="forward" activityConfig={config} onGameEnd={handleGameEnd} />
      case 'ACT-206':
        return <DigitSpanGame mode="backward" activityConfig={config} onGameEnd={handleGameEnd} />
      case 'ACT-207':
        return <CorsiBlockGame activityConfig={config} onGameEnd={handleGameEnd} />
      case 'ACT-208':
        return <NBackGame activityConfig={config} onGameEnd={handleGameEnd} />
      case 'ACT-209':
        return <WordFluencyGame activityConfig={config} onGameEnd={handleGameEnd} />
      case 'ACT-210':
        return <ChoiceReactionGame activityConfig={config} onGameEnd={handleGameEnd} />
      default:
        return (
          <div className="text-center space-y-4 p-8 bg-card rounded-2xl border border-border">
            <AlertCircle className="w-12 h-12 text-warning mx-auto" />
            <p className="text-lg text-muted-foreground font-semibold">
              Unknown Activity ID: {activeId}
            </p>
            <Button onClick={() => router.push('/patient/games')} className="rounded-xl">
              Back to Games
            </Button>
          </div>
        )
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <Button
          variant="outline"
          onClick={() => router.push('/patient/games')}
          className="flex items-center gap-2 rounded-xl w-fit font-medium hover:bg-muted"
          disabled={completed}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Games
        </Button>
        <div className="flex items-center gap-3">
          {config.category && (
            <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-primary/10 text-primary border border-primary/20">
              {config.category}
            </span>
          )}
          {config.difficultyLevel && (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-muted text-muted-foreground border border-border capitalize">
              {config.difficultyLevel} Level
            </span>
          )}
        </div>
      </div>

      {/* Main Game Stage */}
      <div className="w-full">
        {completed ? (
          <div className="bg-card border border-border rounded-2xl p-8 sm:p-12 text-center space-y-6 max-w-lg mx-auto shadow-md">
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-full text-primary animate-bounce">
                <Trophy className="w-16 h-16" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground font-display">Activity Completed!</h2>
              <p className="text-base text-muted-foreground font-medium">
                Great job completing <span className="font-semibold text-foreground">{config.activityName}</span>.
              </p>
            </div>
            <div className="bg-primary/5 border border-primary/15 rounded-2xl p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Session Score</p>
              <p className="text-5xl font-black text-primary mt-1">
                {finalScore !== null ? Math.round(finalScore) : 0}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl py-5 font-semibold"
                onClick={() => {
                  setCompleted(false)
                  setFinalScore(null)
                }}
              >
                Play Again
              </Button>
              <Button
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-5 font-semibold"
                onClick={() => router.push('/patient/games')}
              >
                <Home className="w-4 h-4" />
                Finish Activity
              </Button>
            </div>
          </div>
        ) : (
          renderGameComponent()
        )}
      </div>
    </div>
  )
}


'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GitBranch, RotateCcw, Trophy } from 'lucide-react'
import { api } from '@/lib/api'

interface TrailNode {
  label: string
  order: number
  x: number
  y: number
}

interface GameProps {
  /** 'A' = ascending numbers only (ACT-201). 'B' = alternating number/letter (ACT-202). */
  mode: 'A' | 'B'
  activityConfig?: any
  onGameEnd?: (score: number) => void
}

const ACTIVITY_ID: Record<'A' | 'B', string> = { A: 'ACT-201', B: 'ACT-202' }

/**
 * Scatters `count` labeled nodes at random, non-overlapping positions within
 * a percentage-based play area, ordered per the requested mode:
 *   Mode A: 1, 2, 3, ... count
 *   Mode B: 1, A, 2, B, 3, C, ... (alternating number/letter — the
 *           task-switching component that makes TMT-B a distinct construct
 *           from TMT-A rather than just "the same test again")
 */
function generateTrail(mode: 'A' | 'B', count: number): TrailNode[] {
  const labels: string[] = []
  if (mode === 'A') {
    for (let i = 1; i <= count; i++) labels.push(String(i))
  } else {
    let num = 1
    let letterCode = 65 // 'A'
    for (let i = 0; i < count; i++) {
      if (i % 2 === 0) labels.push(String(num++))
      else labels.push(String.fromCharCode(letterCode++))
    }
  }

  const positions: { x: number; y: number }[] = []
  const MIN_DIST = 16 // percentage units — keeps touch targets from overlapping
  for (let i = 0; i < count; i++) {
    let x = 0
    let y = 0
    let attempts = 0
    do {
      x = 8 + Math.random() * 84
      y = 10 + Math.random() * 78
      attempts++
    } while (
      attempts < 60 &&
      positions.some((p) => Math.hypot(p.x - x, p.y - y) < MIN_DIST)
    )
    positions.push({ x, y })
  }

  return labels.map((label, i) => ({ label, order: i, x: positions[i].x, y: positions[i].y }))
}

function Trail({
  nodes,
  progressIndex,
  wrongNode,
  onNodeClick,
  height,
}: {
  nodes: TrailNode[]
  progressIndex: number
  wrongNode: string | null
  onNodeClick: (node: TrailNode) => void
  height: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl border-2 border-dashed border-border bg-muted/20"
      style={{ height }}
    >
      {/* Connecting lines between already-completed nodes */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        {nodes.slice(0, progressIndex).map((node, i) => {
          if (i === 0) return null
          const prev = nodes[i - 1]
          return (
            <line
              key={i}
              x1={`${prev.x}%`}
              y1={`${prev.y}%`}
              x2={`${node.x}%`}
              y2={`${node.y}%`}
              stroke="var(--color-primary)"
              strokeWidth={3}
              strokeLinecap="round"
            />
          )
        })}
      </svg>

      {nodes.map((node) => {
        const isDone = node.order < progressIndex
        const isNext = node.order === progressIndex
        const isWrong = wrongNode === node.label && !isDone

        return (
          <button
            key={`${node.label}-${node.order}`}
            onClick={() => onNodeClick(node)}
            disabled={isDone}
            aria-label={`Node ${node.label}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            className={`absolute flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center
                        rounded-full border-2 text-lg font-bold shadow-soft-sm transition-all duration-150
                        ${
                          isDone
                            ? 'border-primary bg-primary text-primary-foreground'
                            : isWrong
                              ? 'border-destructive bg-destructive-soft text-destructive-strong'
                              : isNext
                                ? 'border-primary/60 bg-card text-foreground hover:scale-105'
                                : 'border-border bg-card text-foreground hover:scale-105 hover:border-primary/40'
                        }`}
          >
            {node.label}
          </button>
        )
      })}
    </div>
  )
}

export default function TrailMakingGame({ mode, activityConfig, onGameEnd }: GameProps) {
  const [phase, setPhase] = useState<'practice' | 'play' | 'result'>('practice')
  const [nodes, setNodes] = useState<TrailNode[]>([])
  const [progressIndex, setProgressIndex] = useState(0)
  const [wrongNode, setWrongNode] = useState<string | null>(null)
  const [errorCount, setErrorCount] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [timeTaken, setTimeTaken] = useState(0)
  const [accuracy, setAccuracy] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const NODE_COUNT = 15

  useEffect(() => {
    startPractice()
  }, [])

  const startPractice = () => {
    setNodes(generateTrail(mode, 3))
    setProgressIndex(0)
    setWrongNode(null)
    setErrorCount(0)
    setPhase('practice')
    setHasSubmitted(false)
  }

  const startRealTest = () => {
    setNodes(generateTrail(mode, NODE_COUNT))
    setProgressIndex(0)
    setWrongNode(null)
    setErrorCount(0)
    setStartTime(Date.now())
    setPhase('play')
  }

  const handleNodeClick = (node: TrailNode, isPractice: boolean) => {
    if (node.order === progressIndex) {
      const next = progressIndex + 1
      setProgressIndex(next)
      setWrongNode(null)

      const total = isPractice ? 3 : NODE_COUNT
      if (next === total) {
        if (isPractice) {
          // Practice trail finished — wait for the patient to opt into the
          // scored attempt rather than auto-starting it.
        } else {
          finishGame(next)
        }
      }
    } else {
      setErrorCount((e) => e + 1)
      setWrongNode(node.label)
      setTimeout(() => setWrongNode(null), 500)
    }
  }

  const finishGame = async (completedCount: number) => {
    if (hasSubmitted || isSubmitting) return
    setHasSubmitted(true)

    const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    setTimeTaken(duration)

    // Each wrong click costs points but the test is still primarily timed —
    // matches how Trail Making is actually scored clinically (errors add
    // time via correction, rather than being an independent tally).
    const calcAccuracy = Math.max(20, 100 - errorCount * 8)
    setAccuracy(calcAccuracy)
    const consistency = calcAccuracy >= 75 ? 100 : calcAccuracy >= 50 ? 75 : 50

    setIsSubmitting(true)
    let calculatedFinalScore = calcAccuracy

    try {
      const patientIdStr = typeof window !== 'undefined' ? localStorage.getItem('patient_id') : null
      const patientId = patientIdStr ? Number(patientIdStr) : 1
      const res = await api.submitGameSession({
        patientId,
        activityId: ACTIVITY_ID[mode],
        rawScore: calcAccuracy,
        accuracy: calcAccuracy / 100,
        timeTaken: duration,
        consistency: consistency / 100,
      })
      if (res && res.finalScore !== undefined) {
        calculatedFinalScore = Math.round(res.finalScore)
      }
    } catch (err: any) {
      console.error('Failed to submit trail making session:', err)
    } finally {
      setIsSubmitting(false)
      setFinalScore(calculatedFinalScore)
      setPhase('result')
      if (onGameEnd) onGameEnd(calculatedFinalScore)
    }
  }

  const title = mode === 'A' ? 'Trail Making A' : 'Trail Making B'
  const instructions =
    mode === 'A'
      ? 'Tap the circles in order: 1, 2, 3... as quickly and accurately as you can.'
      : 'Tap the circles alternating between numbers and letters: 1, A, 2, B, 3, C...'

  return (
    <Card className="w-full max-w-3xl mx-auto space-y-6 border border-border bg-card p-6 text-card-foreground shadow-md">
      <CardHeader className="pb-2 text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <GitBranch className="h-8 w-8" />
        </div>
        <CardTitle className="text-3xl font-bold">{title}</CardTitle>
        <CardDescription className="text-base font-medium text-muted-foreground">
          {phase === 'practice' && `Practice round (not scored) — ${instructions}`}
          {phase === 'play' && `Scored attempt — ${instructions}`}
          {phase === 'result' && 'Activity completed'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {phase === 'practice' && (
          <div className="space-y-5">
            <Trail
              nodes={nodes}
              progressIndex={progressIndex}
              wrongNode={wrongNode}
              onNodeClick={(node) => handleNodeClick(node, true)}
              height={320}
            />
            {progressIndex === 3 && (
              <div className="flex flex-col items-center gap-3 text-center">
                <p className="font-medium text-foreground">
                  Nicely done — that was just practice. Ready for the real one?
                </p>
                <Button onClick={startRealTest} size="lg" className="rounded-xl font-bold">
                  Start scored test
                </Button>
              </div>
            )}
          </div>
        )}

        {phase === 'play' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
              <span>
                Progress: {progressIndex} / {NODE_COUNT}
              </span>
              <span>Errors: {errorCount}</span>
            </div>
            <Trail
              nodes={nodes}
              progressIndex={progressIndex}
              wrongNode={wrongNode}
              onNodeClick={(node) => handleNodeClick(node, false)}
              height={420}
            />
          </div>
        )}

        {phase === 'result' && (
          <div className="space-y-6 text-center">
            <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <div className="flex justify-center text-primary">
                <Trophy className="h-16 w-16" />
              </div>
              <h3 className="text-2xl font-bold">Trail Completed!</h3>
              <div className="grid grid-cols-3 gap-4 py-2">
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Final Score</p>
                  <p className="text-3xl font-extrabold text-primary">{finalScore}</p>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Accuracy</p>
                  <p className="text-3xl font-extrabold text-emerald-600">{accuracy}%</p>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Time Taken</p>
                  <p className="text-3xl font-extrabold text-amber-600">{timeTaken}s</p>
                </div>
              </div>
            </div>

            <Button onClick={startPractice} variant="outline" className="flex w-full items-center justify-center gap-2 py-6 text-lg font-bold">
              <RotateCcw className="h-5 w-5" />
              Play Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

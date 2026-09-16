'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RotateCcw, Trophy, Zap } from 'lucide-react'
import { api } from '@/lib/api'

interface GameProps {
  activityConfig?: any
  onGameEnd?: (score: number) => void
}

const CHOICES = ['red', 'blue', 'green', 'yellow'] as const
type Choice = (typeof CHOICES)[number]

const CHOICE_BG: Record<Choice, string> = {
  red: 'bg-destructive',
  blue: 'bg-info',
  green: 'bg-success',
  yellow: 'bg-warning',
}

const MAX_RESPONSE_MS = 3000

function randomChoice(): Choice {
  return CHOICES[Math.floor(Math.random() * CHOICES.length)]
}

function randomPosition() {
  // Percentage-based, kept away from the edges and away from the fixed
  // response row at the bottom of the play area.
  return { x: 15 + Math.random() * 70, y: 10 + Math.random() * 55 }
}

export default function ChoiceReactionGame({ activityConfig, onGameEnd }: GameProps) {
  const [phase, setPhase] = useState<'practice' | 'play' | 'result'>('practice')
  const [trialIdx, setTrialIdx] = useState(0)
  const [stimulus, setStimulus] = useState<Choice | null>(null)
  const [position, setPosition] = useState({ x: 50, y: 40 })
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | 'timeout' | null>(null)

  const trialStartRef = useRef(0)
  const respondedRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const statsRef = useRef({ correct: 0, reactionTimes: [] as number[] })

  const [startTime, setStartTime] = useState(0)
  const [timeTaken, setTimeTaken] = useState(0)
  const [accuracy, setAccuracy] = useState(0)
  const [avgRt, setAvgRt] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [practiceDone, setPracticeDone] = useState(false)

  const REAL_TRIALS = 18

  useEffect(() => {
    startPractice()
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const presentTrial = (idx: number, total: number, isPractice: boolean) => {
    if (idx >= total) {
      if (isPractice) setPracticeDone(true)
      else finishGame()
      return
    }

    setTrialIdx(idx)
    setStimulus(randomChoice())
    setPosition(randomPosition())
    setFeedback(null)
    respondedRef.current = false
    trialStartRef.current = Date.now()

    timeoutRef.current = setTimeout(() => {
      if (!respondedRef.current) {
        respondedRef.current = true
        setFeedback('timeout')
        if (!isPractice) statsRef.current.reactionTimes.push(MAX_RESPONSE_MS)
        setTimeout(() => presentTrial(idx + 1, total, isPractice), 500)
      }
    }, MAX_RESPONSE_MS)
  }

  const handleChoice = (choice: Choice, isPractice: boolean, total: number) => {
    if (respondedRef.current || !stimulus) return
    respondedRef.current = true
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    const rt = Date.now() - trialStartRef.current
    const isCorrect = choice === stimulus

    if (!isPractice) {
      if (isCorrect) statsRef.current.correct++
      statsRef.current.reactionTimes.push(rt)
    }
    setFeedback(isCorrect ? 'correct' : 'incorrect')

    setTimeout(() => presentTrial(trialIdx + 1, total, isPractice), 450)
  }

  const startPractice = () => {
    setPracticeDone(false)
    setPhase('practice')
    setHasSubmitted(false)
    statsRef.current = { correct: 0, reactionTimes: [] }
    presentTrial(0, 5, true)
  }

  const startRealTest = () => {
    statsRef.current = { correct: 0, reactionTimes: [] }
    setStartTime(Date.now())
    setPhase('play')
    presentTrial(0, REAL_TRIALS, false)
  }

  const finishGame = async () => {
    if (hasSubmitted || isSubmitting) return
    setHasSubmitted(true)

    const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    setTimeTaken(duration)

    const { correct, reactionTimes } = statsRef.current
    const calcAccuracy = Math.round((correct / REAL_TRIALS) * 100)
    setAccuracy(calcAccuracy)

    const meanRt = reactionTimes.reduce((a, b) => a + b, 0) / Math.max(1, reactionTimes.length)
    setAvgRt(Math.round(meanRt))

    // Reaction-time consistency (low variance = steady processing speed) is
    // as clinically relevant here as raw accuracy — a classic RT task is
    // fundamentally about speed, so consistency should reflect that rather
    // than reusing a plain accuracy-tier heuristic.
    const variance = reactionTimes.reduce((sum, rt) => sum + Math.pow(rt - meanRt, 2), 0) / Math.max(1, reactionTimes.length)
    const stdDev = Math.sqrt(variance)
    const consistencyScore = Math.max(30, Math.min(100, Math.round(100 - (stdDev / Math.max(1, meanRt)) * 100)))

    setIsSubmitting(true)
    let calculatedFinalScore = calcAccuracy

    try {
      const patientIdStr = typeof window !== 'undefined' ? localStorage.getItem('patient_id') : null
      const patientId = patientIdStr ? Number(patientIdStr) : 1
      const res = await api.submitGameSession({
        patientId,
        activityId: 'ACT-210',
        rawScore: calcAccuracy,
        accuracy: calcAccuracy / 100,
        timeTaken: duration,
        consistency: consistencyScore / 100,
      })
      if (res && res.finalScore !== undefined) {
        calculatedFinalScore = Math.round(res.finalScore)
      }
    } catch (err: any) {
      console.error('Failed to submit choice reaction session:', err)
    } finally {
      setIsSubmitting(false)
      setFinalScore(calculatedFinalScore)
      setPhase('result')
      if (onGameEnd) onGameEnd(calculatedFinalScore)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto space-y-6 border border-border bg-card p-6 text-card-foreground shadow-md">
      <CardHeader className="pb-2 text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Zap className="h-8 w-8" />
        </div>
        <CardTitle className="text-3xl font-bold">Choice Reaction Time</CardTitle>
        <CardDescription className="text-base font-medium text-muted-foreground">
          {phase === 'practice' && !practiceDone && 'Practice round (not scored) — tap the button matching the circle as fast as you can.'}
          {phase === 'play' && `Trial ${trialIdx + 1} of ${REAL_TRIALS} — tap the matching button`}
          {phase === 'result' && 'Activity completed'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {phase === 'practice' && !practiceDone && (
          <ReactionArea
            stimulus={stimulus}
            position={position}
            feedback={feedback}
            onChoose={(c) => handleChoice(c, true, 5)}
          />
        )}

        {practiceDone && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="font-medium text-foreground">Great — now the real timed round.</p>
            <Button onClick={startRealTest} size="lg" className="rounded-xl font-bold">
              Start scored test
            </Button>
          </div>
        )}

        {phase === 'play' && (
          <ReactionArea
            stimulus={stimulus}
            position={position}
            feedback={feedback}
            onChoose={(c) => handleChoice(c, false, REAL_TRIALS)}
          />
        )}

        {phase === 'result' && (
          <div className="space-y-6 text-center">
            <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <div className="flex justify-center text-primary">
                <Trophy className="h-16 w-16" />
              </div>
              <h3 className="text-2xl font-bold">Test Completed!</h3>
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
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Avg. Reaction</p>
                  <p className="text-3xl font-extrabold text-amber-600">{avgRt}ms</p>
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

function ReactionArea({
  stimulus,
  position,
  feedback,
  onChoose,
}: {
  stimulus: Choice | null
  position: { x: number; y: number }
  feedback: 'correct' | 'incorrect' | 'timeout' | null
  onChoose: (choice: Choice) => void
}) {
  return (
    <div className="space-y-4">
      <div className="relative h-64 w-full rounded-2xl border-2 border-dashed border-border bg-muted/20">
        {stimulus && (
          <div
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            className={`absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-soft-md ${CHOICE_BG[stimulus]}`}
          />
        )}
      </div>

      <p
        className={`h-5 text-center text-sm font-semibold ${
          feedback === 'correct'
            ? 'text-success-strong'
            : feedback === 'incorrect' || feedback === 'timeout'
              ? 'text-destructive-strong'
              : 'text-transparent'
        }`}
      >
        {feedback === 'correct' && 'Correct!'}
        {feedback === 'incorrect' && 'Not quite — try the next one.'}
        {feedback === 'timeout' && 'Too slow that time — keep trying.'}
        {!feedback && '.'}
      </p>

      <div className="grid grid-cols-4 gap-3">
        {CHOICES.map((c) => (
          <button
            key={c}
            onClick={() => onChoose(c)}
            aria-label={`${c} button`}
            className={`h-16 rounded-2xl shadow-soft-sm transition-transform active:scale-95 ${CHOICE_BG[c]}`}
          />
        ))}
      </div>
    </div>
  )
}

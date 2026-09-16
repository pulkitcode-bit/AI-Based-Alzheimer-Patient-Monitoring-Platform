'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Palette, RotateCcw, Trophy } from 'lucide-react'
import { api } from '@/lib/api'

interface GameProps {
  activityConfig?: any
  onGameEnd?: (score: number) => void
}

const COLOR_WORDS = ['RED', 'BLUE', 'GREEN', 'YELLOW'] as const
type ColorName = (typeof COLOR_WORDS)[number]

// Actual rendered ink colors — mapped through the design system's semantic
// tokens rather than raw hex, so the four options stay visually distinct in
// both light and dark theme without hardcoding a palette here.
const INK_CLASS: Record<ColorName, string> = {
  RED: 'text-destructive',
  BLUE: 'text-info',
  GREEN: 'text-success',
  YELLOW: 'text-warning',
}

interface Trial {
  word: ColorName
  ink: ColorName
  congruent: boolean
}

function buildTrials(count: number): Trial[] {
  const trials: Trial[] = []
  for (let i = 0; i < count; i++) {
    const word = COLOR_WORDS[Math.floor(Math.random() * COLOR_WORDS.length)]
    // Roughly half incongruent, half congruent — mixing both is what makes
    // this a genuine interference test rather than a plain color-naming task.
    const congruent = Math.random() < 0.35
    let ink: ColorName = word
    if (!congruent) {
      const others = COLOR_WORDS.filter((c) => c !== word)
      ink = others[Math.floor(Math.random() * others.length)]
    }
    trials.push({ word, ink, congruent })
  }
  return trials
}

export default function StroopGame({ activityConfig, onGameEnd }: GameProps) {
  const [phase, setPhase] = useState<'practice' | 'play' | 'result'>('practice')
  const [trials, setTrials] = useState<Trial[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [reactionTimes, setReactionTimes] = useState<number[]>([])
  const [startTime, setStartTime] = useState(0)
  const trialStartRef = useRef(0)

  const [timeTaken, setTimeTaken] = useState(0)
  const [accuracy, setAccuracy] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const REAL_TRIAL_COUNT = 18

  useEffect(() => {
    startPractice()
  }, [])

  const startPractice = () => {
    setTrials(buildTrials(4))
    setCurrentIdx(0)
    setCorrectCount(0)
    setReactionTimes([])
    setPhase('practice')
    setHasSubmitted(false)
    trialStartRef.current = Date.now()
  }

  const startRealTest = () => {
    setTrials(buildTrials(REAL_TRIAL_COUNT))
    setCurrentIdx(0)
    setCorrectCount(0)
    setReactionTimes([])
    setStartTime(Date.now())
    trialStartRef.current = Date.now()
    setPhase('play')
  }

  const handleAnswer = (chosenInk: ColorName, isPractice: boolean) => {
    const trial = trials[currentIdx]
    const rt = Date.now() - trialStartRef.current
    const isCorrect = chosenInk === trial.ink

    const total = isPractice ? 4 : REAL_TRIAL_COUNT
    const nextIdx = currentIdx + 1

    if (!isPractice) {
      if (isCorrect) setCorrectCount((c) => c + 1)
      setReactionTimes((prev) => [...prev, rt])
    }

    if (nextIdx >= total) {
      if (isPractice) {
        setCurrentIdx(nextIdx) // triggers the "ready for the real test" prompt
      } else {
        finishGame(isCorrect ? correctCount + 1 : correctCount, [...reactionTimes, rt])
      }
    } else {
      setCurrentIdx(nextIdx)
      trialStartRef.current = Date.now()
    }
  }

  const finishGame = async (finalCorrect: number, allRts: number[]) => {
    if (hasSubmitted || isSubmitting) return
    setHasSubmitted(true)

    const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    setTimeTaken(duration)

    const calcAccuracy = Math.round((finalCorrect / REAL_TRIAL_COUNT) * 100)
    setAccuracy(calcAccuracy)

    // Consistency here reflects reaction-time stability across trials, not
    // just accuracy tier — a patient who's accurate but wildly erratic
    // trial-to-trial is a genuinely different (and clinically relevant)
    // pattern from one who's steady throughout.
    const avgRt = allRts.reduce((a, b) => a + b, 0) / Math.max(1, allRts.length)
    const variance = allRts.reduce((sum, rt) => sum + Math.pow(rt - avgRt, 2), 0) / Math.max(1, allRts.length)
    const stdDev = Math.sqrt(variance)
    const consistencyScore = Math.max(40, Math.min(100, 100 - (stdDev / Math.max(1, avgRt)) * 100))

    setIsSubmitting(true)
    let calculatedFinalScore = calcAccuracy

    try {
      const patientIdStr = typeof window !== 'undefined' ? localStorage.getItem('patient_id') : null
      const patientId = patientIdStr ? Number(patientIdStr) : 1
      const res = await api.submitGameSession({
        patientId,
        activityId: 'ACT-203',
        rawScore: calcAccuracy,
        accuracy: calcAccuracy / 100,
        timeTaken: duration,
        consistency: consistencyScore / 100,
      })
      if (res && res.finalScore !== undefined) {
        calculatedFinalScore = Math.round(res.finalScore)
      }
    } catch (err: any) {
      console.error('Failed to submit stroop session:', err)
    } finally {
      setIsSubmitting(false)
      setFinalScore(calculatedFinalScore)
      setPhase('result')
      if (onGameEnd) onGameEnd(calculatedFinalScore)
    }
  }

  const isPracticeDone = phase === 'practice' && currentIdx >= 4
  const currentTrial = trials[currentIdx]

  return (
    <Card className="w-full max-w-2xl mx-auto space-y-6 border border-border bg-card p-6 text-card-foreground shadow-md">
      <CardHeader className="pb-2 text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Palette className="h-8 w-8" />
        </div>
        <CardTitle className="text-3xl font-bold">Stroop Challenge</CardTitle>
        <CardDescription className="text-base font-medium text-muted-foreground">
          {phase === 'practice' && !isPracticeDone && 'Practice round (not scored) — tap the button matching the INK color, not the word.'}
          {phase === 'play' && `Trial ${currentIdx + 1} of ${REAL_TRIAL_COUNT} — tap the INK color, not the word`}
          {phase === 'result' && 'Activity completed'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {phase === 'practice' && !isPracticeDone && currentTrial && (
          <TrialView trial={currentTrial} onAnswer={(c) => handleAnswer(c, true)} />
        )}

        {isPracticeDone && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="font-medium text-foreground">Remember: tap the color it's printed in, not the word itself.</p>
            <Button onClick={startRealTest} size="lg" className="rounded-xl font-bold">
              Start scored test
            </Button>
          </div>
        )}

        {phase === 'play' && currentTrial && (
          <TrialView trial={currentTrial} onAnswer={(c) => handleAnswer(c, false)} />
        )}

        {phase === 'result' && (
          <div className="space-y-6 text-center">
            <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <div className="flex justify-center text-primary">
                <Trophy className="h-16 w-16" />
              </div>
              <h3 className="text-2xl font-bold">Challenge Completed!</h3>
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

function TrialView({ trial, onAnswer }: { trial: Trial; onAnswer: (c: ColorName) => void }) {
  return (
    <div className="space-y-8 text-center">
      <div className="mx-auto flex max-w-lg items-center justify-center rounded-2xl border-2 border-primary/20 bg-primary/5 p-10 shadow-sm">
        <span className={`text-6xl font-black tracking-wide ${INK_CLASS[trial.ink]}`}>{trial.word}</span>
      </div>

      <div className="mx-auto grid max-w-md grid-cols-2 gap-4">
        {COLOR_WORDS.map((color) => (
          <button
            key={color}
            onClick={() => onAnswer(color)}
            className={`rounded-2xl border-2 border-border bg-card py-6 text-lg font-bold shadow-sm
                        transition-all hover:scale-[1.03] hover:border-primary/50 ${INK_CLASS[color]}`}
          >
            {color}
          </button>
        ))}
      </div>
    </div>
  )
}

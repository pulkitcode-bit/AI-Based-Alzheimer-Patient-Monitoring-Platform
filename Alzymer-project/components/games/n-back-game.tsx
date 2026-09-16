'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Layers, RotateCcw, Trophy } from 'lucide-react'
import { api } from '@/lib/api'

interface GameProps {
  activityConfig?: any
  onGameEnd?: (score: number) => void
}

const LETTER_POOL = ['B', 'F', 'H', 'K', 'M', 'Q', 'R', 'X']
const N_BACK = 1 // starting difficulty, per spec
const DISPLAY_MS = 2000

function buildSequence(length: number, targetRate: number): string[] {
  const seq: string[] = []
  for (let i = 0; i < length; i++) {
    if (i >= N_BACK && Math.random() < targetRate) {
      seq.push(seq[i - N_BACK]) // deliberately force a target trial
    } else {
      seq.push(LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)])
    }
  }
  return seq
}

export default function NBackGame({ activityConfig, onGameEnd }: GameProps) {
  const [phase, setPhase] = useState<'practice' | 'play' | 'result'>('practice')
  const [sequence, setSequence] = useState<string[]>([])
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [feedback, setFeedback] = useState<'hit' | 'miss' | 'false-alarm' | 'correct-reject' | null>(null)

  const respondedRef = useRef(false)
  const statsRef = useRef({ hits: 0, misses: 0, falseAlarms: 0, correctRejects: 0, targetCount: 0 })
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const [startTime, setStartTime] = useState(0)
  const [timeTaken, setTimeTaken] = useState(0)
  const [accuracy, setAccuracy] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [practiceDone, setPracticeDone] = useState(false)

  const REAL_LENGTH = 20

  useEffect(() => {
    startPractice()
    return () => timeoutsRef.current.forEach(clearTimeout)
  }, [])

  const clearTimers = () => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }

  const runTrial = (seq: string[], idx: number, isPractice: boolean) => {
    if (idx >= seq.length) {
      if (isPractice) setPracticeDone(true)
      else finishGame()
      return
    }

    setCurrentIdx(idx)
    setFeedback(null)
    respondedRef.current = false

    const isTarget = idx >= N_BACK && seq[idx] === seq[idx - N_BACK]
    if (!isPractice && isTarget) statsRef.current.targetCount++

    const t = setTimeout(() => {
      if (!respondedRef.current) {
        if (isTarget) {
          if (!isPractice) statsRef.current.misses++
          setFeedback('miss')
        } else {
          if (!isPractice) statsRef.current.correctRejects++
          setFeedback('correct-reject')
        }
      }
      const t2 = setTimeout(() => runTrial(seq, idx + 1, isPractice), 250)
      timeoutsRef.current.push(t2)
    }, DISPLAY_MS)
    timeoutsRef.current.push(t)
  }

  const handleMatchTap = (isPractice: boolean) => {
    if (respondedRef.current || currentIdx < 0) return
    respondedRef.current = true

    const seq = sequence
    const isTarget = currentIdx >= N_BACK && seq[currentIdx] === seq[currentIdx - N_BACK]
    if (isTarget) {
      if (!isPractice) statsRef.current.hits++
      setFeedback('hit')
    } else {
      if (!isPractice) statsRef.current.falseAlarms++
      setFeedback('false-alarm')
    }
  }

  const startPractice = () => {
    clearTimers()
    const seq = buildSequence(8, 0.4)
    setSequence(seq)
    setPracticeDone(false)
    setPhase('practice')
    setHasSubmitted(false)
    statsRef.current = { hits: 0, misses: 0, falseAlarms: 0, correctRejects: 0, targetCount: 0 }
    runTrial(seq, 0, true)
  }

  const startRealTest = () => {
    clearTimers()
    const seq = buildSequence(REAL_LENGTH, 0.35)
    setSequence(seq)
    statsRef.current = { hits: 0, misses: 0, falseAlarms: 0, correctRejects: 0, targetCount: 0 }
    setStartTime(Date.now())
    setPhase('play')
    runTrial(seq, 0, false)
  }

  const finishGame = async () => {
    if (hasSubmitted || isSubmitting) return
    setHasSubmitted(true)

    const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    setTimeTaken(duration)

    const { hits, falseAlarms, targetCount } = statsRef.current
    // Per spec: hits minus false alarms, normalized 0-1 against the number of
    // real target trials — can go negative (more false alarms than hits),
    // clamped to 0 rather than floored artificially high, since a genuinely
    // poor N-Back run is a real, clinically meaningful result to capture.
    const normalized = targetCount > 0 ? (hits - falseAlarms) / targetCount : 0
    const calcAccuracy = Math.max(0, Math.min(100, Math.round(normalized * 100)))
    setAccuracy(calcAccuracy)
    const consistency = calcAccuracy >= 75 ? 100 : calcAccuracy >= 50 ? 75 : 50

    setIsSubmitting(true)
    let calculatedFinalScore = calcAccuracy

    try {
      const patientIdStr = typeof window !== 'undefined' ? localStorage.getItem('patient_id') : null
      const patientId = patientIdStr ? Number(patientIdStr) : 1
      const res = await api.submitGameSession({
        patientId,
        activityId: 'ACT-208',
        rawScore: calcAccuracy,
        accuracy: calcAccuracy / 100,
        timeTaken: duration,
        consistency: consistency / 100,
      })
      if (res && res.finalScore !== undefined) {
        calculatedFinalScore = Math.round(res.finalScore)
      }
    } catch (err: any) {
      console.error('Failed to submit n-back session:', err)
    } finally {
      setIsSubmitting(false)
      setFinalScore(calculatedFinalScore)
      setPhase('result')
      if (onGameEnd) onGameEnd(calculatedFinalScore)
    }
  }

  const currentLetter = currentIdx >= 0 ? sequence[currentIdx] : null

  return (
    <Card className="w-full max-w-xl mx-auto space-y-6 border border-border bg-card p-6 text-card-foreground shadow-md">
      <CardHeader className="pb-2 text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Layers className="h-8 w-8" />
        </div>
        <CardTitle className="text-3xl font-bold">N-Back Focus</CardTitle>
        <CardDescription className="text-base font-medium text-muted-foreground">
          {phase === 'practice' && !practiceDone && 'Practice round (not scored) — tap Match when the letter is the SAME as the one right before it.'}
          {phase === 'play' && `Letter ${currentIdx + 1} of ${REAL_LENGTH} — tap Match if it repeats the previous letter`}
          {phase === 'result' && 'Activity completed'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {phase === 'practice' && !practiceDone && (
          <LetterView letter={currentLetter} feedback={feedback} onMatch={() => handleMatchTap(true)} />
        )}

        {practiceDone && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="font-medium text-foreground">
              Remember: only tap Match when the letter is identical to the one just before it.
            </p>
            <Button onClick={startRealTest} size="lg" className="rounded-xl font-bold">
              Start scored test
            </Button>
          </div>
        )}

        {phase === 'play' && <LetterView letter={currentLetter} feedback={feedback} onMatch={() => handleMatchTap(false)} />}

        {phase === 'result' && (
          <div className="space-y-6 text-center">
            <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <div className="flex justify-center text-primary">
                <Trophy className="h-16 w-16" />
              </div>
              <h3 className="text-2xl font-bold">Session Completed!</h3>
              <div className="grid grid-cols-3 gap-4 py-2">
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Final Score</p>
                  <p className="text-3xl font-extrabold text-primary">{finalScore}</p>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Net Accuracy</p>
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

function LetterView({
  letter,
  feedback,
  onMatch,
}: {
  letter: string | null
  feedback: 'hit' | 'miss' | 'false-alarm' | 'correct-reject' | null
  onMatch: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="flex h-40 w-40 items-center justify-center rounded-3xl border-2 border-border bg-muted/20">
        <span className="text-7xl font-black text-foreground">{letter}</span>
      </div>

      <Button onClick={onMatch} size="lg" className="w-48 rounded-2xl py-7 text-xl font-bold">
        Match
      </Button>

      <p
        className={`h-6 text-sm font-semibold ${
          feedback === 'hit' || feedback === 'correct-reject'
            ? 'text-success-strong'
            : feedback === 'miss' || feedback === 'false-alarm'
              ? 'text-destructive-strong'
              : 'text-transparent'
        }`}
      >
        {feedback === 'hit' && 'Correct match!'}
        {feedback === 'correct-reject' && 'Correct — no match there.'}
        {feedback === 'miss' && 'That one was a match — keep watching closely.'}
        {feedback === 'false-alarm' && "That wasn't a match, but that's okay."}
        {!feedback && '.'}
      </p>
    </div>
  )
}

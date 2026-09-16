'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Delete, Hash, RotateCcw, Trophy } from 'lucide-react'
import { api } from '@/lib/api'

interface GameProps {
  /** 'forward' = repeat in the same order (ACT-205). 'backward' = reverse order (ACT-206), the harder variant. */
  mode: 'forward' | 'backward'
  activityConfig?: any
  onGameEnd?: (score: number) => void
}

const ACTIVITY_ID: Record<'forward' | 'backward', string> = {
  forward: 'ACT-205',
  backward: 'ACT-206',
}

const DIGIT_DISPLAY_MS = 900
const DIGIT_GAP_MS = 350
const START_LENGTH = 3

function randomDigits(length: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * 10))
}

export default function DigitSpanGame({ mode, activityConfig, onGameEnd }: GameProps) {
  const [phase, setPhase] = useState<'practice' | 'showing' | 'input' | 'play-result' | 'result'>('practice')
  const [sequence, setSequence] = useState<number[]>([])
  const [shownIndex, setShownIndex] = useState(-1)
  const [input, setInput] = useState<number[]>([])
  const [length, setLength] = useState(START_LENGTH)
  const [consecutiveFails, setConsecutiveFails] = useState(0)
  const [longestSpan, setLongestSpan] = useState(0)
  const [attemptsAtLength, setAttemptsAtLength] = useState(0)
  const [lastRoundCorrect, setLastRoundCorrect] = useState<boolean | null>(null)
  const isPracticeRef = useRef(true)

  const [startTime, setStartTime] = useState(0)
  const [timeTaken, setTimeTaken] = useState(0)
  const [accuracy, setAccuracy] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  useEffect(() => {
    startPractice()
  }, [])

  const playSequence = (seq: number[]) => {
    setPhase('showing')
    setInput([])
    setShownIndex(0)
    let i = 0
    const tick = () => {
      i++
      if (i < seq.length) {
        setTimeout(() => {
          setShownIndex(i)
          setTimeout(tick, DIGIT_DISPLAY_MS)
        }, DIGIT_GAP_MS)
      } else {
        setTimeout(() => {
          setShownIndex(-1)
          setPhase('input')
        }, DIGIT_DISPLAY_MS)
      }
    }
    setTimeout(tick, DIGIT_DISPLAY_MS)
  }

  const startPractice = () => {
    isPracticeRef.current = true
    setLength(START_LENGTH)
    setConsecutiveFails(0)
    setLongestSpan(0)
    setAttemptsAtLength(0)
    setLastRoundCorrect(null)
    setHasSubmitted(false)
    setPhase('practice')
    const seq = randomDigits(START_LENGTH)
    setSequence(seq)
    playSequence(seq)
  }

  const startRealTest = () => {
    isPracticeRef.current = false
    setLength(START_LENGTH)
    setConsecutiveFails(0)
    setLongestSpan(0)
    setAttemptsAtLength(0)
    setStartTime(Date.now())
    const seq = randomDigits(START_LENGTH)
    setSequence(seq)
    playSequence(seq)
  }

  const handleDigit = (d: number) => {
    if (phase !== 'input') return
    if (input.length >= sequence.length) return
    setInput((prev) => [...prev, d])
  }

  const handleBackspace = () => {
    if (phase !== 'input') return
    setInput((prev) => prev.slice(0, -1))
  }

  const handleSubmitAnswer = () => {
    if (phase !== 'input' || input.length !== sequence.length) return

    const expected = mode === 'forward' ? sequence : [...sequence].reverse()
    const isCorrect = expected.every((d, i) => d === input[i])
    setLastRoundCorrect(isCorrect)

    if (isPracticeRef.current) {
      setPhase('play-result')
      return
    }

    if (isCorrect) {
      setLongestSpan((prev) => Math.max(prev, sequence.length))
      setConsecutiveFails(0)
      setAttemptsAtLength(0)
      const nextLength = sequence.length + 1
      setLength(nextLength)
      const seq = randomDigits(nextLength)
      setSequence(seq)
      setTimeout(() => playSequence(seq), 900)
      setPhase('play-result')
    } else {
      const fails = consecutiveFails + 1
      setConsecutiveFails(fails)
      if (fails >= 2) {
        finishGame(Math.max(longestSpan, 0))
      } else {
        setPhase('play-result')
        const seq = randomDigits(sequence.length)
        setSequence(seq)
        setTimeout(() => playSequence(seq), 900)
      }
    }
  }

  const finishGame = async (finalLongestSpan: number) => {
    if (hasSubmitted || isSubmitting) return
    setHasSubmitted(true)

    const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    setTimeTaken(duration)

    // The span itself IS the clinical score — there's no separate accuracy
    // percentage in real digit span scoring, so this maps the achieved span
    // onto a 0-100 scale against a realistic ceiling (9 forward / 8 backward
    // is roughly the top of the normal adult range).
    const ceiling = mode === 'forward' ? 9 : 8
    const calcAccuracy = Math.min(100, Math.round((finalLongestSpan / ceiling) * 100))
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
      console.error('Failed to submit digit span session:', err)
    } finally {
      setIsSubmitting(false)
      setFinalScore(calculatedFinalScore)
      setPhase('result')
      if (onGameEnd) onGameEnd(calculatedFinalScore)
    }
  }

  const title = mode === 'forward' ? 'Digit Span Forward' : 'Digit Span Backward'
  const directionHint = mode === 'forward' ? 'the same order you saw them' : 'reverse order'

  return (
    <Card className="w-full max-w-xl mx-auto space-y-6 border border-border bg-card p-6 text-card-foreground shadow-md">
      <CardHeader className="pb-2 text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Hash className="h-8 w-8" />
        </div>
        <CardTitle className="text-3xl font-bold">{title}</CardTitle>
        <CardDescription className="text-base font-medium text-muted-foreground">
          {phase !== 'result' && `Watch the digits, then enter them in ${directionHint}.`}
          {phase === 'result' && 'Activity completed'}
        </CardDescription>
        {isPracticeRef.current && phase !== 'result' && (
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Practice round — not scored</p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {phase === 'showing' && (
          <div className="flex items-center justify-center gap-3 py-10">
            {sequence.map((d, i) => (
              <span
                key={i}
                className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-3xl font-black transition-all
                            ${i === shownIndex ? 'scale-110 border-primary bg-primary text-primary-foreground' : 'border-border bg-muted/30 text-transparent'}`}
              >
                {d}
              </span>
            ))}
          </div>
        )}

        {phase === 'input' && (
          <div className="space-y-6">
            <div className="flex min-h-16 items-center justify-center gap-3">
              {Array.from({ length: sequence.length }, (_, i) => (
                <span
                  key={i}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-border bg-muted/20 text-2xl font-bold"
                >
                  {input[i] ?? ''}
                </span>
              ))}
            </div>

            <div className="mx-auto grid max-w-xs grid-cols-3 gap-3">
              {Array.from({ length: 10 }, (_, d) => (
                <button
                  key={d}
                  onClick={() => handleDigit(d)}
                  className="rounded-xl border border-border bg-card py-4 text-xl font-bold shadow-sm transition-all hover:scale-105 hover:border-primary/50"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={handleBackspace}
                className="flex items-center justify-center rounded-xl border border-border bg-card py-4 shadow-sm transition-all hover:border-destructive/40"
                aria-label="Backspace"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>

            <Button
              onClick={handleSubmitAnswer}
              disabled={input.length !== sequence.length}
              size="lg"
              className="w-full rounded-xl font-bold"
            >
              Submit
            </Button>
          </div>
        )}

        {phase === 'play-result' && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <p className={`text-lg font-semibold ${lastRoundCorrect ? 'text-success-strong' : 'text-destructive-strong'}`}>
              {lastRoundCorrect ? 'Correct!' : 'Not quite — one more try.'}
            </p>
            {isPracticeRef.current ? (
              <Button onClick={startRealTest} size="lg" className="rounded-xl font-bold">
                Start scored test
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Next sequence coming up...</p>
            )}
          </div>
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
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Longest Span</p>
                  <p className="text-3xl font-extrabold text-emerald-600">{longestSpan}</p>
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

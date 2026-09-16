'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Grid3x3, RotateCcw, Trophy } from 'lucide-react'
import { api } from '@/lib/api'

interface GameProps {
  activityConfig?: any
  onGameEnd?: (score: number) => void
}

const BLOCK_COUNT = 9
const START_LENGTH = 3
const FLASH_MS = 700
const GAP_MS = 300

function randomSequence(length: number): number[] {
  const pool = Array.from({ length: BLOCK_COUNT }, (_, i) => i)
  const seq: number[] = []
  for (let i = 0; i < length && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    seq.push(pool.splice(idx, 1)[0])
  }
  return seq
}

export default function CorsiBlockGame({ activityConfig, onGameEnd }: GameProps) {
  const [phase, setPhase] = useState<'practice' | 'showing' | 'input' | 'play-result' | 'result'>('practice')
  const [sequence, setSequence] = useState<number[]>([])
  const [litIndex, setLitIndex] = useState(-1)
  const [input, setInput] = useState<number[]>([])
  const [consecutiveFails, setConsecutiveFails] = useState(0)
  const [longestSpan, setLongestSpan] = useState(0)
  const [lastRoundCorrect, setLastRoundCorrect] = useState<boolean | null>(null)
  const isPracticeRef = useRef(true)

  const [startTime, setStartTime] = useState(0)
  const [timeTaken, setTimeTaken] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  useEffect(() => {
    startPractice()
  }, [])

  const playSequence = (seq: number[]) => {
    setPhase('showing')
    setInput([])
    setLitIndex(-1)
    let i = 0
    const tick = () => {
      setLitIndex(seq[i])
      setTimeout(() => {
        setLitIndex(-1)
        i++
        if (i < seq.length) {
          setTimeout(tick, GAP_MS)
        } else {
          setTimeout(() => setPhase('input'), GAP_MS)
        }
      }, FLASH_MS)
    }
    tick()
  }

  const startPractice = () => {
    isPracticeRef.current = true
    setConsecutiveFails(0)
    setLongestSpan(0)
    setLastRoundCorrect(null)
    setHasSubmitted(false)
    setPhase('practice')
    const seq = randomSequence(START_LENGTH)
    setSequence(seq)
    playSequence(seq)
  }

  const startRealTest = () => {
    isPracticeRef.current = false
    setConsecutiveFails(0)
    setLongestSpan(0)
    setStartTime(Date.now())
    const seq = randomSequence(START_LENGTH)
    setSequence(seq)
    playSequence(seq)
  }

  const handleBlockTap = (blockIdx: number) => {
    if (phase !== 'input') return
    if (input.length >= sequence.length) return

    const nextInput = [...input, blockIdx]
    setInput(nextInput)

    if (nextInput.length === sequence.length) {
      const isCorrect = sequence.every((v, i) => v === nextInput[i])
      setLastRoundCorrect(isCorrect)

      if (isPracticeRef.current) {
        setPhase('play-result')
        return
      }

      if (isCorrect) {
        setLongestSpan((prev) => Math.max(prev, sequence.length))
        setConsecutiveFails(0)
        const nextLength = sequence.length + 1
        const seq = randomSequence(nextLength)
        setSequence(seq)
        setPhase('play-result')
        setTimeout(() => playSequence(seq), 900)
      } else {
        const fails = consecutiveFails + 1
        setConsecutiveFails(fails)
        if (fails >= 2) {
          finishGame(longestSpan)
        } else {
          setPhase('play-result')
          const seq = randomSequence(sequence.length)
          setSequence(seq)
          setTimeout(() => playSequence(seq), 900)
        }
      }
    }
  }

  const finishGame = async (finalLongestSpan: number) => {
    if (hasSubmitted || isSubmitting) return
    setHasSubmitted(true)

    const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    setTimeTaken(duration)

    // Same "the span IS the score" logic as Digit Span — 8 blocks is roughly
    // the top of the normal adult visuospatial span.
    const ceiling = 8
    const calcAccuracy = Math.min(100, Math.round((finalLongestSpan / ceiling) * 100))
    const consistency = calcAccuracy >= 75 ? 100 : calcAccuracy >= 50 ? 75 : 50

    setIsSubmitting(true)
    let calculatedFinalScore = calcAccuracy

    try {
      const patientIdStr = typeof window !== 'undefined' ? localStorage.getItem('patient_id') : null
      const patientId = patientIdStr ? Number(patientIdStr) : 1
      const res = await api.submitGameSession({
        patientId,
        activityId: 'ACT-207',
        rawScore: calcAccuracy,
        accuracy: calcAccuracy / 100,
        timeTaken: duration,
        consistency: consistency / 100,
      })
      if (res && res.finalScore !== undefined) {
        calculatedFinalScore = Math.round(res.finalScore)
      }
    } catch (err: any) {
      console.error('Failed to submit corsi block session:', err)
    } finally {
      setIsSubmitting(false)
      setFinalScore(calculatedFinalScore)
      setPhase('result')
      if (onGameEnd) onGameEnd(calculatedFinalScore)
    }
  }

  return (
    <Card className="w-full max-w-xl mx-auto space-y-6 border border-border bg-card p-6 text-card-foreground shadow-md">
      <CardHeader className="pb-2 text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Grid3x3 className="h-8 w-8" />
        </div>
        <CardTitle className="text-3xl font-bold">Block Recall (Corsi)</CardTitle>
        <CardDescription className="text-base font-medium text-muted-foreground">
          {phase !== 'result' && 'Watch which blocks light up, then tap them back in the same order.'}
          {phase === 'result' && 'Activity completed'}
        </CardDescription>
        {isPracticeRef.current && phase !== 'result' && (
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Practice round — not scored</p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {(phase === 'showing' || phase === 'input') && (
          <div className="mx-auto grid max-w-xs grid-cols-3 gap-4">
            {Array.from({ length: BLOCK_COUNT }, (_, i) => {
              const isLit = litIndex === i
              const tappedOrder = input.indexOf(i)
              const isTapped = phase === 'input' && tappedOrder !== -1
              return (
                <button
                  key={i}
                  onClick={() => handleBlockTap(i)}
                  disabled={phase !== 'input' || isTapped}
                  aria-label={`Block ${i + 1}`}
                  className={`aspect-square rounded-2xl border-2 shadow-sm transition-all duration-150
                              ${
                                isLit
                                  ? 'scale-105 border-primary bg-primary'
                                  : isTapped
                                    ? 'border-primary/60 bg-primary/20'
                                    : 'border-border bg-muted/30 hover:scale-105 hover:border-primary/40'
                              }`}
                />
              )
            })}
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
              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Final Score</p>
                  <p className="text-3xl font-extrabold text-primary">{finalScore}</p>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Longest Span</p>
                  <p className="text-3xl font-extrabold text-emerald-600">{longestSpan}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Completed in {timeTaken}s</p>
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

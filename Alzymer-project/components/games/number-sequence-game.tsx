'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Hash, Trophy, RotateCcw, CheckCircle2, XCircle } from 'lucide-react'
import { api } from '@/lib/api'

interface SequenceRound {
  sequence: string
  correct: number
  options: number[]
}

const ROUNDS: SequenceRound[] = [
  { sequence: '5, 10, 15,  ❓ , 25', correct: 20, options: [20, 18, 22, 30] },
  { sequence: '3, 6, 9, 12,  ❓ ', correct: 15, options: [15, 14, 16, 18] },
  { sequence: '10, 20, 30,  ❓ , 50', correct: 40, options: [40, 35, 45, 60] },
]

interface GameProps {
  activityConfig?: any
  onGameEnd?: (score: number) => void
}

export default function NumberSequenceGame({ activityConfig, onGameEnd }: GameProps) {
  const [phase, setPhase] = useState<'play' | 'result'>('play')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [rounds, setRounds] = useState<SequenceRound[]>([])
  const [userAnswers, setUserAnswers] = useState<number[]>([])
  const [startTime, setStartTime] = useState<number>(0)
  const [timeTaken, setTimeTaken] = useState<number>(0)
  const [accuracy, setAccuracy] = useState<number>(0)
  const [finalScore, setFinalScore] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  useEffect(() => {
    initGame()
  }, [])

  const initGame = () => {
    const prepared = ROUNDS.map((r) => ({
      ...r,
      options: [...r.options].sort(() => Math.random() - 0.5),
    })).sort(() => Math.random() - 0.5)

    setRounds(prepared)
    setCurrentIdx(0)
    setUserAnswers([])
    setPhase('play')
    setStartTime(Date.now())
    setHasSubmitted(false)
  }

  const handleSelectOption = (num: number) => {
    const nextAnswers = [...userAnswers, num]
    setUserAnswers(nextAnswers)

    if (currentIdx + 1 < rounds.length) {
      setCurrentIdx(currentIdx + 1)
    } else {
      finishGame(nextAnswers)
    }
  }

  const finishGame = async (answers: number[]) => {
    if (hasSubmitted || isSubmitting) return
    setHasSubmitted(true)

    const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    setTimeTaken(duration)

    let correctCount = 0
    rounds.forEach((r, idx) => {
      if (answers[idx] === r.correct) {
        correctCount++
      }
    })

    const calcAccuracy = Math.round((correctCount / rounds.length) * 100)
    setAccuracy(calcAccuracy)
    const rawScore = calcAccuracy
    const consistency = calcAccuracy >= 75 ? 100 : calcAccuracy >= 50 ? 75 : 50

    setIsSubmitting(true)
    let calculatedFinalScore = calcAccuracy

    try {
      const patientIdStr = typeof window !== 'undefined' ? localStorage.getItem('patient_id') : null
      const patientId = patientIdStr ? Number(patientIdStr) : 1
      const res = await api.submitGameSession({
        patientId,
        activityId: 'ACT-013',
        rawScore,
        accuracy: calcAccuracy / 100,
        timeTaken: duration,
        consistency: consistency / 100,
      })
      if (res && res.finalScore !== undefined) {
        calculatedFinalScore = Math.round(res.finalScore)
      }
    } catch (err: any) {
      console.error('Failed to submit number sequence session:', {
        message: err?.message,
        status: err?.status,
        response: err?.response,
        raw: err
      })
    } finally {
      setIsSubmitting(false)
      setFinalScore(calculatedFinalScore)
      setPhase('result')
      if (onGameEnd) {
        onGameEnd(calculatedFinalScore)
      }
    }
  }

  const currentRound = rounds[currentIdx]

  return (
    <Card className="border border-border shadow-md max-w-2xl mx-auto p-6 space-y-6 bg-card text-card-foreground">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
          <Hash className="w-8 h-8" />
        </div>
        <CardTitle className="text-3xl font-bold">Number Sequence</CardTitle>
        <CardDescription className="text-base font-medium text-muted-foreground">
          {phase === 'play' && `Round ${currentIdx + 1} of ${rounds.length}: What is the missing number?`}
          {phase === 'result' && 'Activity Completed'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* PLAY PHASE */}
        {phase === 'play' && currentRound && (
          <div className="space-y-6 text-center">
            {/* Sequence Display Card */}
            <div className="p-8 bg-primary/5 border-2 border-primary/20 rounded-2xl max-w-lg mx-auto shadow-sm">
              <span className="text-3xl sm:text-4xl font-black tracking-widest text-primary">
                {currentRound.sequence}
              </span>
            </div>

            {/* 4 Options */}
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {currentRound.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleSelectOption(option)}
                  className="p-6 text-3xl font-extrabold rounded-xl border-2 bg-card hover:bg-primary/10 hover:border-primary text-foreground transition-all shadow-sm cursor-pointer"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* RESULT PHASE */}
        {phase === 'result' && (
          <div className="space-y-6 text-center">
            <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl space-y-4">
              <div className="flex justify-center text-primary">
                <Trophy className="w-16 h-16" />
              </div>
              <h3 className="text-2xl font-bold">Sequence Complete!</h3>
              <div className="grid grid-cols-3 gap-4 py-2">
                <div className="p-3 bg-card rounded-xl border">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Final Score</p>
                  <p className="text-3xl font-extrabold text-primary">{finalScore}</p>
                </div>
                <div className="p-3 bg-card rounded-xl border">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Accuracy</p>
                  <p className="text-3xl font-extrabold text-emerald-600">{accuracy}%</p>
                </div>
                <div className="p-3 bg-card rounded-xl border">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Time Taken</p>
                  <p className="text-3xl font-extrabold text-amber-600">{timeTaken}s</p>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-2 text-left">
              {rounds.map((r, idx) => {
                const isCorrect = userAnswers[idx] === r.correct
                return (
                  <div key={idx} className="p-3 rounded-lg border flex items-center justify-between bg-muted/20 text-sm">
                    <div>
                      <p className="font-bold">{r.sequence.replace('❓', r.correct.toString())}</p>
                      <p className="text-xs text-muted-foreground">Your answer: {userAnswers[idx]}</p>
                    </div>
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                )
              })}
            </div>

            <Button
              onClick={initGame}
              variant="outline"
              className="w-full py-6 text-lg font-bold flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              Play Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

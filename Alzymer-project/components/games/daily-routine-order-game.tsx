'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ListOrdered, Trophy, RotateCcw, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'

interface RoutineItem {
  id: string
  correctOrder: number
  text: string
  emoji: string
}

const CORRECT_ROUTINE: RoutineItem[] = [
  { id: '1', correctOrder: 1, text: 'Wake up in the morning', emoji: '🌅' },
  { id: '2', correctOrder: 2, text: 'Brush teeth & wash face', emoji: '🪥' },
  { id: '3', correctOrder: 3, text: 'Eat a healthy breakfast', emoji: '🥣' },
  { id: '4', correctOrder: 4, text: 'Get dressed for the day', emoji: '👕' },
]

interface GameProps {
  activityConfig?: any
  onGameEnd?: (score: number) => void
}

export default function DailyRoutineOrderGame({ activityConfig, onGameEnd }: GameProps) {
  const [items, setItems] = useState<RoutineItem[]>([])
  const [phase, setPhase] = useState<'play' | 'result'>('play')
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
    // Shuffle the items randomly
    const shuffled = [...CORRECT_ROUTINE].sort(() => Math.random() - 0.5)
    setItems(shuffled)
    setPhase('play')
    setStartTime(Date.now())
    setHasSubmitted(false)
  }

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === items.length - 1) return

    const newItems = [...items]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const temp = newItems[index]
    newItems[index] = newItems[targetIndex]
    newItems[targetIndex] = temp
    setItems(newItems)
  }

  const handleSubmit = async () => {
    if (hasSubmitted || isSubmitting) return
    setHasSubmitted(true)

    const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    setTimeTaken(duration)

    // Calculate how many items are in correct positions (1..4)
    let correctCount = 0
    items.forEach((item, index) => {
      if (item.correctOrder === index + 1) {
        correctCount++
      }
    })

    const calcAccuracy = Math.round((correctCount / items.length) * 100)
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
        activityId: 'ACT-012',
        rawScore,
        accuracy: calcAccuracy / 100,
        timeTaken: duration,
        consistency: consistency / 100,
      })
      if (res && res.finalScore !== undefined) {
        calculatedFinalScore = Math.round(res.finalScore)
      }
    } catch (err: any) {
      console.error('Failed to submit daily routine order session:', {
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

  return (
    <Card className="border border-border shadow-md max-w-2xl mx-auto p-6 space-y-6 bg-card text-card-foreground">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
          <ListOrdered className="w-8 h-8" />
        </div>
        <CardTitle className="text-3xl font-bold">Daily Routine Order</CardTitle>
        <CardDescription className="text-base font-medium text-muted-foreground">
          {phase === 'play' && 'Arrange these daily steps into the correct order (1st to 4th)'}
          {phase === 'result' && 'Activity Completed'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* PLAY PHASE */}
        {phase === 'play' && (
          <div className="space-y-6">
            <div className="space-y-3 max-w-lg mx-auto">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 bg-muted/40 border-2 rounded-xl flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-extrabold flex items-center justify-center text-lg">
                      {idx + 1}
                    </span>
                    <span className="text-3xl">{item.emoji}</span>
                    <span className="font-bold text-lg text-foreground">{item.text}</span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={idx === 0}
                      onClick={() => moveItem(idx, 'up')}
                      className="h-8 w-8"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={idx === items.length - 1}
                      onClick={() => moveItem(idx, 'down')}
                      className="h-8 w-8"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-10 py-6 text-xl font-bold"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Routine Order'}
              </Button>
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
              <h3 className="text-2xl font-bold">Routine Order Complete!</h3>
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
              <p className="text-sm font-semibold text-muted-foreground">Your Submitted Sequence:</p>
              {items.map((item, idx) => {
                const isCorrectPos = item.correctOrder === idx + 1
                return (
                  <div key={item.id} className="p-3 rounded-lg border flex items-center justify-between bg-muted/20 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-bold">{idx + 1}.</span>
                      <span>{item.emoji}</span>
                      <span className="font-semibold">{item.text}</span>
                    </div>
                    {isCorrectPos ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Correct Position
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Correct step #{item.correctOrder}</span>
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

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Eye, Trophy, RotateCcw, CheckCircle2, XCircle } from 'lucide-react'
import { api } from '@/lib/api'

interface NamingItem {
  emoji: string
  correct: string
  options: string[]
}

const ITEM_SET: NamingItem[] = [
  { emoji: '🍎', correct: 'Apple', options: ['Apple', 'Cherry', 'Tomato', 'Strawberry'] },
  { emoji: '⏰', correct: 'Alarm Clock', options: ['Alarm Clock', 'Watch', 'Compass', 'Hourglass'] },
  { emoji: '🔑', correct: 'Key', options: ['Key', 'Lock', 'Door', 'Coin'] },
  { emoji: '🚗', correct: 'Car', options: ['Car', 'Bus', 'Bicycle', 'Train'] },
  { emoji: '📚', correct: 'Books', options: ['Books', 'Notebook', 'Newspaper', 'Envelope'] },
]

interface GameProps {
  activityConfig?: any
  onGameEnd?: (score: number) => void
}

export default function ObjectNamingGame({ activityConfig, onGameEnd }: GameProps) {
  const [phase, setPhase] = useState<'play' | 'result'>('play')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [items, setItems] = useState<NamingItem[]>([])
  const [userSelections, setUserSelections] = useState<string[]>([])
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
    // Shuffle options for each item
    const shuffledItems = ITEM_SET.map((item) => ({
      ...item,
      options: [...item.options].sort(() => Math.random() - 0.5),
    })).sort(() => Math.random() - 0.5)

    setItems(shuffledItems)
    setCurrentIdx(0)
    setUserSelections([])
    setPhase('play')
    setStartTime(Date.now())
    setHasSubmitted(false)
  }

  const handleSelect = (selectedName: string) => {
    const updated = [...userSelections, selectedName]
    setUserSelections(updated)

    if (currentIdx + 1 < items.length) {
      setCurrentIdx(currentIdx + 1)
    } else {
      finishGame(updated)
    }
  }

  const finishGame = async (selections: string[]) => {
    if (hasSubmitted || isSubmitting) return
    setHasSubmitted(true)

    const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    setTimeTaken(duration)

    let correctCount = 0
    items.forEach((item, idx) => {
      if (selections[idx] === item.correct) {
        correctCount++
      }
    })

    const calcAccuracy = Math.round((correctCount / items.length) * 100)
    setAccuracy(calcAccuracy)
    const rawScore = calcAccuracy
    const consistency = calcAccuracy >= 80 ? 100 : calcAccuracy >= 60 ? 75 : 50

    setIsSubmitting(true)
    let calculatedFinalScore = calcAccuracy

    try {
      const patientIdStr = typeof window !== 'undefined' ? localStorage.getItem('patient_id') : null
      const patientId = patientIdStr ? Number(patientIdStr) : 1
      const res = await api.submitGameSession({
        patientId,
        activityId: 'ACT-002',
        rawScore,
        accuracy: calcAccuracy / 100,
        timeTaken: duration,
        consistency: consistency / 100,
      })
      if (res && res.finalScore !== undefined) {
        calculatedFinalScore = Math.round(res.finalScore)
      }
    } catch (err: any) {
      console.error('Failed to submit object naming session:', {
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

  const currentItem = items[currentIdx]

  return (
    <Card className="border border-border shadow-md max-w-2xl mx-auto p-6 space-y-6 bg-card text-card-foreground">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
          <Eye className="w-8 h-8" />
        </div>
        <CardTitle className="text-3xl font-bold">Object Naming</CardTitle>
        <CardDescription className="text-base font-medium text-muted-foreground">
          {phase === 'play' && `Object ${currentIdx + 1} of ${items.length}: What is this object?`}
          {phase === 'result' && 'Activity Completed'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* PLAY PHASE */}
        {phase === 'play' && currentItem && (
          <div className="space-y-6 text-center">
            {/* Object Emoji Card */}
            <div className="p-8 bg-muted/20 border-2 rounded-2xl inline-block shadow-sm">
              <span className="text-8xl select-none">{currentItem.emoji}</span>
            </div>

            {/* 4 Text Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
              {currentItem.options.map((option) => (
                <button
                  key={option}
                  onClick={() => handleSelect(option)}
                  className="p-5 text-xl font-bold rounded-xl border-2 bg-card hover:bg-primary/10 hover:border-primary text-foreground transition-all shadow-sm cursor-pointer"
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
              <h3 className="text-2xl font-bold">Object Naming Complete!</h3>
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

            {/* Summary List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {items.map((item, idx) => {
                const isCorrect = userSelections[idx] === item.correct
                return (
                  <div key={idx} className="p-3 rounded-lg border flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{item.emoji}</span>
                      <div>
                        <p className="font-bold text-sm">{item.correct}</p>
                        <p className="text-xs text-muted-foreground">You said: {userSelections[idx]}</p>
                      </div>
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

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Palette, Trophy, RotateCcw, CheckCircle2, XCircle } from 'lucide-react'
import { api } from '@/lib/api'

interface MatchRound {
  colorName: string
  bgCss: string
  textCss: string
  targetEmoji: string
  targetName: string
  options: { emoji: string; name: string }[]
}

const ROUNDS: MatchRound[] = [
  {
    colorName: 'Red',
    bgCss: 'bg-red-500',
    textCss: 'text-red-500',
    targetEmoji: '🍎',
    targetName: 'Apple',
    options: [
      { emoji: '🍎', name: 'Apple' },
      { emoji: '🍌', name: 'Banana' },
      { emoji: '🥦', name: 'Broccoli' },
      { emoji: '🫐', name: 'Blueberry' },
    ],
  },
  {
    colorName: 'Yellow',
    bgCss: 'bg-amber-400',
    textCss: 'text-amber-500',
    targetEmoji: '🍌',
    targetName: 'Banana',
    options: [
      { emoji: '🍓', name: 'Strawberry' },
      { emoji: '🍌', name: 'Banana' },
      { emoji: '🍇', name: 'Grapes' },
      { emoji: '🥑', name: 'Avocado' },
    ],
  },
  {
    colorName: 'Green',
    bgCss: 'bg-emerald-500',
    textCss: 'text-emerald-500',
    targetEmoji: '🥦',
    targetName: 'Broccoli',
    options: [
      { emoji: '🍒', name: 'Cherry' },
      { emoji: '🍊', name: 'Orange' },
      { emoji: '🥦', name: 'Broccoli' },
      { emoji: '🍆', name: 'Eggplant' },
    ],
  },
  {
    colorName: 'Blue',
    bgCss: 'bg-sky-500',
    textCss: 'text-sky-500',
    targetEmoji: '🫐',
    targetName: 'Blueberry',
    options: [
      { emoji: '🍋', name: 'Lemon' },
      { emoji: '🍎', name: 'Apple' },
      { emoji: '🥕', name: 'Carrot' },
      { emoji: '🫐', name: 'Blueberry' },
    ],
  },
  {
    colorName: 'Purple',
    bgCss: 'bg-purple-500',
    textCss: 'text-purple-500',
    targetEmoji: '🍇',
    targetName: 'Grapes',
    options: [
      { emoji: '🌽', name: 'Corn' },
      { emoji: '🍇', name: 'Grapes' },
      { emoji: '🍉', name: 'Watermelon' },
      { emoji: '🍐', name: 'Pear' },
    ],
  },
]

interface GameProps {
  activityConfig?: any
  onGameEnd?: (score: number) => void
}

export default function ColourObjectMatchGame({ activityConfig, onGameEnd }: GameProps) {
  const [phase, setPhase] = useState<'play' | 'result'>('play')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [rounds, setRounds] = useState<MatchRound[]>([])
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
    const preparedRounds = ROUNDS.map((r) => ({
      ...r,
      options: [...r.options].sort(() => Math.random() - 0.5),
    })).sort(() => Math.random() - 0.5)

    setRounds(preparedRounds)
    setCurrentIdx(0)
    setUserSelections([])
    setPhase('play')
    setStartTime(Date.now())
    setHasSubmitted(false)
  }

  const handleSelectOption = (name: string) => {
    const updated = [...userSelections, name]
    setUserSelections(updated)

    if (currentIdx + 1 < rounds.length) {
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
    rounds.forEach((r, idx) => {
      if (selections[idx] === r.targetName) {
        correctCount++
      }
    })

    const calcAccuracy = Math.round((correctCount / rounds.length) * 100)
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
        activityId: 'ACT-006',
        rawScore,
        accuracy: calcAccuracy / 100,
        timeTaken: duration,
        consistency: consistency / 100,
      })
      if (res && res.finalScore !== undefined) {
        calculatedFinalScore = Math.round(res.finalScore)
      }
    } catch (err: any) {
      console.error('Failed to submit colour-object match session:', {
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
          <Palette className="w-8 h-8" />
        </div>
        <CardTitle className="text-3xl font-bold">Colour-Object Match</CardTitle>
        <CardDescription className="text-base font-medium text-muted-foreground">
          {phase === 'play' && `Round ${currentIdx + 1} of ${rounds.length}: Which object matches this colour?`}
          {phase === 'result' && 'Activity Completed'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* PLAY PHASE */}
        {phase === 'play' && currentRound && (
          <div className="space-y-6 text-center">
            {/* Color Swatch Card */}
            <div className="p-8 bg-muted/20 border-2 rounded-2xl flex flex-col items-center justify-center max-w-xs mx-auto gap-3">
              <div className={`w-24 h-24 rounded-full shadow-lg border-4 border-white ${currentRound.bgCss}`} />
              <span className={`text-2xl font-extrabold ${currentRound.textCss}`}>
                {currentRound.colorName}
              </span>
            </div>

            {/* 4 Object Options */}
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {currentRound.options.map((opt) => (
                <button
                  key={opt.name}
                  onClick={() => handleSelectOption(opt.name)}
                  className="p-5 text-xl font-bold rounded-xl border-2 bg-card hover:bg-primary/10 hover:border-primary text-foreground transition-all shadow-sm cursor-pointer flex flex-col items-center gap-2"
                >
                  <span className="text-4xl">{opt.emoji}</span>
                  <span>{opt.name}</span>
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
              <h3 className="text-2xl font-bold">Colour Match Complete!</h3>
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

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {rounds.map((r, idx) => {
                const isCorrect = userSelections[idx] === r.targetName
                return (
                  <div key={idx} className="p-3 rounded-lg border flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${r.bgCss}`} />
                      <div>
                        <p className="font-bold text-sm">{r.colorName} → {r.targetEmoji} {r.targetName}</p>
                        <p className="text-xs text-muted-foreground">Chosen: {userSelections[idx]}</p>
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

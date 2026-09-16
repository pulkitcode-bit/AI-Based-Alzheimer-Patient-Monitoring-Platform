'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Shapes, Trophy, RotateCcw } from 'lucide-react'
import { api } from '@/lib/api'

interface ShapeCard {
  id: number
  shape: string
  label: string
  isFlipped: boolean
  isMatched: boolean
}

const SHAPES_POOL = [
  { shape: '🔴', label: 'Circle' },
  { shape: '🟦', label: 'Square' },
  { shape: '🔺', label: 'Triangle' },
  { shape: '⭐', label: 'Star' },
]

interface GameProps {
  activityConfig?: any
  onGameEnd?: (score: number) => void
}

export default function ShapeMatchingGame({ activityConfig, onGameEnd }: GameProps) {
  const [cards, setCards] = useState<ShapeCard[]>([])
  const [flippedIndices, setFlippedIndices] = useState<number[]>([])
  const [flipsCount, setFlipsCount] = useState<number>(0)
  const [matchedPairs, setMatchedPairs] = useState<number>(0)
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
    // Duplicate pool to make pairs
    const deck = [...SHAPES_POOL, ...SHAPES_POOL]
      .sort(() => Math.random() - 0.5)
      .map((item, idx) => ({
        id: idx,
        shape: item.shape,
        label: item.label,
        isFlipped: false,
        isMatched: false,
      }))

    setCards(deck)
    setFlippedIndices([])
    setFlipsCount(0)
    setMatchedPairs(0)
    setPhase('play')
    setStartTime(Date.now())
    setHasSubmitted(false)
  }

  const handleCardClick = (index: number) => {
    if (phase !== 'play') return
    if (cards[index].isFlipped || cards[index].isMatched) return
    if (flippedIndices.length >= 2) return

    const newFlipped = [...flippedIndices, index]
    const newCards = [...cards]
    newCards[index].isFlipped = true
    setCards(newCards)
    setFlippedIndices(newFlipped)

    if (newFlipped.length === 2) {
      setFlipsCount((prev) => prev + 1)
      const [firstIdx, secondIdx] = newFlipped
      if (newCards[firstIdx].shape === newCards[secondIdx].shape) {
        // Match!
        newCards[firstIdx].isMatched = true
        newCards[secondIdx].isMatched = true
        setCards(newCards)
        setFlippedIndices([])
        const newMatchedCount = matchedPairs + 1
        setMatchedPairs(newMatchedCount)

        if (newMatchedCount === SHAPES_POOL.length) {
          finishGame(flipsCount + 1)
        }
      } else {
        // Unflip after brief pause
        setTimeout(() => {
          setCards((prevCards) =>
            prevCards.map((c, i) =>
              i === firstIdx || i === secondIdx ? { ...c, isFlipped: false } : c
            )
          )
          setFlippedIndices([])
        }, 900)
      }
    }
  }

  const finishGame = async (totalFlips: number) => {
    if (hasSubmitted || isSubmitting) return
    setHasSubmitted(true)

    const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    setTimeTaken(duration)

    // Ideal min flips = SHAPES_POOL.length (4)
    // Accuracy formula: (idealFlips / totalFlips) * 100
    const calcAccuracy = Math.min(100, Math.max(20, Math.round((SHAPES_POOL.length / totalFlips) * 100)))
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
        activityId: 'ACT-005',
        rawScore,
        accuracy: calcAccuracy / 100,
        timeTaken: duration,
        consistency: consistency / 100,
      })
      if (res && res.finalScore !== undefined) {
        calculatedFinalScore = Math.round(res.finalScore)
      }
    } catch (err: any) {
      console.error('Failed to submit shape matching session:', {
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
          <Shapes className="w-8 h-8" />
        </div>
        <CardTitle className="text-3xl font-bold">Shape Matching</CardTitle>
        <CardDescription className="text-base font-medium text-muted-foreground">
          {phase === 'play' && `Tap cards to find matching pairs of shapes (${matchedPairs} / ${SHAPES_POOL.length} matched)`}
          {phase === 'result' && 'Activity Completed'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* PLAY PHASE */}
        {phase === 'play' && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
              {cards.map((card, idx) => (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(idx)}
                  className={`aspect-square rounded-2xl text-4xl border-4 transition-all duration-300 shadow-sm flex flex-col items-center justify-center cursor-pointer ${
                    card.isFlipped || card.isMatched
                      ? 'bg-primary/10 border-primary shadow-md rotate-0'
                      : 'bg-muted border-border hover:border-primary/50'
                  }`}
                >
                  {card.isFlipped || card.isMatched ? (
                    <span className="animate-scale-in">{card.shape}</span>
                  ) : (
                    <span className="text-2xl text-muted-foreground">❓</span>
                  )}
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
              <h3 className="text-2xl font-bold">Matching Complete!</h3>
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

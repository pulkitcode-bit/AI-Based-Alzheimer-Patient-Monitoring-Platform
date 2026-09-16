'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Brain, Trophy, RotateCcw, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { api } from '@/lib/api'

const WORD_POOL = [
  'Apple', 'Chair', 'River', 'Pencil', 'Garden', 'Bottle',
  'Window', 'Mountain', 'Candle', 'Bridge', 'Umbrella', 'Kitchen'
]

interface GameProps {
  activityConfig?: any
  onGameEnd?: (score: number) => void
}

export default function WordRecallGame({ activityConfig, onGameEnd }: GameProps) {
  const [phase, setPhase] = useState<'memorize' | 'recall' | 'result'>('memorize')
  const [targetWords, setTargetWords] = useState<string[]>([])
  const [options, setOptions] = useState<string[]>([])
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const [countdown, setCountdown] = useState(6)
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
    const shuffled = [...WORD_POOL].sort(() => Math.random() - 0.5)
    const targets = shuffled.slice(0, 4)
    const distractors = shuffled.slice(4, 8)
    const recallPool = [...targets, ...distractors].sort(() => Math.random() - 0.5)

    setTargetWords(targets)
    setOptions(recallPool)
    setSelectedWords([])
    setPhase('memorize')
    setCountdown(6)
    setStartTime(Date.now())
    setHasSubmitted(false)
  }

  // Timer for memorize phase
  useEffect(() => {
    if (phase !== 'memorize') return
    if (countdown <= 0) {
      setPhase('recall')
      return
    }
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [phase, countdown])

  const toggleSelectWord = (word: string) => {
    if (phase !== 'recall') return
    setSelectedWords((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word]
    )
  }

  const handleSubmitRecall = async () => {
    if (hasSubmitted || isSubmitting) return
    setHasSubmitted(true)

    const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    setTimeTaken(duration)

    // Calculate accuracy: how many selected words are in targetWords vs total targets
    const correctCount = selectedWords.filter((w) => targetWords.includes(w)).length
    const wrongCount = selectedWords.filter((w) => !targetWords.includes(w)).length
    
    // Accuracy score percentage out of 100
    const calcAccuracy = Math.max(0, Math.round(((correctCount - wrongCount * 0.5) / targetWords.length) * 100))
    setAccuracy(calcAccuracy)
    const rawScore = calcAccuracy
    const consistency = calcAccuracy >= 75 ? 100 : calcAccuracy >= 50 ? 75 : 50

    setIsSubmitting(true)
    let calculatedFinalScore = calcAccuracy

    try {
      const patientIdStr = typeof window !== 'undefined' ? localStorage.getItem('patient_id') : null
      const patientId = patientIdStr ? Number(patientIdStr) : 1
      const accuracyDecimal = calcAccuracy / 100
      const consistencyDecimal = consistency / 100

      const res = await api.submitGameSession({
        patientId,
        activityId: 'ACT-001',
        rawScore,
        accuracy: accuracyDecimal,
        timeTaken: duration,
        consistency: consistencyDecimal,
      })
      if (res && res.finalScore !== undefined) {
        calculatedFinalScore = Math.round(res.finalScore)
      }
    } catch (err: any) {
      console.error('Failed to submit game session:', {
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
          <Brain className="w-8 h-8" />
        </div>
        <CardTitle className="text-3xl font-bold">Word Recall</CardTitle>
        <CardDescription className="text-base font-medium text-muted-foreground">
          {phase === 'memorize' && 'Memorize the words shown on the screen'}
          {phase === 'recall' && 'Select the words you remember seeing'}
          {phase === 'result' && 'Activity Completed'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* PHASE 1: MEMORIZE */}
        {phase === 'memorize' && (
          <div className="space-y-6 text-center">
            <div className="flex items-center justify-center gap-2 text-primary font-bold text-lg">
              <Clock className="w-5 h-5 animate-pulse" />
              <span>Memorize phase: {countdown}s remaining</span>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {targetWords.map((word) => (
                <div
                  key={word}
                  className="p-6 text-2xl font-extrabold bg-primary/10 text-primary border-2 border-primary/20 rounded-xl shadow-sm tracking-wide animate-pulse"
                >
                  {word}
                </div>
              ))}
            </div>

            <Button
              onClick={() => setPhase('recall')}
              className="mt-4 px-8 py-6 text-lg font-bold"
            >
              I'm Ready Now
            </Button>
          </div>
        )}

        {/* PHASE 2: RECALL */}
        {phase === 'recall' && (
          <div className="space-y-6">
            <p className="text-center text-lg font-semibold text-muted-foreground">
              Which 4 words did you just see? Tap to select them:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {options.map((word) => {
                const isSelected = selectedWords.includes(word)
                return (
                  <button
                    key={word}
                    onClick={() => toggleSelectWord(word)}
                    className={`p-4 text-xl font-bold rounded-xl border-2 transition-all cursor-pointer min-h-[70px] flex items-center justify-center ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                        : 'bg-muted/40 hover:bg-muted text-foreground border-border'
                    }`}
                  >
                    {word}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={handleSubmitRecall}
                disabled={selectedWords.length === 0 || isSubmitting}
                className="px-10 py-6 text-xl font-bold"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Answers'}
              </Button>
            </div>
          </div>
        )}

        {/* PHASE 3: RESULT */}
        {phase === 'result' && (
          <div className="space-y-6 text-center">
            <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl space-y-4">
              <div className="flex justify-center text-primary">
                <Trophy className="w-16 h-16" />
              </div>
              <h3 className="text-2xl font-bold">Great Job!</h3>
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

            {/* Answer breakdown */}
            <div className="text-left space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Original Words:</p>
              <div className="flex flex-wrap gap-2">
                {targetWords.map((word) => {
                  const wasFound = selectedWords.includes(word)
                  return (
                    <span
                      key={word}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold border ${
                        wasFound
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      {wasFound ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-amber-600" />}
                      {word}
                    </span>
                  )
                })}
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

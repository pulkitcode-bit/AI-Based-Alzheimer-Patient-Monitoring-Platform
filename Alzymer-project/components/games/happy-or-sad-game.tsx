'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Smile, Trophy, RotateCcw, CheckCircle2, XCircle } from 'lucide-react'
import { api } from '@/lib/api'

// ── Data ───────────────────────────────────────────────────────────────────

interface Scenario {
  id: number
  emoji: string
  description: string
  correctAnswer: 'happy' | 'sad'
}

const ALL_SCENARIOS: Scenario[] = [
  { id: 1, emoji: '🎂', description: 'It is your birthday and friends brought cake', correctAnswer: 'happy' },
  { id: 2, emoji: '🌧️', description: 'Your outdoor picnic got cancelled because of rain', correctAnswer: 'sad' },
  { id: 3, emoji: '🐶', description: 'A playful puppy runs to greet you at the door', correctAnswer: 'happy' },
  { id: 4, emoji: '💔', description: 'You lost your favourite toy and cannot find it', correctAnswer: 'sad' },
  { id: 5, emoji: '🎁', description: 'You receive an unexpected gift from a friend', correctAnswer: 'happy' },
  { id: 6, emoji: '😢', description: 'Your best friend had to move to a different city', correctAnswer: 'sad' },
  { id: 7, emoji: '🌈', description: 'You see a beautiful rainbow after the rain stops', correctAnswer: 'happy' },
  { id: 8, emoji: '🏆', description: 'You won first place in a competition', correctAnswer: 'happy' },
  { id: 9, emoji: '📱', description: 'You accidentally broke your phone screen', correctAnswer: 'sad' },
  { id: 10, emoji: '🎵', description: 'Your favourite song comes on the radio', correctAnswer: 'happy' },
  { id: 11, emoji: '🌻', description: 'The flowers you planted have bloomed beautifully', correctAnswer: 'happy' },
  { id: 12, emoji: '😞', description: 'Nobody remembered your special day', correctAnswer: 'sad' },
]

// ── Types ──────────────────────────────────────────────────────────────────

interface ActivityConfig {
  activityId: string
  activityName: string
  category: string
  difficultyLevel: string
  baseScore: number
  expectedTimeSec: number
  targetSkill: string
  successThreshold: number
  accuracyWeight: number
  speedWeight: number
  consistencyWeight: number
}

interface GameProps {
  activityConfig?: ActivityConfig
  onGameEnd?: (score: number) => void
}

// ── Component ──────────────────────────────────────────────────────────────

export default function HappyOrSadGame({ activityConfig, onGameEnd }: GameProps) {
  const TOTAL_ROUNDS = 8

  const [phase, setPhase] = useState<'play' | 'feedback' | 'result'>('play')
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [userAnswers, setUserAnswers] = useState<('happy' | 'sad')[]>([])
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [startTime, setStartTime] = useState<number>(0)
  const [timeTaken, setTimeTaken] = useState<number>(0)
  const [accuracy, setAccuracy] = useState<number>(0)
  const [finalScore, setFinalScore] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  useEffect(() => {
    initGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initGame = () => {
    const shuffled = [...ALL_SCENARIOS].sort(() => Math.random() - 0.5)
    setScenarios(shuffled.slice(0, TOTAL_ROUNDS))
    setCurrentIdx(0)
    setUserAnswers([])
    setLastCorrect(null)
    setPhase('play')
    setStartTime(Date.now())
    setHasSubmitted(false)
  }

  const handleAnswer = (answer: 'happy' | 'sad') => {
    if (phase !== 'play') return

    const correct = scenarios[currentIdx].correctAnswer === answer
    setLastCorrect(correct)
    const updated = [...userAnswers, answer]
    setUserAnswers(updated)
    setPhase('feedback')

    setTimeout(() => {
      if (currentIdx + 1 < scenarios.length) {
        setCurrentIdx(currentIdx + 1)
        setLastCorrect(null)
        setPhase('play')
      } else {
        finishGame(updated)
      }
    }, 1200)
  }

  const finishGame = async (allAnswers: ('happy' | 'sad')[]) => {
    if (hasSubmitted || isSubmitting) return
    setHasSubmitted(true)

    const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    setTimeTaken(duration)

    let correctCount = 0
    scenarios.forEach((s, idx) => {
      if (allAnswers[idx] === s.correctAnswer) correctCount++
    })

    const calcAccuracy = Math.round((correctCount / scenarios.length) * 100)
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
        activityId: activityConfig?.activityId || 'ACT-015',
        rawScore,
        accuracy: calcAccuracy / 100,
        timeTaken: duration,
        consistency: consistency / 100,
      })
      if (res && res.finalScore !== undefined) {
        calculatedFinalScore = Math.round(res.finalScore)
      }
    } catch (err: any) {
      console.error('Failed to submit happy-or-sad session:', {
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

  const currentScenario = scenarios[currentIdx]

  return (
    <Card className="border border-border shadow-md max-w-2xl mx-auto p-6 space-y-6 bg-card text-card-foreground">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
          <Smile className="w-8 h-8" />
        </div>
        <CardTitle className="text-3xl font-bold">Happy or Sad?</CardTitle>
        <CardDescription className="text-base font-medium text-muted-foreground">
          {(phase === 'play' || phase === 'feedback') && `Scenario ${currentIdx + 1} of ${scenarios.length}: How would this make you feel?`}
          {phase === 'result' && 'Activity Completed'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* PLAY / FEEDBACK PHASE */}
        {(phase === 'play' || phase === 'feedback') && currentScenario && (
          <div className="space-y-6 text-center">
            {/* Scenario Card */}
            <div className="p-8 bg-muted/20 border-2 rounded-2xl flex flex-col items-center justify-center max-w-sm mx-auto gap-4">
              <span className="text-7xl">{currentScenario.emoji}</span>
              <p className="text-lg font-semibold text-foreground leading-relaxed">
                {currentScenario.description}
              </p>
            </div>

            {/* Feedback Banner */}
            {phase === 'feedback' && lastCorrect !== null && (
              <div className={`p-3 rounded-xl border-2 text-lg font-bold ${
                lastCorrect
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-red-50 border-red-300 text-red-700'
              }`}>
                {lastCorrect ? '✓ Correct!' : '✗ Not quite — the correct answer was ' + currentScenario.correctAnswer}
              </div>
            )}

            {/* Answer Buttons */}
            <div className="grid grid-cols-2 gap-6 max-w-md mx-auto">
              <button
                onClick={() => handleAnswer('happy')}
                disabled={phase === 'feedback' || isSubmitting}
                className={`p-6 text-center rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-2 ${
                  phase === 'feedback' && userAnswers[currentIdx] === 'happy'
                    ? lastCorrect
                      ? 'bg-emerald-100 border-emerald-400 scale-105'
                      : 'bg-red-100 border-red-400 scale-95'
                    : 'bg-amber-50 hover:bg-amber-100 border-amber-200 hover:border-amber-400 hover:scale-105'
                } ${phase === 'feedback' ? 'pointer-events-none' : ''}`}
              >
                <span className="text-6xl">😊</span>
                <span className="text-xl font-bold text-amber-800">Happy</span>
              </button>
              <button
                onClick={() => handleAnswer('sad')}
                disabled={phase === 'feedback' || isSubmitting}
                className={`p-6 text-center rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-2 ${
                  phase === 'feedback' && userAnswers[currentIdx] === 'sad'
                    ? lastCorrect
                      ? 'bg-emerald-100 border-emerald-400 scale-105'
                      : 'bg-red-100 border-red-400 scale-95'
                    : 'bg-blue-50 hover:bg-blue-100 border-blue-200 hover:border-blue-400 hover:scale-105'
                } ${phase === 'feedback' ? 'pointer-events-none' : ''}`}
              >
                <span className="text-6xl">😢</span>
                <span className="text-xl font-bold text-blue-800">Sad</span>
              </button>
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
              <h3 className="text-2xl font-bold">Emotion Recognition Complete!</h3>
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

            {/* Answer Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {scenarios.map((s, idx) => {
                const isCorrect = userAnswers[idx] === s.correctAnswer
                return (
                  <div key={s.id} className="p-3 rounded-lg border flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{s.emoji}</span>
                      <div>
                        <p className="font-bold text-sm">{s.correctAnswer === 'happy' ? '😊' : '😢'} {s.correctAnswer}</p>
                        <p className="text-xs text-muted-foreground">You chose: {userAnswers[idx]}</p>
                      </div>
                    </div>
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive shrink-0" />
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

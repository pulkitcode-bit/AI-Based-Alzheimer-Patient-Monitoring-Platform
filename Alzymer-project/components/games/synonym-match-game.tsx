'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BookOpen, Trophy, RotateCcw, CheckCircle2, XCircle } from 'lucide-react'
import { api } from '@/lib/api'

// ── Data ───────────────────────────────────────────────────────────────────

interface WordRound {
  word: string
  correctSynonym: string
  options: string[]
}

const ALL_ROUNDS: WordRound[] = [
  { word: 'Happy', correctSynonym: 'Joyful', options: ['Joyful', 'Angry', 'Tired', 'Quiet'] },
  { word: 'Big', correctSynonym: 'Large', options: ['Tiny', 'Large', 'Narrow', 'Hollow'] },
  { word: 'Fast', correctSynonym: 'Quick', options: ['Slow', 'Heavy', 'Quick', 'Dull'] },
  { word: 'Smart', correctSynonym: 'Clever', options: ['Foolish', 'Clever', 'Lazy', 'Rough'] },
  { word: 'Beautiful', correctSynonym: 'Pretty', options: ['Ugly', 'Plain', 'Pretty', 'Dark'] },
  { word: 'Brave', correctSynonym: 'Courageous', options: ['Timid', 'Courageous', 'Calm', 'Weak'] },
  { word: 'Cold', correctSynonym: 'Chilly', options: ['Warm', 'Chilly', 'Bright', 'Smooth'] },
  { word: 'Start', correctSynonym: 'Begin', options: ['End', 'Stop', 'Begin', 'Wait'] },
  { word: 'Tiny', correctSynonym: 'Small', options: ['Huge', 'Small', 'Wide', 'Tall'] },
  { word: 'Angry', correctSynonym: 'Furious', options: ['Calm', 'Furious', 'Gentle', 'Kind'] },
  { word: 'Quiet', correctSynonym: 'Silent', options: ['Loud', 'Noisy', 'Silent', 'Bright'] },
  { word: 'Old', correctSynonym: 'Ancient', options: ['Modern', 'Ancient', 'Fresh', 'Young'] },
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

export default function SynonymMatchGame({ activityConfig, onGameEnd }: GameProps) {
  const TOTAL_ROUNDS = 8

  const [phase, setPhase] = useState<'play' | 'feedback' | 'result'>('play')
  const [rounds, setRounds] = useState<WordRound[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [userSelections, setUserSelections] = useState<string[]>([])
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
    const shuffled = [...ALL_ROUNDS].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, TOTAL_ROUNDS).map((r) => ({
      ...r,
      options: [...r.options].sort(() => Math.random() - 0.5),
    }))
    setRounds(selected)
    setCurrentIdx(0)
    setUserSelections([])
    setLastCorrect(null)
    setPhase('play')
    setStartTime(Date.now())
    setHasSubmitted(false)
  }

  const handleSelectOption = (option: string) => {
    if (phase !== 'play') return

    const correct = option === rounds[currentIdx].correctSynonym
    setLastCorrect(correct)
    const updated = [...userSelections, option]
    setUserSelections(updated)
    setPhase('feedback')

    setTimeout(() => {
      if (currentIdx + 1 < rounds.length) {
        setCurrentIdx(currentIdx + 1)
        setLastCorrect(null)
        setPhase('play')
      } else {
        finishGame(updated)
      }
    }, 1200)
  }

  const finishGame = async (allSelections: string[]) => {
    if (hasSubmitted || isSubmitting) return
    setHasSubmitted(true)

    const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    setTimeTaken(duration)

    let correctCount = 0
    rounds.forEach((r, idx) => {
      if (allSelections[idx] === r.correctSynonym) correctCount++
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
        activityId: activityConfig?.activityId || 'ACT-021',
        rawScore,
        accuracy: calcAccuracy / 100,
        timeTaken: duration,
        consistency: consistency / 100,
      })
      if (res && res.finalScore !== undefined) {
        calculatedFinalScore = Math.round(res.finalScore)
      }
    } catch (err: any) {
      console.error('Failed to submit synonym match session:', {
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
          <BookOpen className="w-8 h-8" />
        </div>
        <CardTitle className="text-3xl font-bold">Synonym Match</CardTitle>
        <CardDescription className="text-base font-medium text-muted-foreground">
          {(phase === 'play' || phase === 'feedback') && `Round ${currentIdx + 1} of ${rounds.length}: Pick the word closest in meaning`}
          {phase === 'result' && 'Activity Completed'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* PLAY / FEEDBACK PHASE */}
        {(phase === 'play' || phase === 'feedback') && currentRound && (
          <div className="space-y-6 text-center">
            {/* Target Word Card */}
            <div className="p-8 bg-gradient-to-br from-primary/5 to-primary/15 border-2 border-primary/20 rounded-2xl flex flex-col items-center justify-center max-w-xs mx-auto gap-2">
              <p className="text-sm uppercase font-bold tracking-widest text-muted-foreground">Find a synonym for</p>
              <span className="text-5xl font-extrabold text-primary">{currentRound.word}</span>
            </div>

            {/* Feedback Banner */}
            {phase === 'feedback' && lastCorrect !== null && (
              <div className={`p-3 rounded-xl border-2 text-lg font-bold ${
                lastCorrect
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-red-50 border-red-300 text-red-700'
              }`}>
                {lastCorrect
                  ? '✓ Correct!'
                  : `✗ Not quite — the synonym is "${currentRound.correctSynonym}"`}
              </div>
            )}

            {/* 4 Options */}
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {currentRound.options.map((opt) => {
                const isSelected = phase === 'feedback' && userSelections[currentIdx] === opt
                const isCorrectAnswer = phase === 'feedback' && opt === currentRound.correctSynonym
                let optClass = 'bg-card hover:bg-primary/10 hover:border-primary text-foreground border-border'
                if (isSelected && lastCorrect) {
                  optClass = 'bg-emerald-100 border-emerald-400 text-emerald-800 scale-105'
                } else if (isSelected && !lastCorrect) {
                  optClass = 'bg-red-100 border-red-400 text-red-800 scale-95'
                } else if (isCorrectAnswer && !lastCorrect) {
                  optClass = 'bg-emerald-50 border-emerald-300 text-emerald-700'
                }

                return (
                  <button
                    key={opt}
                    onClick={() => handleSelectOption(opt)}
                    disabled={phase === 'feedback' || isSubmitting}
                    className={`p-5 text-xl font-bold rounded-xl border-2 transition-all shadow-sm cursor-pointer ${optClass} ${
                      phase === 'feedback' ? 'pointer-events-none' : ''
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
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
              <h3 className="text-2xl font-bold">Synonym Match Complete!</h3>
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
              {rounds.map((r, idx) => {
                const isCorrect = userSelections[idx] === r.correctSynonym
                return (
                  <div key={idx} className="p-3 rounded-lg border flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-extrabold text-primary">{r.word}</span>
                      <div>
                        <p className="font-bold text-sm">→ {r.correctSynonym}</p>
                        <p className="text-xs text-muted-foreground">You chose: {userSelections[idx]}</p>
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

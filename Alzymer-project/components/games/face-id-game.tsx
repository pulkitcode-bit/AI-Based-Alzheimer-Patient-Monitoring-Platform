'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { UserCheck, Trophy, RotateCcw, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { api } from '@/lib/api'

interface FaceProfile {
  id: string
  emoji: string
  name: string
}

const ALL_FACES: FaceProfile[] = [
  { id: '1', emoji: '👨‍🌾', name: 'Farmer Fred' },
  { id: '2', emoji: '👩‍⚕️', name: 'Doctor Diana' },
  { id: '3', emoji: '👨‍🍳', name: 'Chef Charlie' },
  { id: '4', emoji: '👵', name: 'Grandma Grace' },
  { id: '5', emoji: '🧔', name: 'Bearded Bob' },
  { id: '6', emoji: '👱‍♀️', name: 'Blonde Betty' },
  { id: '7', emoji: '👨‍🚀', name: 'Astronaut Andy' },
  { id: '8', emoji: '👮', name: 'Officer Olivia' },
]

interface GameProps {
  activityConfig?: any
  onGameEnd?: (score: number) => void
}

export default function FaceIdGame({ activityConfig, onGameEnd }: GameProps) {
  const [phase, setPhase] = useState<'memorize' | 'recall' | 'result'>('memorize')
  const [targetFaces, setTargetFaces] = useState<FaceProfile[]>([])
  const [options, setOptions] = useState<FaceProfile[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
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
    const shuffled = [...ALL_FACES].sort(() => Math.random() - 0.5)
    const targets = shuffled.slice(0, 4)
    const distractors = shuffled.slice(4, 8)
    const recallPool = [...targets, ...distractors].sort(() => Math.random() - 0.5)

    setTargetFaces(targets)
    setOptions(recallPool)
    setSelectedIds([])
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

  const toggleSelectFace = (id: string) => {
    if (phase !== 'recall') return
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSubmitRecall = async () => {
    if (hasSubmitted || isSubmitting) return
    setHasSubmitted(true)

    const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    setTimeTaken(duration)

    const targetIds = targetFaces.map((f) => f.id)
    const correctCount = selectedIds.filter((id) => targetIds.includes(id)).length
    const wrongCount = selectedIds.filter((id) => !targetIds.includes(id)).length

    const calcAccuracy = Math.max(0, Math.round(((correctCount - wrongCount * 0.5) / targetFaces.length) * 100))
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
        activityId: 'ACT-009',
        rawScore,
        accuracy: calcAccuracy / 100,
        timeTaken: duration,
        consistency: consistency / 100,
      })
      if (res && res.finalScore !== undefined) {
        calculatedFinalScore = Math.round(res.finalScore)
      }
    } catch (err: any) {
      console.error('Failed to submit familiar face ID session:', {
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
          <UserCheck className="w-8 h-8" />
        </div>
        <CardTitle className="text-3xl font-bold">Familiar Face ID</CardTitle>
        <CardDescription className="text-base font-medium text-muted-foreground">
          {phase === 'memorize' && 'Memorize these 4 familiar faces'}
          {phase === 'recall' && 'Select the 4 faces you just saw'}
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
              {targetFaces.map((face) => (
                <div
                  key={face.id}
                  className="p-6 bg-primary/10 border-2 border-primary/20 rounded-2xl flex flex-col items-center gap-2 shadow-sm animate-pulse"
                >
                  <span className="text-6xl">{face.emoji}</span>
                  <span className="text-lg font-bold text-primary">{face.name}</span>
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
              Which 4 faces did you just see? Tap to select:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {options.map((face) => {
                const isSelected = selectedIds.includes(face.id)
                return (
                  <button
                    key={face.id}
                    onClick={() => toggleSelectFace(face.id)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center gap-2 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                        : 'bg-muted/40 hover:bg-muted text-foreground border-border'
                    }`}
                  >
                    <span className="text-5xl">{face.emoji}</span>
                    <span className="text-sm font-bold text-center">{face.name}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={handleSubmitRecall}
                disabled={selectedIds.length === 0 || isSubmitting}
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
              <h3 className="text-2xl font-bold">Face Identification Complete!</h3>
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
            <div className="text-left space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Original Target Faces:</p>
              <div className="flex flex-wrap gap-2">
                {targetFaces.map((face) => {
                  const wasFound = selectedIds.includes(face.id)
                  return (
                    <span
                      key={face.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border ${
                        wasFound
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      <span>{face.emoji}</span>
                      {wasFound ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-amber-600" />}
                      {face.name}
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

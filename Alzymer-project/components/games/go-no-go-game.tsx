'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Hand, RotateCcw, Trophy } from 'lucide-react'
import { api } from '@/lib/api'

interface GameProps {
  activityConfig?: any
  onGameEnd?: (score: number) => void
}

type StimulusKind = 'go' | 'nogo'

const STIMULUS_MS = 900
const ISI_MS = 500 // inter-stimulus interval — a blank beat between trials

function buildTrials(count: number): StimulusKind[] {
  // ~25% No-Go, matching the classic paradigm — infrequent enough that a
  // "just tap everything" strategy gets punished by false alarms, which is
  // the whole point of the test (response inhibition, not reaction speed).
  return Array.from({ length: count }, () => (Math.random() < 0.25 ? 'nogo' : 'go'))
}

export default function GoNoGoGame({ activityConfig, onGameEnd }: GameProps) {
  const [phase, setPhase] = useState<'practice' | 'play' | 'result'>('practice')
  const [trials, setTrials] = useState<StimulusKind[]>([])
  const [currentIdx, setCurrentIdx] = useState(-1) // -1 = not started / blank beat
  const [stimulusVisible, setStimulusVisible] = useState(false)
  const [feedback, setFeedback] = useState<'hit' | 'miss' | 'false-alarm' | 'correct-withhold' | null>(null)

  const respondedRef = useRef(false)
  const statsRef = useRef({ hits: 0, misses: 0, falseAlarms: 0, correctWithholds: 0 })
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const [startTime, setStartTime] = useState(0)
  const [timeTaken, setTimeTaken] = useState(0)
  const [accuracy, setAccuracy] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [practiceDone, setPracticeDone] = useState(false)

  const REAL_TRIAL_COUNT = 20

  useEffect(() => {
    startPractice()
    return () => timeoutsRef.current.forEach(clearTimeout)
  }, [])

  const clearTimers = () => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }

  const runTrial = (list: StimulusKind[], idx: number, isPractice: boolean) => {
    if (idx >= list.length) {
      if (isPractice) {
        setPracticeDone(true)
      } else {
        finishGame()
      }
      return
    }

    setCurrentIdx(idx)
    setStimulusVisible(true)
    setFeedback(null)
    respondedRef.current = false

    const t1 = setTimeout(() => {
      setStimulusVisible(false)
      // Stimulus window closed without a response.
      if (!respondedRef.current) {
        const kind = list[idx]
        if (kind === 'go') {
          if (!isPractice) statsRef.current.misses++
          setFeedback('miss')
        } else {
          if (!isPractice) statsRef.current.correctWithholds++
          setFeedback('correct-withhold')
        }
      }

      const t2 = setTimeout(() => runTrial(list, idx + 1, isPractice), ISI_MS)
      timeoutsRef.current.push(t2)
    }, STIMULUS_MS)
    timeoutsRef.current.push(t1)
  }

  const handleTap = (isPractice: boolean) => {
    if (!stimulusVisible || respondedRef.current || currentIdx < 0) return
    respondedRef.current = true

    const kind = (isPractice ? trials : trials)[currentIdx]
    if (kind === 'go') {
      if (!isPractice) statsRef.current.hits++
      setFeedback('hit')
    } else {
      if (!isPractice) statsRef.current.falseAlarms++
      setFeedback('false-alarm')
    }
  }

  const startPractice = () => {
    clearTimers()
    const practiceTrials = buildTrials(5)
    setTrials(practiceTrials)
    setPracticeDone(false)
    setPhase('practice')
    setHasSubmitted(false)
    statsRef.current = { hits: 0, misses: 0, falseAlarms: 0, correctWithholds: 0 }
    runTrial(practiceTrials, 0, true)
  }

  const startRealTest = () => {
    clearTimers()
    const realTrials = buildTrials(REAL_TRIAL_COUNT)
    setTrials(realTrials)
    statsRef.current = { hits: 0, misses: 0, falseAlarms: 0, correctWithholds: 0 }
    setStartTime(Date.now())
    setPhase('play')
    runTrial(realTrials, 0, false)
  }

  const finishGame = async () => {
    if (hasSubmitted || isSubmitting) return
    setHasSubmitted(true)

    const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000))
    setTimeTaken(duration)

    const { hits, misses, falseAlarms, correctWithholds } = statsRef.current
    const totalCorrect = hits + correctWithholds
    const calcAccuracy = Math.round((totalCorrect / REAL_TRIAL_COUNT) * 100)
    setAccuracy(calcAccuracy)

    // False alarms are the clinically meaningful failure mode here (impulsive
    // responding), so they weigh more heavily on consistency than a plain
    // miss does — two patients at the same raw accuracy can look very
    // different depending on whether their errors were misses or false alarms.
    const noGoCount = REAL_TRIAL_COUNT - (hits + misses)
    const falseAlarmRate = noGoCount > 0 ? falseAlarms / noGoCount : 0
    const consistencyScore = Math.max(30, Math.round(100 - falseAlarmRate * 100))

    setIsSubmitting(true)
    let calculatedFinalScore = calcAccuracy

    try {
      const patientIdStr = typeof window !== 'undefined' ? localStorage.getItem('patient_id') : null
      const patientId = patientIdStr ? Number(patientIdStr) : 1
      const res = await api.submitGameSession({
        patientId,
        activityId: 'ACT-204',
        rawScore: calcAccuracy,
        accuracy: calcAccuracy / 100,
        timeTaken: duration,
        consistency: consistencyScore / 100,
      })
      if (res && res.finalScore !== undefined) {
        calculatedFinalScore = Math.round(res.finalScore)
      }
    } catch (err: any) {
      console.error('Failed to submit go/no-go session:', err)
    } finally {
      setIsSubmitting(false)
      setFinalScore(calculatedFinalScore)
      setPhase('result')
      if (onGameEnd) onGameEnd(calculatedFinalScore)
    }
  }

  const currentKind = currentIdx >= 0 ? trials[currentIdx] : null

  return (
    <Card className="w-full max-w-2xl mx-auto space-y-6 border border-border bg-card p-6 text-card-foreground shadow-md">
      <CardHeader className="pb-2 text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Hand className="h-8 w-8" />
        </div>
        <CardTitle className="text-3xl font-bold">Go / No-Go Task</CardTitle>
        <CardDescription className="text-base font-medium text-muted-foreground">
          {phase === 'practice' && !practiceDone && 'Practice round (not scored) — tap the GREEN circle fast. Do NOT tap the RED one.'}
          {phase === 'play' && `Trial ${currentIdx + 1} of ${REAL_TRIAL_COUNT} — tap green, hold still for red`}
          {phase === 'result' && 'Activity completed'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {phase === 'practice' && !practiceDone && (
          <StimulusArea kind={currentKind} visible={stimulusVisible} feedback={feedback} onTap={() => handleTap(true)} />
        )}

        {practiceDone && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="font-medium text-foreground">Remember: tap green, but let red circles pass without tapping.</p>
            <Button onClick={startRealTest} size="lg" className="rounded-xl font-bold">
              Start scored test
            </Button>
          </div>
        )}

        {phase === 'play' && <StimulusArea kind={currentKind} visible={stimulusVisible} feedback={feedback} onTap={() => handleTap(false)} />}

        {phase === 'result' && (
          <div className="space-y-6 text-center">
            <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <div className="flex justify-center text-primary">
                <Trophy className="h-16 w-16" />
              </div>
              <h3 className="text-2xl font-bold">Task Completed!</h3>
              <div className="grid grid-cols-3 gap-4 py-2">
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Final Score</p>
                  <p className="text-3xl font-extrabold text-primary">{finalScore}</p>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Accuracy</p>
                  <p className="text-3xl font-extrabold text-emerald-600">{accuracy}%</p>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Time Taken</p>
                  <p className="text-3xl font-extrabold text-amber-600">{timeTaken}s</p>
                </div>
              </div>
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

function StimulusArea({
  kind,
  visible,
  feedback,
  onTap,
}: {
  kind: StimulusKind | null
  visible: boolean
  feedback: 'hit' | 'miss' | 'false-alarm' | 'correct-withhold' | null
  onTap: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="flex h-56 w-56 items-center justify-center rounded-full border-2 border-dashed border-border">
        {visible && kind && (
          <button
            onClick={onTap}
            aria-label={kind === 'go' ? 'Go stimulus' : 'No-go stimulus'}
            className={`h-44 w-44 rounded-full shadow-soft-lg transition-transform active:scale-95 ${
              kind === 'go' ? 'bg-success' : 'bg-destructive'
            }`}
          />
        )}
      </div>

      <p
        className={`h-6 text-sm font-semibold ${
          feedback === 'hit' || feedback === 'correct-withhold'
            ? 'text-success-strong'
            : feedback === 'miss' || feedback === 'false-alarm'
              ? 'text-destructive-strong'
              : 'text-transparent'
        }`}
      >
        {feedback === 'hit' && 'Nice — correct tap!'}
        {feedback === 'correct-withhold' && 'Correct — good hold!'}
        {feedback === 'miss' && 'Missed that one — keep going.'}
        {feedback === 'false-alarm' && 'That was a red — try to hold next time.'}
        {!feedback && '.'}
      </p>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BookOpen, Trophy, RotateCcw, CheckCircle2, XCircle } from 'lucide-react'
import { api } from '@/lib/api'

interface Question {
  text: string
  options: string[]
  answerIndex: number
}

const STORY_DATA = {
  title: "Grandma Sarah's Backyard Garden",
  text: "Grandma Sarah planted red roses in her sunny backyard garden every spring. Yesterday morning, her favorite blue bluebird landed right on the wooden birdhouse. She smiled happily and brought out a small bowl of fresh sunflower seeds for her feathered friend.",
  questions: [
    {
      text: "What flower did Sarah plant in her garden?",
      options: ["Red roses", "Yellow tulips", "White lilies", "Purple orchids"],
      answerIndex: 0,
    },
    {
      text: "Where did the bluebird land yesterday morning?",
      options: ["On the wooden birdhouse", "On the wooden fence", "On the porch step", "On a tree branch"],
      answerIndex: 0,
    },
    {
      text: "What food did Sarah bring out for the bird?",
      options: ["Fresh sunflower seeds", "Cold water", "Bread crumbs", "Dried berries"],
      answerIndex: 0,
    },
  ] as Question[],
}

interface GameProps {
  activityConfig?: any
  onGameEnd?: (score: number) => void
}

export default function StoryRecallGame({ activityConfig, onGameEnd }: GameProps) {
  const [phase, setPhase] = useState<'read' | 'quiz' | 'result'>('read')
  const [currentQ, setCurrentQ] = useState(0)
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
    setPhase('read')
    setCurrentQ(0)
    setUserAnswers([])
    setStartTime(Date.now())
    setHasSubmitted(false)
  }

  const handleOptionSelect = (optionIndex: number) => {
    const nextAnswers = [...userAnswers, optionIndex]
    setUserAnswers(nextAnswers)

    if (currentQ + 1 < STORY_DATA.questions.length) {
      setCurrentQ(currentQ + 1)
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
    STORY_DATA.questions.forEach((q, idx) => {
      if (answers[idx] === q.answerIndex) {
        correctCount++
      }
    })

    const calcAccuracy = Math.round((correctCount / STORY_DATA.questions.length) * 100)
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
        activityId: 'ACT-003',
        rawScore,
        accuracy: calcAccuracy / 100,
        timeTaken: duration,
        consistency: consistency / 100,
      })
      if (res && res.finalScore !== undefined) {
        calculatedFinalScore = Math.round(res.finalScore)
      }
    } catch (err: any) {
      console.error('Failed to submit story recall session:', {
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
          <BookOpen className="w-8 h-8" />
        </div>
        <CardTitle className="text-3xl font-bold">Story Recall</CardTitle>
        <CardDescription className="text-base font-medium text-muted-foreground">
          {phase === 'read' && 'Read the short story carefully before answering questions'}
          {phase === 'quiz' && `Question ${currentQ + 1} of ${STORY_DATA.questions.length}`}
          {phase === 'result' && 'Activity Completed'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* PHASE 1: READ */}
        {phase === 'read' && (
          <div className="space-y-6 text-center">
            <div className="p-6 bg-amber-500/10 border-2 border-amber-500/20 rounded-2xl text-left space-y-3">
              <h3 className="text-xl font-bold text-amber-950 dark:text-amber-200">
                {STORY_DATA.title}
              </h3>
              <p className="text-lg leading-relaxed text-foreground font-medium">
                "{STORY_DATA.text}"
              </p>
            </div>

            <Button
              onClick={() => setPhase('quiz')}
              className="px-10 py-6 text-xl font-bold"
            >
              I Finished Reading – Start Quiz
            </Button>
          </div>
        )}

        {/* PHASE 2: QUIZ */}
        {phase === 'quiz' && (
          <div className="space-y-6">
            <div className="p-5 bg-muted/30 border rounded-xl">
              <p className="text-xl font-bold text-foreground">
                {STORY_DATA.questions[currentQ].text}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {STORY_DATA.questions[currentQ].options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(idx)}
                  className="p-5 text-lg font-bold rounded-xl border-2 bg-card hover:bg-primary/10 hover:border-primary text-foreground text-left transition-all shadow-sm cursor-pointer"
                >
                  {option}
                </button>
              ))}
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
              <h3 className="text-2xl font-bold">Story Recall Complete!</h3>
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
            <div className="text-left space-y-3">
              <p className="text-sm font-semibold text-muted-foreground">Question Summary:</p>
              {STORY_DATA.questions.map((q, idx) => {
                const isCorrect = userAnswers[idx] === q.answerIndex
                return (
                  <div key={idx} className="p-3 rounded-lg border text-sm flex items-start gap-3 bg-muted/30">
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold text-foreground">{q.text}</p>
                      <p className="text-xs text-muted-foreground">
                        Your answer: <span className={isCorrect ? 'text-emerald-700 font-bold' : 'text-destructive font-bold'}>
                          {q.options[userAnswers[idx]]}
                        </span>
                      </p>
                    </div>
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

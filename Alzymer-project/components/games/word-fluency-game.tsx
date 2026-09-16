'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquareText, RotateCcw, Trophy } from 'lucide-react'
import { api } from '@/lib/api'

interface GameProps {
  activityConfig?: any
  onGameEnd?: (score: number) => void
}

// Semantic category fluency — the standard clinical format ("name as many
// animals as you can"), as opposed to letter fluency ("words starting with
// F"). Lists are intentionally generous (~30 each) so a genuine attempt
// rarely runs out of valid answers before the clock does.
const CATEGORIES: Record<string, string[]> = {
  Animals: [
    'dog', 'cat', 'lion', 'tiger', 'elephant', 'horse', 'cow', 'pig', 'sheep', 'goat',
    'rabbit', 'bear', 'wolf', 'fox', 'deer', 'zebra', 'giraffe', 'monkey', 'gorilla', 'kangaroo',
    'panda', 'koala', 'camel', 'hippo', 'rhino', 'squirrel', 'mouse', 'whale', 'dolphin', 'shark',
  ],
  Fruits: [
    'apple', 'banana', 'orange', 'grape', 'mango', 'pineapple', 'strawberry', 'blueberry', 'raspberry', 'watermelon',
    'melon', 'peach', 'pear', 'plum', 'cherry', 'lemon', 'lime', 'kiwi', 'papaya', 'coconut',
    'apricot', 'fig', 'guava', 'pomegranate', 'blackberry', 'cranberry', 'grapefruit', 'nectarine', 'tangerine', 'avocado',
  ],
  Occupations: [
    'doctor', 'nurse', 'teacher', 'engineer', 'lawyer', 'farmer', 'chef', 'pilot', 'driver', 'police',
    'firefighter', 'dentist', 'plumber', 'electrician', 'carpenter', 'painter', 'singer', 'actor', 'dancer', 'writer',
    'journalist', 'scientist', 'accountant', 'architect', 'mechanic', 'tailor', 'baker', 'butcher', 'waiter', 'librarian',
  ],
  Colors: [
    'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'brown',
    'gray', 'grey', 'gold', 'silver', 'violet', 'indigo', 'maroon', 'navy', 'teal', 'cyan',
    'magenta', 'beige', 'turquoise', 'lavender', 'olive', 'crimson', 'amber', 'ivory', 'tan', 'coral',
  ],
  'Body Parts': [
    'head', 'hair', 'eye', 'ear', 'nose', 'mouth', 'lip', 'tooth', 'chin', 'neck',
    'shoulder', 'arm', 'elbow', 'wrist', 'hand', 'finger', 'thumb', 'chest', 'back', 'stomach',
    'waist', 'hip', 'leg', 'knee', 'ankle', 'foot', 'toe', 'heel', 'skin', 'heart',
  ],
  Countries: [
    'india', 'usa', 'america', 'china', 'japan', 'germany', 'france', 'italy', 'spain', 'canada',
    'brazil', 'russia', 'australia', 'mexico', 'egypt', 'kenya', 'nigeria', 'argentina', 'england', 'britain',
    'netherlands', 'sweden', 'norway', 'pakistan', 'bangladesh', 'indonesia', 'thailand', 'vietnam', 'turkey', 'greece',
  ],
}
const CATEGORY_NAMES = Object.keys(CATEGORIES)

function normalize(word: string) {
  return word.trim().toLowerCase()
}

function isValidWord(word: string, list: Set<string>) {
  const w = normalize(word)
  if (list.has(w)) return true
  if (w.endsWith('s') && list.has(w.slice(0, -1))) return true // light plural tolerance
  return false
}

const PRACTICE_SECONDS = 15
const REAL_SECONDS = 60

export default function WordFluencyGame({ activityConfig, onGameEnd }: GameProps) {
  const [phase, setPhase] = useState<'practice' | 'play' | 'result'>('practice')
  const [category, setCategory] = useState('')
  const [wordSet, setWordSet] = useState<Set<string>>(new Set())
  const [entries, setEntries] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [rejectedHint, setRejectedHint] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(PRACTICE_SECONDS)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [timeTaken, setTimeTaken] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  useEffect(() => {
    startPractice()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const pickCategory = (exclude?: string) => {
    const options = exclude ? CATEGORY_NAMES.filter((c) => c !== exclude) : CATEGORY_NAMES
    return options[Math.floor(Math.random() * options.length)]
  }

  const startPractice = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const cat = pickCategory()
    setCategory(cat)
    setWordSet(new Set(CATEGORIES[cat]))
    setEntries([])
    setInput('')
    setRejectedHint(null)
    setSecondsLeft(PRACTICE_SECONDS)
    setPhase('practice')
    setHasSubmitted(false)

    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  const startRealTest = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    const cat = pickCategory(category)
    setCategory(cat)
    setWordSet(new Set(CATEGORIES[cat]))
    setEntries([])
    setInput('')
    setRejectedHint(null)
    setSecondsLeft(REAL_SECONDS)
    setPhase('play')

    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  // Ends the real attempt the instant the timer hits zero, without waiting
  // for another render tick to notice.
  useEffect(() => {
    if (phase === 'play' && secondsLeft === 0) {
      finishGame(entries)
    }
  }, [phase, secondsLeft])

  const handleSubmitWord = (e: React.FormEvent) => {
    e.preventDefault()
    const word = normalize(input)
    setInput('')
    if (!word) return

    if (!isValidWord(word, wordSet)) {
      setRejectedHint(`"${word}" isn't in the ${category} list — not counted`)
      setTimeout(() => setRejectedHint(null), 1800)
      return
    }
    if (entries.includes(word)) {
      setRejectedHint(`Already counted "${word}"`)
      setTimeout(() => setRejectedHint(null), 1800)
      return
    }
    setEntries((prev) => [...prev, word])
    setRejectedHint(null)
  }

  const finishGame = async (finalEntries: string[]) => {
    if (hasSubmitted || isSubmitting) return
    setHasSubmitted(true)

    const duration = REAL_SECONDS
    setTimeTaken(duration)

    // ~18 valid words in 60s is a strong showing for category fluency in
    // this population — used as the ceiling rather than an arbitrary 100.
    const calcAccuracy = Math.min(100, Math.round((finalEntries.length / 18) * 100))
    const consistency = calcAccuracy >= 75 ? 100 : calcAccuracy >= 50 ? 75 : 50

    setIsSubmitting(true)
    let calculatedFinalScore = calcAccuracy

    try {
      const patientIdStr = typeof window !== 'undefined' ? localStorage.getItem('patient_id') : null
      const patientId = patientIdStr ? Number(patientIdStr) : 1
      const res = await api.submitGameSession({
        patientId,
        activityId: 'ACT-209',
        rawScore: finalEntries.length,
        accuracy: calcAccuracy / 100,
        timeTaken: duration,
        consistency: consistency / 100,
      })
      if (res && res.finalScore !== undefined) {
        calculatedFinalScore = Math.round(res.finalScore)
      }
    } catch (err: any) {
      console.error('Failed to submit word fluency session:', err)
    } finally {
      setIsSubmitting(false)
      setFinalScore(calculatedFinalScore)
      setPhase('result')
      if (onGameEnd) onGameEnd(calculatedFinalScore)
    }
  }

  return (
    <Card className="w-full max-w-xl mx-auto space-y-6 border border-border bg-card p-6 text-card-foreground shadow-md">
      <CardHeader className="pb-2 text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MessageSquareText className="h-8 w-8" />
        </div>
        <CardTitle className="text-3xl font-bold">Word Fluency</CardTitle>
        <CardDescription className="text-base font-medium text-muted-foreground">
          {phase !== 'result' && `Name as many "${category}" as you can before time runs out.`}
          {phase === 'result' && 'Activity completed'}
        </CardDescription>
        {phase === 'practice' && (
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Practice round — not scored</p>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {(phase === 'practice' || phase === 'play') && (
          <>
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-primary/10 px-4 py-1.5 text-lg font-bold text-primary">{category}</span>
              <span className="text-2xl font-black tabular-nums text-foreground">{secondsLeft}s</span>
            </div>

            <form onSubmit={handleSubmitWord} className="flex gap-2">
              <Input
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Type a ${category.toLowerCase()}...`}
                className="h-12 text-base"
                disabled={phase === 'practice' ? secondsLeft === 0 : false}
              />
              <Button type="submit" size="lg" className="h-12 shrink-0 rounded-xl font-bold">
                Add
              </Button>
            </form>

            <p className="h-5 text-sm font-medium text-destructive-strong">{rejectedHint ?? ''}</p>

            <div className="flex flex-wrap gap-2">
              {entries.map((w) => (
                <span key={w} className="rounded-full bg-success-soft px-3 py-1 text-sm font-semibold text-success-strong">
                  {w}
                </span>
              ))}
            </div>
            <p className="text-sm font-semibold text-muted-foreground">{entries.length} word{entries.length === 1 ? '' : 's'} so far</p>

            {phase === 'practice' && secondsLeft === 0 && (
              <div className="flex flex-col items-center gap-3 pt-2 text-center">
                <p className="font-medium text-foreground">Good warm-up! Ready for the real 60-second round?</p>
                <Button onClick={startRealTest} size="lg" className="rounded-xl font-bold">
                  Start scored test
                </Button>
              </div>
            )}
          </>
        )}

        {phase === 'result' && (
          <div className="space-y-6 text-center">
            <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <div className="flex justify-center text-primary">
                <Trophy className="h-16 w-16" />
              </div>
              <h3 className="text-2xl font-bold">Round Completed!</h3>
              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Final Score</p>
                  <p className="text-3xl font-extrabold text-primary">{finalScore}</p>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Words Found</p>
                  <p className="text-3xl font-extrabold text-emerald-600">{entries.length}</p>
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

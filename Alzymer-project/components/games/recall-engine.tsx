'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import { api } from '@/lib/api'

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

interface RecallEngineProps {
  activityConfig: ActivityConfig
  items: string[]
  onGameEnd?: (score: number) => void
}

// ── Component ──────────────────────────────────────────────────────────────

export default function RecallEngine({
  activityConfig,
  items,
  onGameEnd,
}: RecallEngineProps) {
  const [displayedObjects, setDisplayedObjects] = useState<string[]>([])
  const [hiddenObjects, setHiddenObjects] = useState<string[]>([])
  const [selectedObjects, setSelectedObjects] = useState<string[]>([])
  const [recallOptions, setRecallOptions] = useState<string[]>([])
  const [level, setLevel] = useState(1)
  const [gamePhase, setGamePhase] = useState<'display' | 'recall' | 'answer'>('display')
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<string>('')
  const [showResults, setShowResults] = useState(false)
  const [timer, setTimer] = useState(0)
  const [scoreSubmitted, setScoreSubmitted] = useState(false)

  // Stats tracked across levels for game-session submission
  const [totalCorrectAllLevels, setTotalCorrectAllLevels] = useState(0)
  const [totalShownAllLevels, setTotalShownAllLevels] = useState(0)
  const [levelAccuracies, setLevelAccuracies] = useState<number[]>([])

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const objectsToShow = Math.min(3 + level, 8)
  const pointsPerCorrect = Math.max(1, Math.round(activityConfig.baseScore * 0.1))

  // ── Initialize on Mount ────────────────────────────────────────────────

  useEffect(() => {
    resetGame()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Running Game Timer ─────────────────────────────────────────────────

  useEffect(() => {
    if (showResults) return
    const interval = setInterval(() => {
      setTimer(t => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [showResults])

  // ── Helper to start/reset game state ───────────────────────────────────

  const resetGame = () => {
    setLevel(1)
    setScore(0)
    setTimer(0)
    setScoreSubmitted(false)
    setTotalCorrectAllLevels(0)
    setTotalShownAllLevels(0)
    setLevelAccuracies([])
    startNewLevel(1)
  }

  const startNewLevel = (currentLevel: number) => {
    const currentObjectsToShow = Math.min(3 + currentLevel, 8)

    // 1. Pick random objects to display
    const shuffled = [...items].sort(() => Math.random() - 0.5)
    const objects = shuffled.slice(0, currentObjectsToShow)
    setDisplayedObjects(objects)
    setHiddenObjects(objects)
    setSelectedObjects([])
    setFeedback('')
    setGamePhase('display')

    // 2. Select options pool including all correct objects plus distractors
    const poolSize = Math.min(currentObjectsToShow + 2, items.length)
    const correctChoices = [...objects]
    const distractors = items.filter(item => !correctChoices.includes(item))
    const shuffledDistractors = distractors.sort(() => Math.random() - 0.5)
    const chosenDistractors = shuffledDistractors.slice(0, poolSize - correctChoices.length)

    // Combine pool options and shuffle so correct answers aren't in sequence
    const recallPool = [...correctChoices, ...chosenDistractors].sort(() => Math.random() - 0.5)
    setRecallOptions(recallPool)

    // 3. Display phase transitions to recall phase after timeout
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setGamePhase('recall')
    }, 3000 + currentLevel * 500)
  }

  // ── Object click handler ───────────────────────────────────────────────

  const handleObjectClick = (object: string) => {
    if (gamePhase !== 'recall') return
    if (selectedObjects.includes(object)) return

    const isCorrect = hiddenObjects.includes(object)
    const newSelected = [...selectedObjects, object]
    setSelectedObjects(newSelected)

    if (isCorrect) {
      setFeedback('✓ Correct!')
      setScore(prev => prev + pointsPerCorrect)
    } else {
      setFeedback('✗ Not in the original list')
    }

    if (newSelected.length === objectsToShow) {
      setTimeout(() => {
        setGamePhase('answer')
      }, 1000)
    }
  }

  // ── Next Level / Game End ──────────────────────────────────────────────

  const handleNext = () => {
    const correctCount = selectedObjects.filter(obj => hiddenObjects.includes(obj)).length
    const currentAccuracy = correctCount / objectsToShow // 0 to 1

    const newTotalCorrect = totalCorrectAllLevels + correctCount
    const newTotalShown = totalShownAllLevels + objectsToShow
    const newAccuracies = [...levelAccuracies, currentAccuracy]

    setTotalCorrectAllLevels(newTotalCorrect)
    setTotalShownAllLevels(newTotalShown)
    setLevelAccuracies(newAccuracies)

    const accuracyPercent = currentAccuracy * 100
    const passThreshold = activityConfig.successThreshold ?? 80
    const isLastLevel = level >= 5

    if (accuracyPercent >= passThreshold && !isLastLevel) {
      const nextLevel = level + 1
      setLevel(nextLevel)
      startNewLevel(nextLevel)
    } else {
      setShowResults(true)
      submitSession(newTotalCorrect, newTotalShown, newAccuracies)
    }
  }

  // ── Submit Session Data to Backend ──────────────────────────────────────

  const submitSession = async (
    finalCorrect: number,
    finalShown: number,
    allAccuracies: number[]
  ) => {
    if (scoreSubmitted) return
    setScoreSubmitted(true)

    const overallAccuracy = finalShown > 0 ? finalCorrect / finalShown : 0

    // Consistency formula: 1 - standard deviation of level accuracies
    let consistency = overallAccuracy
    if (allAccuracies.length >= 2) {
      const mean = allAccuracies.reduce((a, b) => a + b, 0) / allAccuracies.length
      const variance = allAccuracies.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allAccuracies.length
      const stdev = Math.sqrt(variance)
      consistency = Math.max(0, Math.min(1, 1 - stdev))
    }

    try {
      const patientIdStr = localStorage.getItem('patient_id')
      if (!patientIdStr) {
        console.warn('[RecallEngine] No patient_id in localStorage, skipping submit')
        if (onGameEnd) onGameEnd(score)
        return
      }

      const response = await api.submitGameSession({
        patientId: Number(patientIdStr),
        activityId: activityConfig.activityId,
        rawScore: score,
        accuracy: overallAccuracy,
        timeTaken: timer,
        consistency,
      })

      if (onGameEnd) {
        onGameEnd(response.finalScore)
      }
    } catch (error) {
      console.error('[RecallEngine] Failed to submit game session:', error)
      if (onGameEnd) {
        onGameEnd(score)
      }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="bg-primary/10 rounded-lg p-4 flex-1 text-center">
          <p className="text-sm text-muted-foreground mb-1">Level</p>
          <p className="text-3xl font-bold text-primary">{level}</p>
        </div>
        <div className="bg-accent/10 rounded-lg p-4 flex-1 text-center">
          <p className="text-sm text-muted-foreground mb-1">Score</p>
          <p className="text-3xl font-bold text-accent">{score}</p>
        </div>
        <div className="bg-secondary/10 rounded-lg p-4 flex-1 text-center">
          <p className="text-sm text-muted-foreground mb-1">Time</p>
          <p className="text-3xl font-bold text-secondary">{formatTime(timer)}</p>
        </div>
      </div>

      {gamePhase === 'display' && (
        <div className="text-center space-y-6">
          <p className="text-lg text-muted-foreground font-semibold">
            Remember these objects:
          </p>
          <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto">
            {displayedObjects.map((obj, i) => (
              <div
                key={i}
                className="aspect-square text-5xl flex items-center justify-center bg-primary/10 rounded-lg animate-pulse"
              >
                {obj}
              </div>
            ))}
          </div>
          <p className="text-muted-foreground">Get ready to recall them...</p>
        </div>
      )}

      {gamePhase === 'recall' && (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground mb-2">
              Which objects did you see?
            </p>
            {feedback && (
              <p
                className={`text-lg font-medium ${
                  feedback.includes('✓') ? 'text-accent' : 'text-red-600'
                }`}
              >
                {feedback}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto">
            {recallOptions.map((obj, i) => (
              <button
                key={i}
                onClick={() => handleObjectClick(obj)}
                disabled={selectedObjects.includes(obj)}
                className={`aspect-square text-4xl rounded-lg transition-all ${
                  selectedObjects.includes(obj)
                    ? 'opacity-50 bg-muted'
                    : 'bg-primary/10 hover:bg-primary/20 cursor-pointer'
                }`}
              >
                {obj}
              </button>
            ))}
          </div>
        </div>
      )}

      {gamePhase === 'answer' && (
        <div className="space-y-6">
          <div className="bg-primary/10 rounded-lg p-6 text-center space-y-3">
            <p className="text-lg text-muted-foreground">
              Objects you selected: {selectedObjects.length}
            </p>
            <p className="text-lg text-muted-foreground">
              Correct answers: {
                selectedObjects.filter(obj => hiddenObjects.includes(obj)).length
              }
            </p>
            {selectedObjects.filter(obj => !hiddenObjects.includes(obj)).length > 0 && (
              <p className="text-lg text-muted-foreground">
                Incorrect: {
                  selectedObjects.filter(obj => !hiddenObjects.includes(obj)).length
                }
              </p>
            )}
          </div>
          <Button onClick={handleNext} className="w-full">
            {level >= 5 ? 'View Results' : 'Next Level'}
          </Button>
        </div>
      )}

      {showResults && (
        <div className="bg-accent/10 border border-accent rounded-lg p-6 text-center space-y-4">
          <h3 className="text-2xl font-bold text-foreground">Game Complete!</h3>
          <p className="text-lg text-muted-foreground">You reached level {level}</p>
          <p className="text-2xl font-bold text-primary">Final Score: {score}</p>
          <Button onClick={resetGame} className="flex items-center gap-2 mx-auto">
            <RotateCcw className="w-5 h-5" />
            Play Again
          </Button>
        </div>
      )}
    </div>
  )
}

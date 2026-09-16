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

interface SequenceItem {
  color: string
  label: string
}

interface SequenceEngineProps {
  activityConfig: ActivityConfig
  items: (string | SequenceItem)[]
  onGameEnd?: (score: number) => void
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SequenceEngine({
  activityConfig,
  items,
  onGameEnd,
}: SequenceEngineProps) {
  // Convert items (string or object) to standard SequenceItem array
  const resolvedItems: SequenceItem[] = items.map(item => {
    if (typeof item === 'string') {
      const match = item.match(/bg-(\w+)-\d+/)
      const label = match
        ? match[1].charAt(0).toUpperCase() + match[1].slice(1)
        : item
      return { color: item, label }
    }
    return item
  })

  const [sequence, setSequence] = useState<number[]>([])
  const [userSequence, setUserSequence] = useState<number[]>([])
  const [level, setLevel] = useState(1)
  const [gameActive, setGameActive] = useState(false)
  const [showError, setShowError] = useState(false)
  const [activeButton, setActiveButton] = useState<number | null>(null)

  // Timer & statistics
  const [timer, setTimer] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [scoreSubmitted, setScoreSubmitted] = useState(false)
  const [totalCorrectClicks, setTotalCorrectClicks] = useState(0)
  const [totalAttemptedClicks, setTotalAttemptedClicks] = useState(0)

  const activePlaybackRef = useRef<boolean>(false)

  // Computed score using activityConfig.baseScore as reference
  const scoreMultiplier = Math.max(1, Math.round(activityConfig.baseScore / 5))
  const score = (level - 1) * scoreMultiplier

  // ── Initialize on Mount ────────────────────────────────────────────────

  useEffect(() => {
    startGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Session Timer ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setTimer(t => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning])

  // ── Playback Sequence ──────────────────────────────────────────────────

  const playSequence = async (seq: number[]) => {
    setGameActive(false)
    activePlaybackRef.current = true

    for (let i = 0; i < seq.length; i++) {
      // Check if game was reset mid-playback
      if (!activePlaybackRef.current) break

      await new Promise(resolve => setTimeout(resolve, 600))
      // Double check active context
      if (!activePlaybackRef.current) break

      setActiveButton(seq[i])
      await new Promise(resolve => setTimeout(resolve, 300))
      setActiveButton(null)
    }

    if (activePlaybackRef.current) {
      setGameActive(true)
    }
    setUserSequence([])
  }

  // ── Start / Restart game ───────────────────────────────────────────────

  const startGame = () => {
    activePlaybackRef.current = false
    setActiveButton(null)

    setLevel(1)
    setUserSequence([])
    setShowError(false)
    setTimer(0)
    setIsRunning(true)
    setScoreSubmitted(false)
    setTotalCorrectClicks(0)
    setTotalAttemptedClicks(0)

    // Build first sequence item
    const firstItem = Math.floor(Math.random() * resolvedItems.length)
    setSequence([firstItem])
    playSequence([firstItem])
  }

  // ── Add Item to Sequence functionally ──────────────────────────────────

  const addToSequence = (currentSeq: number[]) => {
    const nextItem = Math.floor(Math.random() * resolvedItems.length)
    const nextSeq = [...currentSeq, nextItem]
    setSequence(nextSeq)
    playSequence(nextSeq)
  }

  // ── Click handler ──────────────────────────────────────────────────────

  const handleButtonClick = (index: number) => {
    if (!gameActive) return

    setActiveButton(index)
    setTimeout(() => setActiveButton(null), 200)

    const newUserSequence = [...userSequence, index]
    setUserSequence(newUserSequence)
    setTotalAttemptedClicks(prev => prev + 1)

    // Match verification
    const currentIndex = newUserSequence.length - 1
    if (newUserSequence[currentIndex] !== sequence[currentIndex]) {
      // End game on mistake
      setIsRunning(false)
      setShowError(true)
      setGameActive(false)
      activePlaybackRef.current = false

      submitSession(totalCorrectClicks)
      return
    }

    // Correct click
    setTotalCorrectClicks(prev => prev + 1)

    // Completed level sequence
    if (newUserSequence.length === sequence.length) {
      setLevel(prev => prev + 1)
      setTimeout(() => {
        addToSequence(sequence)
      }, 1000)
    }
  }

  // ── Submit Session Data to Backend ──────────────────────────────────────

  const submitSession = async (finalCorrect: number) => {
    if (scoreSubmitted) return
    setScoreSubmitted(true)

    // Total attempts is finalCorrect + 1 (the mismatch click)
    const totalAttempts = finalCorrect + 1
    const accuracy = totalAttempts > 0 ? finalCorrect / totalAttempts : 1.0

    // Consistency based on level milestone progress (8 completed levels baseline)
    const consistency = finalCorrect > 0 ? Math.min(1.0, (level - 1) / 8.0) : 0.0

    try {
      const patientIdStr = localStorage.getItem('patient_id')
      if (!patientIdStr) {
        console.warn('[SequenceEngine] No patient_id in localStorage, skipping submit')
        if (onGameEnd) onGameEnd(score)
        return
      }

      const response = await api.submitGameSession({
        patientId: Number(patientIdStr),
        activityId: activityConfig.activityId,
        rawScore: score,
        accuracy,
        timeTaken: timer,
        consistency,
      })

      if (onGameEnd) {
        onGameEnd(response.finalScore)
      }
    } catch (error) {
      console.error('[SequenceEngine] Failed to submit game session:', error)
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
        <div className="bg-primary/10 rounded-lg p-6 flex-1 text-center">
          <p className="text-sm text-muted-foreground mb-2">Level</p>
          <p className="text-5xl font-bold text-primary">{level}</p>
        </div>
        <div className="bg-secondary/10 rounded-lg p-6 flex-1 text-center">
          <p className="text-sm text-muted-foreground mb-2">Time</p>
          <p className="text-5xl font-bold text-secondary">{formatTime(timer)}</p>
        </div>
      </div>

      <div className="text-center">
        <p className="text-lg text-muted-foreground">
          Watch the sequence, then repeat it by clicking the buttons
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
        {resolvedItems.map((item, index) => (
          <button
            key={index}
            onClick={() => handleButtonClick(index)}
            disabled={!gameActive}
            className={`aspect-square rounded-lg font-bold text-white text-xl transition-all transform ${
              item.color
            } ${
              activeButton === index
                ? 'scale-95 opacity-80'
                : 'opacity-100 hover:opacity-90 scale-100'
            } ${!gameActive ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {showError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center space-y-4">
          <h3 className="text-2xl font-bold text-foreground">Game Over!</h3>
          <p className="text-lg text-muted-foreground font-medium">
            You reached level {level}
          </p>
          <p className="text-2xl font-bold text-primary">Score: {score}</p>
          <Button
            onClick={startGame}
            className="flex items-center gap-2 mx-auto"
          >
            <RotateCcw className="w-5 h-5" />
            Try Again
          </Button>
        </div>
      )}

      {!showError && !gameActive && (
        <div className="text-center">
          <p className="text-muted-foreground text-lg">Waiting for sequence...</p>
        </div>
      )}
    </div>
  )
}

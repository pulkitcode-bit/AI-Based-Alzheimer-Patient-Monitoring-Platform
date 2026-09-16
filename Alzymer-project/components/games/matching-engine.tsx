'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import { api } from '@/lib/api'

// ── Types ──────────────────────────────────────────────────────────────────

interface Card {
  id: number
  symbol: string
  isFlipped: boolean
  isMatched: boolean
}

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

interface MatchingEngineProps {
  activityConfig: ActivityConfig
  items: string[]
  onGameEnd?: (score: number) => void
}

// ── Component ──────────────────────────────────────────────────────────────

export default function MatchingEngine({
  activityConfig,
  items,
  onGameEnd,
}: MatchingEngineProps) {
  const totalPairs = items.length
  // Minimum possible moves to clear all pairs = number of pairs
  // (each pair needs at least one move / flip-attempt)
  const minMoves = totalPairs

  const [cards, setCards] = useState<Card[]>([])
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [score, setScore] = useState(activityConfig.baseScore)
  const [gameWon, setGameWon] = useState(false)
  const [timer, setTimer] = useState(0)
  const [scoreSubmitted, setScoreSubmitted] = useState(false)

  // ── Initialize on mount ────────────────────────────────────────────────

  useEffect(() => {
    initializeGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Timer — stops when gameWon ─────────────────────────────────────────

  useEffect(() => {
    if (gameWon) return
    const interval = setInterval(() => {
      setTimer(t => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [gameWon])

  // ── Match-check: 2-card flip limit before comparing ────────────────────

  useEffect(() => {
    if (flipped.length === 2) {
      const [first, second] = flipped
      if (cards[first].symbol === cards[second].symbol) {
        setMatched(prev => [...prev, first, second])
        setFlipped([])
        setScore(prev => Math.max(0, prev - 5))
      } else {
        setTimeout(() => setFlipped([]), 500)
        setScore(prev => Math.max(0, prev - 10))
      }
      setMoves(prev => prev + 1)
    }
  }, [flipped, cards])

  // ── Game-end: submit to POST /api/game-sessions ────────────────────────

  useEffect(() => {
    if (matched.length === cards.length && cards.length > 0 && !scoreSubmitted) {
      setGameWon(true)
      setScoreSubmitted(true)

      // Raw in-game score (before backend recalculation)
      const rawScore = Math.max(0, Math.round(score))

      // accuracy = matched pairs / total pairs (always 1.0 when game is won,
      // but we compute it properly so partial-win variants work in the future)
      const accuracy = Math.min(1, (matched.length / 2) / totalPairs)

      // consistency = min possible moves / actual moves, clamped 0–1
      const consistency = moves > 0
        ? Math.min(1, minMoves / moves)
        : 1

      const submitSession = async () => {
        try {
          const patientIdStr = localStorage.getItem('patient_id')
          if (!patientIdStr) {
            console.warn('[MatchingEngine] No patient_id in localStorage, skipping submit')
            if (onGameEnd) onGameEnd(rawScore)
            return
          }

          const response = await api.submitGameSession({
            patientId: Number(patientIdStr),
            activityId: activityConfig.activityId,
            rawScore,
            accuracy,
            timeTaken: timer,
            consistency,
          })

          // Use the backend-computed finalScore
          if (onGameEnd) {
            onGameEnd(response.finalScore)
          }
        } catch (error) {
          console.error('[MatchingEngine] Failed to submit game session:', error)
          // Fallback: pass the raw score if backend call fails
          if (onGameEnd) {
            onGameEnd(rawScore)
          }
        }
      }

      submitSession()
    }
  }, [matched, cards, score, timer, onGameEnd, moves, scoreSubmitted,
      totalPairs, minMoves, activityConfig.activityId])

  // ── State reset ────────────────────────────────────────────────────────

  const initializeGame = () => {
    const shuffled = [...items, ...items]
      .sort(() => Math.random() - 0.5)
      .map((symbol, index) => ({
        id: index,
        symbol,
        isFlipped: false,
        isMatched: false,
      }))
    setCards(shuffled)
    setFlipped([])
    setMatched([])
    setMoves(0)
    setScore(activityConfig.baseScore)
    setGameWon(false)
    setTimer(0)
    setScoreSubmitted(false)
  }

  // ── Click handler ──────────────────────────────────────────────────────

  const handleCardClick = (index: number) => {
    if (
      flipped.length === 2 ||
      flipped.includes(index) ||
      matched.includes(index) ||
      gameWon
    )
      return
    setFlipped([...flipped, index])
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
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-primary/10 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Moves</p>
          <p className="text-3xl font-bold text-primary">{moves}</p>
        </div>
        <div className="bg-accent/10 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Score</p>
          <p className="text-3xl font-bold text-accent">
            {Math.max(0, Math.round(score))}
          </p>
        </div>
        <div className="bg-secondary/10 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Time</p>
          <p className="text-3xl font-bold text-secondary">
            {formatTime(timer)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(index)}
            className={`aspect-square text-5xl rounded-xl font-bold transition-all transform ${
              flipped.includes(index) || matched.includes(index)
                ? 'bg-primary/20 scale-100'
                : 'bg-primary/10 hover:bg-primary/15 scale-95 hover:scale-100'
            } ${matched.includes(index) ? 'opacity-50' : 'opacity-100'}`}
            disabled={gameWon}
          >
            {flipped.includes(index) || matched.includes(index)
              ? card.symbol
              : '?'}
          </button>
        ))}
      </div>

      {gameWon && (
        <div className="bg-accent/10 border border-accent rounded-lg p-6 text-center space-y-4">
          <h3 className="text-2xl font-bold text-foreground">
            Congratulations!
          </h3>
          <p className="text-lg text-muted-foreground">
            You completed the game in {moves} moves!
          </p>
          <Button
            onClick={initializeGame}
            className="flex items-center gap-2 mx-auto"
          >
            <RotateCcw className="w-5 h-5" />
            Play Again
          </Button>
        </div>
      )}
    </div>
  )
}

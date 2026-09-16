'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import { api } from '@/lib/api'

const CARDS = ['🎨', '🎭', '🎪', '🎬', '🎮', '🎯', '🎲', '🎳']

interface Card {
  id: number
  symbol: string
  isFlipped: boolean
  isMatched: boolean
}

interface MemoryGameProps {
  onGameEnd?: (score: number) => void
}

export default function MemoryGame({ onGameEnd }: MemoryGameProps) {
  const [cards, setCards] = useState<Card[]>([])
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [score, setScore] = useState(100)
  const [gameWon, setGameWon] = useState(false)
  const [timer, setTimer] = useState(0)
  const [scoreSubmitted, setScoreSubmitted] = useState(false)
  useEffect(() => {
    initializeGame()
  }, [])

  useEffect(() => {
    if (gameWon) return
    const interval = setInterval(() => {
      setTimer(t => t + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [gameWon])

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
  // ↑↑↑ YE EFFECT WAPAS ADD KARO ↑↑↑

  useEffect(() => {
    if (matched.length === cards.length && cards.length > 0 && !scoreSubmitted) {
      setGameWon(true)
      setScoreSubmitted(true)   // guard — ab dubara nahi chalega

      // Better scoring: gentler time penalty, floor score reasonably
      const finalScore = Math.max(10, Math.round(score - timer / 20))

      const submitScore = async () => {
        try {
          const patientId = localStorage.getItem('patient_id')
          if (patientId) {
            await api.submitGameScore({
              patientId,
              gameType: 'memory',
              score: finalScore,
              moves,
              time: timer,
            })
          }
        } catch (error) {
          console.error('[v0] Failed to submit game score:', error)
        }
      }

      submitScore()
      if (onGameEnd) {
        onGameEnd(finalScore)
      }
    }
  }, [matched, cards, score, timer, onGameEnd, moves, scoreSubmitted])
  const initializeGame = () => {
    const shuffled = [...CARDS, ...CARDS]
      .sort(() => Math.random() - 0.5)
      .map((symbol, index) => ({
        id: index,
        symbol,
        isFlipped: false,
        isMatched: false
      }))
    setCards(shuffled)
    setFlipped([])
    setMatched([])
    setMoves(0)
    setScore(100)
    setGameWon(false)
    setTimer(0)
    setScoreSubmitted(false)
  }

  const handleCardClick = (index: number) => {
    if (flipped.length === 2 ||
      flipped.includes(index) ||
      matched.includes(index) ||
      gameWon)
      return
    setFlipped([...flipped, index])
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-primary/10 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Moves</p>
          <p className="text-3xl font-bold text-primary">{moves}</p>
        </div>
        <div className="bg-accent/10 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Score</p>
          <p className="text-3xl font-bold text-accent">{Math.max(0, Math.round(score))}</p>
        </div>
        <div className="bg-secondary/10 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Time</p>
          <p className="text-3xl font-bold text-secondary">{formatTime(timer)}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(index)}
            className={`aspect-square text-5xl rounded-xl font-bold transition-all transform ${flipped.includes(index) || matched.includes(index)
              ? 'bg-primary/20 scale-100'
              : 'bg-primary/10 hover:bg-primary/15 scale-95 hover:scale-100'
              } ${matched.includes(index) ? 'opacity-50' : 'opacity-100'}`}
            disabled={gameWon}
          >
            {flipped.includes(index) || matched.includes(index) ? card.symbol : '?'}
          </button>
        ))}
      </div>

      {gameWon && (
        <div className="bg-accent/10 border border-accent rounded-lg p-6 text-center space-y-4">
          <h3 className="text-2xl font-bold text-foreground">Congratulations!</h3>
          <p className="text-lg text-muted-foreground">You completed the game in {moves} moves!</p>
          <Button onClick={initializeGame} className="flex items-center gap-2 mx-auto">
            <RotateCcw className="w-5 h-5" />
            Play Again
          </Button>
        </div>
      )}
    </div>
  )
}

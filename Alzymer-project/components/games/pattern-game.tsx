'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import { api } from '@/lib/api'

interface PatternGameProps {
  onGameEnd?: (score: number) => void
}

export default function PatternGame({ onGameEnd }: PatternGameProps) {
  const [sequence, setSequence] = useState<number[]>([])
  const [userSequence, setUserSequence] = useState<number[]>([])
  const [level, setLevel] = useState(1)
  const [gameActive, setGameActive] = useState(false)
  const [showError, setShowError] = useState(false)
  const [activeButton, setActiveButton] = useState<number | null>(null)

  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500']
  const colorNames = ['Red', 'Blue', 'Green', 'Yellow']

  useEffect(() => {
    startGame()
  }, [])

  const startGame = () => {
    setSequence([])
    setUserSequence([])
    setLevel(1)
    setShowError(false)
    setGameActive(true)
    addToSequence()
  }

  const addToSequence = () => {
    const newSequence = [...sequence, Math.floor(Math.random() * 4)]
    setSequence(newSequence)
    playSequence(newSequence)
  }

  const playSequence = async (seq: number[]) => {
    setGameActive(false)
    for (let i = 0; i < seq.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600))
      setActiveButton(seq[i])
      await new Promise(resolve => setTimeout(resolve, 300))
      setActiveButton(null)
    }
    setGameActive(true)
    setUserSequence([])
  }

  const handleButtonClick = (index: number) => {
    if (!gameActive) return

    setActiveButton(index)
    setTimeout(() => setActiveButton(null), 200)

    const newUserSequence = [...userSequence, index]
    setUserSequence(newUserSequence)

    if (newUserSequence[newUserSequence.length - 1] !== sequence[newUserSequence.length - 1]) {
      setShowError(true)
      setGameActive(false)
      const score = (level - 1) * 10
      
      // Submit score to backend
      const submitScore = async () => {
        try {
          const patientId = localStorage.getItem('patient_id')
          if (patientId) {
            await api.submitGameScore({
              patientId,
              gameType: 'pattern',
              score,
              level: level - 1,
            })
          }
        } catch (error) {
          console.error('[v0] Failed to submit game score:', error)
        }
      }
      
      submitScore()
      if (onGameEnd) {
        onGameEnd(score)
      }
      return
    }

    if (newUserSequence.length === sequence.length) {
      setLevel(level + 1)
      setTimeout(() => {
        addToSequence()
      }, 1000)
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="bg-primary/10 rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-2">Level</p>
          <p className="text-5xl font-bold text-primary">{level}</p>
        </div>
        <p className="text-lg text-muted-foreground">
          Watch the sequence, then repeat it by clicking the buttons
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
        {colors.map((color, index) => (
          <button
            key={index}
            onClick={() => handleButtonClick(index)}
            disabled={!gameActive}
            className={`aspect-square rounded-lg font-bold text-white text-xl transition-all transform ${color} ${
              activeButton === index
                ? 'scale-95 opacity-80'
                : 'opacity-100 hover:opacity-90 scale-100'
            } ${!gameActive ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            {colorNames[index]}
          </button>
        ))}
      </div>

      {showError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center space-y-4">
          <h3 className="text-2xl font-bold text-foreground">Game Over!</h3>
          <p className="text-lg text-muted-foreground">You reached level {level}</p>
          <p className="text-lg font-semibold text-primary">Score: {(level - 1) * 10}</p>
          <Button onClick={startGame} className="flex items-center gap-2 mx-auto">
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

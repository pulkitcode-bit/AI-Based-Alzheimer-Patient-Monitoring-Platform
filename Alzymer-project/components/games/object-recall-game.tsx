'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import { api } from '@/lib/api'

const ALL_OBJECTS = ['🍎', '🎒', '🔑', '👓', '📚', '🎵', '⌚', '🪴', '🎁', '🔦']

interface ObjectRecallGameProps {
  onGameEnd?: (score: number) => void
}

export default function ObjectRecallGame({ onGameEnd }: ObjectRecallGameProps) {
  const [displayedObjects, setDisplayedObjects] = useState<string[]>([])
  const [hiddenObjects, setHiddenObjects] = useState<string[]>([])
  const [selectedObjects, setSelectedObjects] = useState<string[]>([])
  const [level, setLevel] = useState(1)
  const [gamePhase, setGamePhase] = useState<'display' | 'recall' | 'answer'>('display')
  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState<string>('')
  const [showResults, setShowResults] = useState(false)

  const objectsToShow = Math.min(3 + level, 8)

  useEffect(() => {
    startNewLevel()
  }, [])

  const startNewLevel = () => {
    const shuffled = [...ALL_OBJECTS].sort(() => Math.random() - 0.5)
    const objects = shuffled.slice(0, objectsToShow)
    setDisplayedObjects(objects)
    setHiddenObjects(objects)
    setSelectedObjects([])
    setFeedback('')
    setShowResults(false)
    setGamePhase('display')

    setTimeout(() => {
      setGamePhase('recall')
    }, 3000 + level * 500)
  }

  const handleObjectClick = (object: string) => {
    if (gamePhase !== 'recall') return
    if (selectedObjects.includes(object)) return

    const isCorrect = hiddenObjects.includes(object)
    const newSelected = [...selectedObjects, object]
    setSelectedObjects(newSelected)

    if (isCorrect) {
      setFeedback('✓ Correct!')
      setScore(score + 10)
    } else {
      setFeedback('✗ Not in the original list')
    }

    if (newSelected.length === objectsToShow) {
      setTimeout(() => {
        setGamePhase('answer')
      }, 1000)
    }
  }

  const handleNext = () => {
    const correctCount = selectedObjects.filter(obj => hiddenObjects.includes(obj)).length
    const accuracy = (correctCount / objectsToShow) * 100

    const isLastLevel = level >= 5
    if (accuracy >= 80 && !isLastLevel) {
      setLevel(level + 1)
      setTimeout(() => {
        startNewLevel()
      }, 500)
    } else {
      setShowResults(true)

      // Submit score to backend
      const submitScore = async () => {
        try {
          const patientId = localStorage.getItem('patient_id')
          if (patientId) {
            await api.submitGameScore({
              patientId,
              gameType: 'object-recall',
              score,
              level,
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
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="bg-primary/10 rounded-lg p-4 flex-1">
          <p className="text-sm text-muted-foreground mb-1">Level</p>
          <p className="text-3xl font-bold text-primary">{level}</p>
        </div>
        <div className="mx-4">→</div>
        <div className="bg-accent/10 rounded-lg p-4 flex-1">
          <p className="text-sm text-muted-foreground mb-1">Score</p>
          <p className="text-3xl font-bold text-accent">{score}</p>
        </div>
      </div>

      {gamePhase === 'display' && (
        <div className="text-center space-y-6">
          <p className="text-lg text-muted-foreground font-semibold">Remember these objects:</p>
          <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto">
            {displayedObjects.map((obj, i) => (
              <div key={i} className="aspect-square text-5xl flex items-center justify-center bg-primary/10 rounded-lg animate-pulse">
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
            <p className="text-lg font-semibold text-foreground mb-2">Which objects did you see?</p>
            {feedback && (
              <p className={`text-lg font-medium ${feedback.includes('✓') ? 'text-accent' : 'text-red-600'}`}>
                {feedback}
              </p>
            )}
          </div>
          <div className="grid grid-cols-4 gap-4 max-w-2xl mx-auto">
            {ALL_OBJECTS.slice(0, objectsToShow + 2).map((obj, i) => (
              <button
                key={i}
                onClick={() => handleObjectClick(obj)}
                disabled={selectedObjects.includes(obj)}
                className={`aspect-square text-4xl rounded-lg transition-all ${selectedObjects.includes(obj)
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
            <p className="text-lg text-muted-foreground">Objects you selected: {selectedObjects.length}</p>
            <p className="text-lg text-muted-foreground">Correct answers: {selectedObjects.filter(obj => hiddenObjects.includes(obj)).length}</p>
            {selectedObjects.filter(obj => !hiddenObjects.includes(obj)).length > 0 && (
              <p className="text-lg text-muted-foreground">Incorrect: {selectedObjects.filter(obj => !hiddenObjects.includes(obj)).length}</p>
            )}
          </div>
          <Button
            onClick={handleNext}
            className="w-full"
          >
            {level >= 5 ? 'View Results' : 'Next Level'}
          </Button>
        </div>
      )}

      {showResults && (
        <div className="bg-accent/10 border border-accent rounded-lg p-6 text-center space-y-4">
          <h3 className="text-2xl font-bold text-foreground">Game Complete!</h3>
          <p className="text-lg text-muted-foreground">You reached level {level}</p>
          <p className="text-2xl font-bold text-primary">Final Score: {score}</p>
          <Button onClick={() => {
            setLevel(1)
            startNewLevel()
          }} className="flex items-center gap-2 mx-auto">
            <RotateCcw className="w-5 h-5" />
            Play Again
          </Button>
        </div>
      )}
    </div>
  )
}

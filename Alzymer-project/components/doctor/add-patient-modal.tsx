'use client'

import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface AddPatientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: {
    name: string
    age: string
    diagnosis: string
    email: string
  }) => Promise<void>
}

export default function AddPatientModal({ open, onOpenChange, onSave }: AddPatientModalProps) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const reset = () => {
    setName('')
    setAge('')
    setDiagnosis('')
    setEmail('')
    setErrorMessage(null)
  }

  const handleSave = async () => {
    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      await onSave({ name, age, diagnosis, email })
      reset()
      onOpenChange(false)
    } catch (err: any) {
      // Surface the error inside the modal so it stays open
      setErrorMessage(err?.message || 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleCancel() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add New Patient</DialogTitle>
          <DialogDescription>Register a new patient for monitoring</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Patient Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full px-4 py-3 rounded-lg border border-border text-lg bg-background text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Age"
                className="w-full px-4 py-3 rounded-lg border border-border text-lg bg-background text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Diagnosis</label>
              <select
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border text-lg bg-background text-foreground"
              >
                <option value="">Select diagnosis</option>
                <option value="Early-stage Alzheimer's">Early-stage Alzheimer's</option>
                <option value="Mild Cognitive Impairment">Mild Cognitive Impairment</option>
                <option value="Moderate Alzheimer's">Moderate Alzheimer's</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@email.com"
                className="w-full px-4 py-3 rounded-lg border border-border text-lg bg-background text-foreground"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              className="flex-1"
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isSubmitting ? 'Saving...' : 'Save Patient'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

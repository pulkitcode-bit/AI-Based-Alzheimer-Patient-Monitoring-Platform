'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Mail, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LabeledField } from '@/components/auth/labeled-field'
import { PasswordField } from '@/components/auth/password-field'

interface PatientRegisterFormProps {
  onSubmit: (data: { name: string; email: string; password: string }) => Promise<void>
  isLoading?: boolean
  error?: string
}

/**
 * Previously this form lived inline inside app/patient-login/page.tsx —
 * duplicated markup rather than a component, unlike the doctor side which
 * already had its own DoctorRegisterForm. Extracting it means a future field
 * change happens once, and it can now share LabeledField / PasswordField
 * (with the strength meter and show/hide toggle) like every other auth form.
 */
export default function PatientRegisterForm({ onSubmit, isLoading = false, error }: PatientRegisterFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState<string>()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(undefined)

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }

    await onSubmit({ name, email, password })
  }

  const displayError = localError || error
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5">
      {displayError && (
        <div className="flex animate-in items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft p-4 text-destructive-strong fade-in duration-200">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm font-medium leading-relaxed">{displayError}</p>
        </div>
      )}

      <LabeledField
        label="Full name"
        icon={User}
        type="text"
        placeholder="Your full name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        disabled={isLoading}
        autoComplete="name"
      />

      <LabeledField
        label="Email address"
        icon={Mail}
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={isLoading}
        autoComplete="email"
      />

      <PasswordField
        label="Password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        disabled={isLoading}
        autoComplete="new-password"
        showStrength
        hint={password.length === 0 ? 'Must be at least 8 characters long' : undefined}
      />

      <div className="space-y-1.5">
        <PasswordField
          label="Confirm password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isLoading}
          autoComplete="new-password"
        />
        {passwordsMatch && (
          <p className="flex items-center gap-1 text-xs font-medium text-success-strong">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Passwords match
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="mt-3 h-12 w-full rounded-xl text-base font-semibold shadow-soft-md transition-all hover:shadow-soft-lg active:scale-[0.99]"
        disabled={isLoading}
      >
        {isLoading ? 'Creating account...' : 'Create patient account'}
      </Button>
    </form>
  )
}

'use client'

import { useState } from 'react'
import { AlertCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LabeledField } from '@/components/auth/labeled-field'
import { PasswordField } from '@/components/auth/password-field'

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>
  isLoading?: boolean
  error?: string
  role: 'doctor' | 'patient'
}

export default function LoginForm({ onSubmit, isLoading = false, error, role }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(email, password)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5">
      {error && (
        <div className="flex animate-in items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft p-4 text-destructive-strong fade-in duration-200">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm font-medium leading-relaxed">{error}</p>
        </div>
      )}

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
        autoComplete="current-password"
      />

      <Button
        type="submit"
        className="mt-3 h-12 w-full rounded-xl text-base font-semibold shadow-soft-md transition-all hover:shadow-soft-lg active:scale-[0.99]"
        disabled={isLoading}
      >
        {isLoading ? 'Signing in...' : `Sign in as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
      </Button>
    </form>
  )
}

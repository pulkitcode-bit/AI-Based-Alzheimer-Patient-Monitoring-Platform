'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/constants'

export type Role = 'patient' | 'doctor'

const KEYS: Record<Role, string[]> = {
  patient: ['auth_token', 'user_role', 'patient_email', 'patient_id'],
  doctor: ['auth_token', 'user_role', 'doctor_email', 'doctor_id'],
}

function safeGet(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function getStoredEmail(role: Role): string {
  return safeGet(role === 'patient' ? 'patient_email' : 'doctor_email') ?? ''
}

export function getStoredId(role: Role): string | null {
  return safeGet(role === 'patient' ? 'patient_id' : 'doctor_id')
}

export function signOut(role: Role) {
  try {
    KEYS[role].forEach((k) => localStorage.removeItem(k))
    localStorage.removeItem('token')
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

export type AuthState = 'checking' | 'authorised' | 'denied'

/**
 * Client-side route guard.
 *
 * ⚠️ Deliberate scope note: this is a *UX* guard, not a security boundary. It
 * decides what to paint; it does not protect data. Anyone can set these
 * localStorage keys by hand. Real enforcement has to live on the Spring Boot
 * side (a JWT filter plus per-resource ownership checks) — until that exists,
 * treat every protected screen as publicly reachable.
 *
 * The important behavioural difference from the previous implementation: this
 * returns a state instead of blanking the tree. The old layouts rendered a
 * full-screen spinner until a `useEffect` had run, which guaranteed a white
 * flash on *every* navigation even for a user who was already signed in. Here
 * the shell paints immediately and only the content area waits.
 */
export function useAuthGuard(role: Role): AuthState {
  const router = useRouter()
  const [state, setState] = useState<AuthState>('checking')

  useEffect(() => {
    const token = safeGet('auth_token')
    const storedRole = safeGet('user_role')

    if (!token || storedRole !== role) {
      setState('denied')
      router.replace(role === 'patient' ? ROUTES.PATIENT_LOGIN : ROUTES.DOCTOR_LOGIN)
      return
    }

    setState('authorised')
  }, [role, router])

  return state
}

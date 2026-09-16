'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Gamepad2, Heart, ShieldCheck, Trophy } from 'lucide-react'
import LoginForm from '@/components/auth/login-form'
import PatientRegisterForm from '@/components/auth/patient-register-form'
import { AuthShell } from '@/components/auth/auth-shell'
import { ROUTES } from '@/lib/constants'
import { api } from '@/lib/api'

export default function PatientLogin() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [showRegister, setShowRegister] = useState(false)

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true)
    setError(undefined)
    try {
      const response = await api.loginPatient(email, password) as any
      localStorage.setItem('auth_token', response.token)
      localStorage.setItem('user_role', 'patient')
      localStorage.setItem('patient_id', response.patientId)
      localStorage.setItem('patient_email', email)
      router.push(ROUTES.PATIENT_DASHBOARD)
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (data: { name: string; email: string; password: string }) => {
    setIsLoading(true)
    setError(undefined)
    try {
      const response = await api.registerPatient(data) as any
      localStorage.setItem('auth_token', response.token)
      localStorage.setItem('user_role', 'patient')
      localStorage.setItem('patient_id', response.patientId)
      localStorage.setItem('patient_email', data.email)
      router.push(ROUTES.PATIENT_SELECT_DOCTOR)
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      formIcon={Gamepad2}
      formTitle={showRegister ? 'Create your patient account' : 'Welcome back'}
      formDescription={
        showRegister
          ? 'Join NeuroMind to start daily brain exercises and track your health with your doctor.'
          : 'Log in to play daily cognitive games and monitor your brain wellness.'
      }
      panelEyebrow="Cognitive care & wellness"
      panelHeadline="Fun daily games for brain health and vitality"
      panelDescription="Engage in scientifically-inspired memory, attention, and pattern activities tailored to keep your mind sharp and active."
      panelFeatures={[
        {
          icon: Trophy,
          title: 'Interactive challenges',
          description: 'Enjoy short 5-minute cognitive exercises built for daily mental agility.',
        },
        {
          icon: Heart,
          title: 'Guided care team',
          description: 'Stay connected with your doctor who reviews your weekly milestones.',
          tone: 'success',
        },
      ]}
      panelQuote={{
        icon: ShieldCheck,
        text: 'Gentle & encouraging progress — no stressful timers or penalties, just positive daily cognitive exercise.',
      }}
    >
      {!showRegister ? (
        <>
          <LoginForm onSubmit={handleLogin} isLoading={isLoading} error={error} role="patient" />
          <div className="space-y-2 pt-2 text-center text-sm font-medium text-muted-foreground">
            <p>
              Don't have a patient account?{' '}
              <button
                onClick={() => {
                  setError(undefined)
                  setShowRegister(true)
                }}
                className="font-semibold text-primary hover:underline"
              >
                Sign up now
              </button>
            </p>
            <p>
              Are you a doctor?{' '}
              <Link href={ROUTES.DOCTOR_LOGIN} className="font-semibold text-primary hover:underline">
                Doctor login
              </Link>
            </p>
          </div>
        </>
      ) : (
        <>
          <PatientRegisterForm onSubmit={handleRegister} isLoading={isLoading} error={error} />
          <p className="pt-2 text-center text-sm font-medium text-muted-foreground">
            Already have an account?{' '}
            <button
              onClick={() => {
                setError(undefined)
                setShowRegister(false)
              }}
              className="font-semibold text-primary hover:underline"
            >
              Sign in here
            </button>
          </p>
        </>
      )}
    </AuthShell>
  )
}

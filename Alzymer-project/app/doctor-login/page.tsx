'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Activity, LineChart, ShieldCheck, Stethoscope } from 'lucide-react'
import LoginForm from '@/components/auth/login-form'
import { AuthShell } from '@/components/auth/auth-shell'
import { ROUTES } from '@/lib/constants'
import { api } from '@/lib/api'

export default function DoctorLogin() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true)
    setError(undefined)

    try {
      const response: any = await api.loginDoctor(email, password)

      const token = response.token || response.jwt || response.accessToken
      const doctorId = response.doctorId || response.id || response.doctor_id

      if (!token) {
        setError('Login succeeded but no auth token was returned. Check backend response.')
        return
      }

      localStorage.setItem('auth_token', token)
      localStorage.setItem('user_role', 'doctor')
      localStorage.setItem('doctor_id', String(doctorId))
      localStorage.setItem('doctor_email', email)

      router.push(ROUTES.DOCTOR_DASHBOARD)
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      formIcon={Stethoscope}
      formTitle="Welcome back, Doctor"
      formDescription="Sign in to access your clinical dashboard, manage patients, and track cognitive progress."
      panelEyebrow="Doctor clinical portal"
      panelHeadline="Comprehensive cognitive monitoring and intelligence"
      panelDescription="NeuroMind equips medical professionals with real-time patient activity telemetry, AI-backed performance analytics, and custom routine assignments."
      panelFeatures={[
        {
          icon: Activity,
          title: 'Real-time telemetry',
          description: 'Track daily game performance, accuracy trends, and reaction speeds instantly.',
        },
        {
          icon: LineChart,
          title: 'Longitudinal progress',
          description: 'Visualize multi-week cognitive trajectory with objective clinical metrics.',
          tone: 'success',
        },
      ]}
      panelQuote={{
        icon: ShieldCheck,
        text: 'Secure, encrypted architecture — all clinical data is protected in transit and at rest for complete peace of mind.',
      }}
    >
      <LoginForm onSubmit={handleLogin} isLoading={isLoading} error={error} role="doctor" />

      <div className="space-y-2 pt-2 text-center text-sm font-medium text-muted-foreground">
        <p>
          Don't have a doctor account?{' '}
          <Link href={ROUTES.DOCTOR_REGISTER} className="font-semibold text-primary hover:underline">
            Register here
          </Link>
        </p>
        <p>
          Are you a patient?{' '}
          <Link href={ROUTES.PATIENT_LOGIN} className="font-semibold text-primary hover:underline">
            Patient login
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, Sparkles, Stethoscope, UserPlus, Users } from 'lucide-react'
import DoctorRegisterForm from '@/components/auth/doctor-register-form'
import { AuthShell } from '@/components/auth/auth-shell'

export default function DoctorRegister() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push('/doctor-login')
  }

  return (
    <AuthShell
      wideForm
      formIcon={Stethoscope}
      formTitle="Create your clinical account"
      formDescription="Join NeuroMind to manage patients, set cognitive targets, and monitor recovery progress."
      panelEyebrow="Doctor onboarding"
      panelHeadline="Partner in modern cognitive healthcare"
      panelDescription="Join medical practitioners guiding patients through structured, engaging cognitive exercises."
      panelFeatures={[
        {
          icon: UserPlus,
          title: 'Seamless patient linking',
          description: 'Assign customized activities with one click.',
        },
        {
          icon: Users,
          title: 'Multi-patient dashboard',
          description: 'Monitor progress across your entire cohort.',
          tone: 'success',
        },
        {
          icon: ShieldCheck,
          title: 'Verified medical access',
          description: 'Secure portal strictly designed for clinicians.',
          tone: 'warning',
        },
      ]}
      panelQuote={{
        icon: Sparkles,
        text: 'Set up takes about two minutes — you can start linking patients as soon as your account is verified.',
      }}
    >
      <DoctorRegisterForm onSuccess={handleSuccess} />
      <p className="pt-2 text-center text-sm font-medium text-muted-foreground">
        Already registered?{' '}
        <Link href="/doctor-login" className="font-semibold text-primary hover:underline">
          Sign in to doctor portal
        </Link>
      </p>
    </AuthShell>
  )
}

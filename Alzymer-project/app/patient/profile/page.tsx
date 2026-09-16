'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  User,
  Mail,
  Phone,
  Calendar,
  Activity,
  Lock,
  KeyRound,
  ShieldCheck,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Heart
} from 'lucide-react'
import { api } from '@/lib/api'
import { ROUTES } from '@/lib/constants'

export default function PatientProfilePage() {
  const router = useRouter()

  // Profile data states
  const [patientId, setPatientId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState<number | string>('')
  const [diagnosis, setDiagnosis] = useState('')
  const [createdAt, setCreatedAt] = useState<string | null>(null)

  // UI state
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState<string>()
  const [profileSuccess, setProfileSuccess] = useState<string>()
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string>()
  const [passwordSuccess, setPasswordSuccess] = useState<string>()
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  useEffect(() => {
    const id = localStorage.getItem('patient_id')
    if (!id) {
      router.push(ROUTES.PATIENT_LOGIN)
      return
    }
    setPatientId(id)

    const fetchProfile = async () => {
      setIsLoadingProfile(true)
      setProfileError(undefined)
      try {
        const data: any = await api.getPatientProfile(id)
        setName(data.name || '')
        setEmail(data.email || '')
        setPhone(data.phone || data.phoneNumber || '')
        setAge(data.age !== undefined && data.age !== null ? data.age : '')
        setDiagnosis(data.diagnosis || '')
        setCreatedAt(data.createdAt || null)
      } catch (err: any) {
        console.error('[PatientProfilePage] Error fetching profile:', err)
        setProfileError(err.message || 'Failed to load patient profile.')
      } finally {
        setIsLoadingProfile(false)
      }
    }

    fetchProfile()
  }, [router])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId) return

    setIsUpdatingProfile(true)
    setProfileError(undefined)
    setProfileSuccess(undefined)

    try {
      const updated: any = await api.updatePatientProfile({
        patientId: Number(patientId),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        age: age !== '' ? Number(age) : undefined,
        diagnosis: diagnosis.trim()
      })

      setName(updated.name || name)
      setEmail(updated.email || email)
      setPhone(updated.phone || updated.phoneNumber || phone)
      setAge(updated.age !== undefined ? updated.age : age)
      setDiagnosis(updated.diagnosis || diagnosis)

      if (updated.email) {
        localStorage.setItem('patient_email', updated.email)
      }

      setProfileSuccess('Profile information updated successfully!')
      setTimeout(() => setProfileSuccess(undefined), 4000)
    } catch (err: any) {
      console.error('[PatientProfilePage] Error updating profile:', err)
      setProfileError(err.message || 'Failed to update profile.')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId) return

    setPasswordError(undefined)
    setPasswordSuccess(undefined)

    // Client-side validation: match check
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.')
      return
    }

    setIsChangingPassword(true)

    try {
      const res = await api.changePatientPassword({
        patientId: Number(patientId),
        currentPassword,
        newPassword
      })

      setPasswordSuccess(res.message || 'Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(undefined), 4000)
    } catch (err: any) {
      console.warn('[PatientProfilePage] Password change response error:', err?.message || err)
      // Display clear error message when current password is wrong or API fails
      setPasswordError(err.message || 'Failed to change password. Please check your current password.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  if (isLoadingProfile) {
    return (
      <div className="p-8 space-y-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading patient profile...</p>
      </div>
    )
  }

  const initials = name
    ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'PT'

  const joinedFormatted = createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A'

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* ── Top Navigation / Header ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={ROUTES.PATIENT_DASHBOARD}>
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Patient Profile</h1>
            <p className="text-sm text-muted-foreground">Manage your personal details and password settings</p>
          </div>
        </div>
      </div>

      {/* ── Patient Header Card ────────────────────────────────────────── */}
      <Card className="border-border/80 shadow-soft-sm bg-card rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-emerald-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md border-2 border-background shrink-0">
            {initials}
          </div>
          <div className="space-y-2 text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-2xl font-bold text-foreground">{name || 'Patient'}</h2>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 self-center sm:self-auto">
                <Heart className="w-3.5 h-3.5" />
                Patient
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{email}</p>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-muted-foreground">
              {age !== '' && Number(age) > 0 && (
                <div className="flex items-center gap-1.5 bg-background/60 px-3 py-1 rounded-lg border border-border/50">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Age: {age} years</span>
                </div>
              )}
              {diagnosis && (
                <div className="flex items-center gap-1.5 bg-background/60 px-3 py-1 rounded-lg border border-border/50">
                  <Activity className="w-3.5 h-3.5 text-purple-500" />
                  <span>Diagnosis: {diagnosis}</span>
                </div>
              )}
              {createdAt && (
                <div className="flex items-center gap-1.5 bg-background/60 px-3 py-1 rounded-lg border border-border/50">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span>Member since: {joinedFormatted}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Grid Layout for Forms ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ── 1. Editable Personal Info Card ─────────────────────────── */}
        <Card className="border-border/80 shadow-soft-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <User className="w-5 h-5 text-primary" />
              Personal Details
            </CardTitle>
            <CardDescription>Update your personal and contact details</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              {profileError && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="patient-name" className="text-sm font-semibold flex items-center gap-1.5">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Full Name
                </Label>
                <Input
                  id="patient-name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="rounded-xl h-11 border-border focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patient-email" className="text-sm font-semibold flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email Address
                </Label>
                <Input
                  id="patient-email"
                  type="email"
                  placeholder="patient@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl h-11 border-border focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patient-phone" className="text-sm font-semibold flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    Phone Number
                  </Label>
                  <Input
                    id="patient-phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="rounded-xl h-11 border-border focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patient-age" className="text-sm font-semibold flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Age
                  </Label>
                  <Input
                    id="patient-age"
                    type="number"
                    min="1"
                    max="120"
                    placeholder="65"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="rounded-xl h-11 border-border focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="patient-diagnosis" className="text-sm font-semibold flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-muted-foreground" />
                  Diagnosis / Condition
                </Label>
                <Input
                  id="patient-diagnosis"
                  type="text"
                  placeholder="Mild Cognitive Impairment, Early Stage Alzheimer's, etc."
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="rounded-xl h-11 border-border focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="pt-3">
                <Button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="w-full h-11 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-2 transition-all"
                >
                  {isUpdatingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Profile Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ── 2. Change Password Card ──────────────────────────────────── */}
        <Card className="border-border/80 shadow-soft-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <KeyRound className="w-5 h-5 text-amber-500" />
              Change Password
            </CardTitle>
            <CardDescription>Keep your account secure by updating your password</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-5">
              {passwordError && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="patient-current-password" className="text-sm font-semibold flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  Current Password
                </Label>
                <Input
                  id="patient-current-password"
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value)
                    setPasswordError(undefined)
                  }}
                  required
                  className="rounded-xl h-11 border-border focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patient-new-password" className="text-sm font-semibold flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-muted-foreground" />
                  New Password
                </Label>
                <Input
                  id="patient-new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    setPasswordError(undefined)
                  }}
                  required
                  className="rounded-xl h-11 border-border focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patient-confirm-password" className="text-sm font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                  Confirm New Password
                </Label>
                <Input
                  id="patient-confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setPasswordError(undefined)
                  }}
                  required
                  className="rounded-xl h-11 border-border focus:ring-2 focus:ring-primary"
                />
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive font-medium mt-1">Passwords do not match.</p>
                )}
              </div>

              <div className="pt-3">
                <Button
                  type="submit"
                  disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full h-11 rounded-xl font-semibold bg-amber-600 hover:bg-amber-700 text-white gap-2 transition-all"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      Update Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

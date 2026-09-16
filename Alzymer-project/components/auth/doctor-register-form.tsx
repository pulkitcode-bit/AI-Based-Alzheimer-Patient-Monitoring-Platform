'use client'

import { useState } from 'react'
import { AlertCircle, Briefcase, Building, Calendar, CheckCircle, CheckCircle2, Mail, Phone, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LabeledField } from '@/components/auth/labeled-field'
import { PasswordField } from '@/components/auth/password-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'

interface FormData {
  fullName: string
  email: string
  phoneNumber: string
  hospitalName: string
  specialization: string
  yearsOfExperience: string
  password: string
  confirmPassword: string
}

interface FormErrors {
  [key: string]: string
}

interface DoctorRegisterFormProps {
  onSuccess?: () => void
}

const SPECIALIZATIONS = [
  'Neurology',
  'Psychiatry',
  'Geriatrics',
  'General Practice',
  'Internal Medicine',
  'Other',
]

export default function DoctorRegisterForm({ onSuccess }: DoctorRegisterFormProps) {
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phoneNumber: '',
    hospitalName: '',
    specialization: '',
    yearsOfExperience: '',
    password: '',
    confirmPassword: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required'

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required'
    if (!formData.hospitalName.trim()) newErrors.hospitalName = 'Hospital / clinic name is required'
    if (!formData.specialization.trim()) newErrors.specialization = 'Specialization is required'

    if (!formData.yearsOfExperience.trim()) {
      newErrors.yearsOfExperience = 'Years of experience is required'
    } else if (isNaN(Number(formData.yearsOfExperience)) || Number(formData.yearsOfExperience) < 0) {
      newErrors.yearsOfExperience = 'Please enter a valid number'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSpecializationChange = (value: string) => {
    setFormData((prev) => ({ ...prev, specialization: value }))
    if (errors.specialization) setErrors((prev) => ({ ...prev, specialization: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    try {
      await api.registerDoctor({
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        hospitalName: formData.hospitalName,
        specialization: formData.specialization,
        yearsOfExperience: String(formData.yearsOfExperience),
        password: formData.password,
      })

      setIsSuccess(true)
      if (onSuccess) setTimeout(onSuccess, 2000)
    } catch (err: any) {
      setErrors({ submit: err.message || 'Registration failed. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="w-full space-y-4 py-6 text-center">
        <div className="flex justify-center">
          <span className="rounded-2xl bg-success-soft p-3.5 text-success-strong">
            <CheckCircle className="h-12 w-12" aria-hidden />
          </span>
        </div>
        <h2 className="text-2xl">Account created successfully!</h2>
        <p className="text-base text-muted-foreground">
          Your doctor account has been created. Redirecting to login...
        </p>
      </div>
    )
  }

  const passwordsMatch = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4 sm:space-y-5">
      {errors.submit && (
        <div className="flex animate-in items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive-soft p-4 text-destructive-strong fade-in duration-200">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm font-medium leading-relaxed">{errors.submit}</p>
        </div>
      )}

      <LabeledField
        label="Full name"
        icon={User}
        name="fullName"
        placeholder="Dr. John Smith"
        value={formData.fullName}
        onChange={handleChange}
        error={errors.fullName}
        disabled={isLoading}
        autoComplete="name"
      />

      <LabeledField
        label="Email address"
        icon={Mail}
        type="email"
        name="email"
        placeholder="doctor@hospital.com"
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
        disabled={isLoading}
        autoComplete="email"
      />

      <LabeledField
        label="Phone number"
        icon={Phone}
        type="tel"
        name="phoneNumber"
        placeholder="+1 (555) 123-4567"
        value={formData.phoneNumber}
        onChange={handleChange}
        error={errors.phoneNumber}
        disabled={isLoading}
        autoComplete="tel"
      />

      <LabeledField
        label="Hospital / clinic name"
        icon={Building}
        name="hospitalName"
        placeholder="Medical Center Name"
        value={formData.hospitalName}
        onChange={handleChange}
        error={errors.hospitalName}
        disabled={isLoading}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-foreground">Specialization</label>
          <Select value={formData.specialization} onValueChange={handleSpecializationChange} disabled={isLoading}>
            <SelectTrigger className="relative h-12 w-full pl-12 text-base" aria-invalid={!!errors.specialization}>
              <Briefcase
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <SelectValue placeholder="Select specialty" />
            </SelectTrigger>
            <SelectContent>
              {SPECIALIZATIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.specialization && (
            <p className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive-strong">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden />
              {errors.specialization}
            </p>
          )}
        </div>

        <LabeledField
          label="Years experience"
          icon={Calendar}
          type="number"
          name="yearsOfExperience"
          placeholder="10"
          value={formData.yearsOfExperience}
          onChange={handleChange}
          error={errors.yearsOfExperience}
          disabled={isLoading}
          min={0}
          max={70}
        />
      </div>

      <PasswordField
        label="Password"
        placeholder="••••••••"
        value={formData.password}
        onChange={handleChange}
        name="password"
        error={errors.password}
        disabled={isLoading}
        autoComplete="new-password"
        showStrength
        hint={formData.password.length === 0 ? 'Must be at least 8 characters long' : undefined}
      />

      <div className="space-y-1.5">
        <PasswordField
          label="Confirm password"
          placeholder="••••••••"
          value={formData.confirmPassword}
          onChange={handleChange}
          name="confirmPassword"
          error={errors.confirmPassword}
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
        {isLoading ? 'Creating account...' : 'Complete doctor registration'}
      </Button>
    </form>
  )
}

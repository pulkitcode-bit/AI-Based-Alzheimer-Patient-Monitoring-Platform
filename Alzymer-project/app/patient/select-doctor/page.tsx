'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { getStoredId } from '@/lib/auth'
import { ROUTES } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/shared/empty-state'
import {
  AlertCircle,
  Building2,
  CheckCircle,
  ChevronRight,
  Clock,
  Loader2,
  Search,
  Stethoscope,
  Star,
} from 'lucide-react'

interface Doctor {
  id: number
  fullName: string
  specialization: string
  hospitalName: string
  yearsOfExperience: string
  email: string
  phoneNumber?: string
}

/**
 * SIGNUP FLOW — Step 2
 *
 * After patient registration, they land here to pick a primary doctor, then
 * get routed to the appointment page to book their first visit (that page
 * saves the selection as primary via the `setPrimary` flag).
 */
export default function SelectDoctorPage() {
  const router = useRouter()

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [filtered, setFiltered] = useState<Doctor[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Doctor | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    const patientId = getStoredId('patient')
    if (!patientId) {
      router.push(ROUTES.PATIENT_LOGIN)
      return
    }

    api
      .getAllDoctors()
      .then((data) => {
        setDoctors(data)
        setFiltered(data)
      })
      .catch((err: any) => setError(err.message || 'Failed to load doctors. Please try again.'))
      .finally(() => setIsLoading(false))
  }, [router])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(
      doctors.filter(
        (d) =>
          d.fullName.toLowerCase().includes(q) ||
          d.specialization?.toLowerCase().includes(q) ||
          d.hospitalName?.toLowerCase().includes(q),
      ),
    )
  }, [search, doctors])

  const handleConfirm = () => {
    if (!selected) return
    router.push(
      `${ROUTES.PATIENT_APPOINTMENT}?doctorId=${selected.id}&doctorName=${encodeURIComponent(
        `Dr. ${selected.fullName}`,
      )}&setPrimary=true`,
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
          <p className="text-lg">Loading available doctors...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-3 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary-muted">
            <Stethoscope className="h-8 w-8" aria-hidden />
          </span>
          <h1 className="text-4xl">Choose your doctor</h1>
          <p className="mx-auto max-w-md text-lg text-muted-foreground">
            Select a primary doctor who will oversee your care. You can always book with other doctors later.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive-soft p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
            <p className="text-sm text-destructive-strong">{error}</p>
          </div>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="text"
            placeholder="Search by name, specialization, or hospital..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-13 pl-12"
          />
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No doctors found"
              description={`Nothing matched "${search}". Try a different name or specialization.`}
            />
          ) : (
            filtered.map((doctor) => {
              const isSelected = selected?.id === doctor.id
              return (
                <button
                  key={doctor.id}
                  onClick={() => setSelected(isSelected ? null : doctor)}
                  aria-pressed={isSelected}
                  className={`w-full rounded-2xl border p-5 text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-primary/50 bg-primary-soft ring-2 ring-primary/25'
                      : 'border-border bg-card hover:border-primary/25 hover:bg-accent/40'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary-soft text-primary-muted'
                      }`}
                    >
                      {doctor.fullName.charAt(0)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold leading-tight text-foreground">
                          Dr. {doctor.fullName}
                        </h3>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary-muted">
                            <CheckCircle className="h-3 w-3" aria-hidden />
                            Selected
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {doctor.specialization && (
                          <span className="flex items-center gap-1.5">
                            <Star className="h-3.5 w-3.5 text-warning" aria-hidden />
                            {doctor.specialization}
                          </span>
                        )}
                        {doctor.hospitalName && (
                          <span className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" aria-hidden />
                            {doctor.hospitalName}
                          </span>
                        )}
                        {doctor.yearsOfExperience && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" aria-hidden />
                            {doctor.yearsOfExperience} yrs experience
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight
                      className={`mt-1 h-5 w-5 shrink-0 transition-colors ${
                        isSelected ? 'text-primary' : 'text-muted-foreground/50'
                      }`}
                      aria-hidden
                    />
                  </div>
                </button>
              )
            })
          )}
        </div>

        <div className="sticky bottom-6 space-y-3 pt-4">
          <Button
            onClick={handleConfirm}
            disabled={!selected}
            size="lg"
            className="w-full gap-2 rounded-2xl py-4 text-lg font-semibold shadow-soft-lg"
          >
            {selected ? (
              <>
                Continue with Dr. {selected.fullName}
                <ChevronRight className="h-5 w-5" aria-hidden />
              </>
            ) : (
              'Select a doctor to continue'
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            You can book appointments with any doctor after selecting your primary doctor.
          </p>
        </div>
      </div>
    </div>
  )
}

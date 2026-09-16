'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  Plus,
  Sparkles,
  Stethoscope,
  Trash2,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { getStoredId } from '@/lib/auth'
import { ROUTES } from '@/lib/constants'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ListSkeleton, PageHeaderSkeleton } from '@/components/shared/skeletons'

interface Appointment {
  id: string | number
  doctorName: string
  date: string
  time: string
  type: string
  status?: 'pending' | 'approved' | 'confirmed' | 'rejected' | 'cancelled'
}

const APPOINTMENT_TYPES = ['Check-up', 'Progress Review', 'Medication Adjustment', 'Emergency Consultation']

const STATUS_STYLE: Record<string, { border: string; badge: string; label: string }> = {
  approved: { border: 'border-l-4 border-l-success', badge: 'bg-success-soft text-success-strong', label: 'Approved' },
  confirmed: { border: 'border-l-4 border-l-success', badge: 'bg-success-soft text-success-strong', label: 'Approved' },
  rejected: { border: 'border-l-4 border-l-destructive opacity-80', badge: 'bg-destructive-soft text-destructive-strong', label: 'Rejected' },
  cancelled: { border: 'border-l-4 border-l-destructive opacity-80', badge: 'bg-destructive-soft text-destructive-strong', label: 'Cancelled' },
  pending: { border: 'border-l-4 border-l-warning', badge: 'bg-warning-soft text-warning-strong', label: 'Pending approval' },
}

export default function AppointmentPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [showForm, setShowForm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isBooking, setIsBooking] = useState(false)
  const [error, setError] = useState<string>()
  const [cancellingId, setCancellingId] = useState<string | number | null>(null)
  const [formData, setFormData] = useState({ date: '', time: '', type: 'Check-up', notes: '' })

  const [preselectedDoctorId, setPreselectedDoctorId] = useState<number | undefined>()
  const [preselectedDoctorName, setPreselectedDoctorName] = useState('Your doctor')
  const [setPrimaryFlag, setSetPrimaryFlag] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const dId = params.get('doctorId')
    const dName = params.get('doctorName')
    if (dId) {
      setPreselectedDoctorId(Number(dId))
      setShowForm(true)
    }
    if (dName) setPreselectedDoctorName(dName)
    if (params.get('setPrimary') === 'true') setSetPrimaryFlag(true)
  }, [])

  useEffect(() => {
    const patientId = getStoredId('patient')
    if (!patientId) {
      router.push(ROUTES.PATIENT_LOGIN)
      return
    }

    api
      .getAppointments(patientId)
      .then((response: any) => {
        const loaded = Array.isArray(response) ? response : []
        setAppointments(
          loaded.map((apt) => {
            let formattedDate = apt.date
            if (formattedDate && !String(formattedDate).includes(',')) {
              try {
                formattedDate = new Date(formattedDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              } catch {
                // Keep the raw value if it isn't a parseable date string.
              }
            }
            return { ...apt, doctorName: apt.doctorName || 'Your doctor', date: formattedDate }
          }),
        )
      })
      .catch((err: any) => {
        if (err.status === 403 || err.message?.includes('Forbidden')) {
          setAppointments([])
        } else {
          setError(err.message || 'Failed to load appointments')
        }
      })
      .finally(() => setIsLoading(false))
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.date || !formData.time) {
      setError('Please fill in the date and time.')
      return
    }

    setIsBooking(true)
    setError(undefined)

    try {
      const patientId = getStoredId('patient')
      if (!patientId) {
        setError('Please log in to book an appointment.')
        return
      }

      const response: any = await api.bookAppointment({
        patientId,
        doctorId: preselectedDoctorId,
        date: formData.date,
        time: formData.time,
        type: formData.type,
        notes: formData.notes,
        setPrimary: setPrimaryFlag,
      })

      const docName =
        response.doctorName ||
        response.doctor?.name ||
        response.doctor?.fullName ||
        preselectedDoctorName

      setAppointments((prev) => [
        ...prev,
        {
          id: response.id || prev.length + 1,
          doctorName: docName,
          date: new Date(formData.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          time: formData.time,
          type: formData.type,
          status: 'pending',
        },
      ])
      setFormData({ date: '', time: '', type: 'Check-up', notes: '' })
      setShowForm(false)
    } catch (err: any) {
      setError(err.message || 'Failed to book appointment. Please try again.')
    } finally {
      setIsBooking(false)
    }
  }

  const handleCancel = async (appointmentId: string | number) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return

    setCancellingId(appointmentId)
    const previous = appointments
    setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? { ...a, status: 'cancelled' } : a)))

    try {
      await api.cancelAppointment(appointmentId.toString())
    } catch (err: any) {
      setAppointments(previous)
      setError(err.message || 'Failed to cancel appointment')
    } finally {
      setCancellingId(null)
    }
  }

  // Surfaces the soonest confirmed visit at the top of the page — a patient
  // shouldn't have to scan a list to answer "when do I next see my doctor?"
  const nextAppointment = useMemo(() => {
    const now = Date.now()
    return appointments
      .filter((a) => a.status === 'approved' || a.status === 'confirmed')
      .map((a) => ({ ...a, timestamp: Date.parse(`${a.date} ${a.time}`) }))
      .filter((a) => !Number.isNaN(a.timestamp) && a.timestamp >= now)
      .sort((a, b) => a.timestamp - b.timestamp)[0]
  }, [appointments])

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
        <PageHeaderSkeleton />
        <ListSkeleton count={3} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8">
      <PageHeader
        title="Appointments"
        description="Schedule and manage your doctor visits and consultations."
        icon={Calendar}
        actions={
          <Button onClick={() => setShowForm((v) => !v)} size="lg" className="gap-2 rounded-xl font-semibold">
            {showForm ? 'Cancel booking' : (
              <>
                <Plus className="h-5 w-5" aria-hidden />
                Book appointment
              </>
            )}
          </Button>
        }
      />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive-soft p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
          <p className="text-sm text-destructive-strong">{error}</p>
        </div>
      )}

      {nextAppointment && !showForm && (
        <div className="surface flex flex-col gap-4 border-info/25 bg-info-soft/40 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-info-soft text-info-strong">
              <Stethoscope className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="eyebrow text-info-strong">Your next appointment</p>
              <p className="font-display text-lg font-bold text-foreground">
                {nextAppointment.doctorName} · {nextAppointment.type}
              </p>
              <p className="text-sm text-muted-foreground">
                {nextAppointment.date} at {nextAppointment.time}
              </p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <Card className="border-primary/30 animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader>
            <h2 className="flex items-center gap-2 text-xl">
              <Calendar className="h-5 w-5 text-primary" aria-hidden />
              Schedule new appointment
            </h2>
            <p className="text-sm text-muted-foreground">
              {preselectedDoctorId
                ? `Booking a session with ${preselectedDoctorName}`
                : 'Select your preferred date, time, and topic to consult your doctor.'}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="apt-date" className="block text-sm font-semibold text-foreground">
                    Date
                  </label>
                  <Input
                    id="apt-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="apt-time" className="block text-sm font-semibold text-foreground">
                    Time
                  </label>
                  <Input
                    id="apt-time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                    className="h-12"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-foreground">Appointment type</label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger className="h-12 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="apt-notes" className="block text-sm font-semibold text-foreground">
                  Notes for doctor <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Textarea
                  id="apt-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Share any recent symptoms, questions, or topics you want to discuss..."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full rounded-xl py-3 text-base font-bold" disabled={isBooking}>
                {isBooking ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                    Booking appointment...
                  </>
                ) : (
                  'Confirm & schedule'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <h2 className="text-2xl">Your appointments</h2>
        {appointments.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title="No scheduled appointments"
            description="You don't have any upcoming doctor appointments. Schedule a check-up or progress review anytime."
            action={
              <Button onClick={() => setShowForm(true)} className="rounded-xl font-semibold">
                Book your first appointment
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const style = STATUS_STYLE[appointment.status?.toLowerCase() ?? 'pending'] ?? STATUS_STYLE.pending
              return (
                <Card key={appointment.id} className={`overflow-hidden ${style.border}`}>
                  <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info-strong">
                          <Stethoscope className="h-5 w-5" aria-hidden />
                        </span>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">{appointment.doctorName}</h3>
                          <p className="text-xs text-muted-foreground">Primary healthcare provider</p>
                        </div>
                        <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold sm:ml-2 ${style.badge}`}>
                          {style.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3 pt-1 text-sm text-muted-foreground sm:grid-cols-3">
                        <span className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                          <span className="font-medium text-foreground">{appointment.date}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                          <span className="font-medium text-foreground">{appointment.time}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 shrink-0 text-success" aria-hidden />
                          <span className="font-medium text-foreground">{appointment.type}</span>
                        </span>
                      </div>
                    </div>

                    {appointment.status !== 'cancelled' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancel(appointment.id)}
                        disabled={cancellingId === appointment.id}
                        className="shrink-0 rounded-xl"
                      >
                        {cancellingId === appointment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <>
                            <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
                            Cancel
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <Card className="surface bg-info-soft/40">
        <CardHeader>
          <h3 className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-info" aria-hidden />
            Tips for your next doctor visit
          </h3>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ['Bring progress data', 'Show your latest cognitive game scores and trends to help your doctor track your health.'],
            ['Write down questions', "Note any symptoms or concerns beforehand so you don't forget."],
            ['Schedule when alert', 'Book during times of day when you naturally feel most alert.'],
          ].map(([title, body]) => (
            <div key={title} className="space-y-1 rounded-xl border border-border/50 bg-card/70 p-3.5">
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

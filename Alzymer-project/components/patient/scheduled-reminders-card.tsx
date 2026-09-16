'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AlarmClock, Loader2, Plus, Repeat, Trash2, X } from 'lucide-react'
import { api } from '@/lib/api'
import { getStoredId } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/empty-state'
import { Skeleton } from '@/components/ui/skeleton'

interface ScheduledReminder {
  id: number
  label: string
  recurrence: 'ONCE' | 'DAILY'
  nextTriggerAt: string
  active: boolean
}

function formatNextTrigger(iso: string, recurrence: 'ONCE' | 'DAILY') {
  const date = new Date(iso)
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (recurrence === 'DAILY') return `${time} every day`

  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  return isToday ? `Today at ${time}` : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${time}`
}

/**
 * Patient-managed recurring/future reminders — "take medication at 8am
 * daily", "play a game at 5pm". Backed by ScheduledReminderService, which
 * runs a minute-by-minute check and delivers each one as a real notification
 * (visible in the bell) once its time arrives. The same backend also powers
 * the chat assistant's "remind me to..." handling, so a reminder set either
 * way shows up here.
 */
export default function ScheduledRemindersCard() {
  const [reminders, setReminders] = useState<ScheduledReminder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [label, setLabel] = useState('')
  const [time, setTime] = useState('08:00')
  const [recurrence, setRecurrence] = useState<'ONCE' | 'DAILY'>('DAILY')
  const [showForm, setShowForm] = useState(false)

  const patientId = getStoredId('patient')

  const load = useCallback(async () => {
    if (!patientId) return
    try {
      const data = await api.getScheduledReminders(patientId)
      setReminders(data)
    } catch {
      // Non-fatal — the card just shows empty rather than blocking the dashboard.
    } finally {
      setIsLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    load()
  }, [load])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || !label.trim()) return

    setIsAdding(true)
    try {
      await api.createScheduledReminder({ patientId, label: label.trim(), time, recurrence })
      toast.success('Reminder scheduled')
      setLabel('')
      setShowForm(false)
      await load()
    } catch (err: any) {
      toast.error(err.message || 'Could not schedule that reminder.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!patientId) return
    setDeletingId(id)
    const previous = reminders
    setReminders((prev) => prev.filter((r) => r.id !== id))
    try {
      await api.deleteScheduledReminder(id, patientId)
    } catch {
      setReminders(previous)
      toast.error('Could not cancel that reminder.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="surface p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl">
          <AlarmClock className="h-5 w-5 text-primary" aria-hidden />
          Your reminders
        </h2>
        <Button
          size="sm"
          variant={showForm ? 'outline' : 'default'}
          onClick={() => setShowForm((v) => !v)}
          className="gap-1.5 rounded-xl"
        >
          {showForm ? <X className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
          {showForm ? 'Cancel' : 'Add reminder'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="reminder-label" className="text-xs font-medium text-muted-foreground">
              Remind me to
            </label>
            <Input
              id="reminder-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Take morning medication"
              required
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reminder-time" className="text-xs font-medium text-muted-foreground">
              Time
            </label>
            <Input
              id="reminder-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="h-10 w-32"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Repeats</label>
            <div className="flex h-10 items-center gap-1 rounded-xl border border-border bg-background p-1">
              {(['DAILY', 'ONCE'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setRecurrence(opt)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    recurrence === opt
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {opt === 'DAILY' ? 'Daily' : 'Once'}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" disabled={isAdding || !label.trim()} className="h-10 shrink-0 rounded-xl">
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'Save'}
          </Button>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : reminders.length === 0 ? (
        <EmptyState
          icon={AlarmClock}
          title="No reminders set"
          description="Add one above, or just tell the chat assistant — try “remind me to take my medicine at 8am daily”."
        />
      ) : (
        <div className="space-y-2">
          {reminders.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border p-3.5"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{r.label}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {r.recurrence === 'DAILY' && <Repeat className="h-3 w-3" aria-hidden />}
                  {formatNextTrigger(r.nextTriggerAt, r.recurrence)}
                </p>
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                disabled={deletingId === r.id}
                className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive-strong disabled:opacity-50"
                aria-label={`Cancel reminder: ${r.label}`}
              >
                {deletingId === r.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

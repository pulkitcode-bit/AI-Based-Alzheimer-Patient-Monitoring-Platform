'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, X, CheckCheck, Loader2, Stethoscope, Inbox } from 'lucide-react'
import { api } from '@/lib/api'

export interface ReminderNotification {
  id: number
  patientId: number
  doctorId?: number
  message: string
  sentAt: string
  isRead: boolean
  doctorName?: string
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return ''
  const now = new Date()
  const past = new Date(dateStr)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

  if (diffInSeconds < 30) return 'Just now'
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [reminders, setReminders] = useState<ReminderNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)

  const getPatientId = (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('patient_id')
  }

  // ── 1. Fetch unread count ────────────────────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    const patientId = getPatientId()
    if (!patientId) return
    try {
      const data = await api.getUnreadReminderCount(patientId)
      if (typeof data?.unreadCount === 'number') {
        setUnreadCount(data.unreadCount)
      } else if (typeof data?.count === 'number') {
        setUnreadCount(data.count)
      }
    } catch (err) {
      console.warn('[NotificationBell] Failed to fetch unread count:', err)
    }
  }, [])

  // ── 2. Fetch full reminders list ──────────────────────────────────────────
  const fetchReminders = useCallback(async () => {
    const patientId = getPatientId()
    if (!patientId) return
    setIsLoading(true)
    try {
      const data = await api.getPatientReminders(patientId)
      if (Array.isArray(data)) {
        setReminders(data)
        const unread = data.filter((r) => !r.isRead).length
        setUnreadCount(unread)
      }
    } catch (err) {
      console.warn('[NotificationBell] Failed to fetch reminders:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ── 3. Mark all as read ──────────────────────────────────────────────────
  const handleMarkAllAsRead = useCallback(async () => {
    const patientId = getPatientId()
    if (!patientId) return
    try {
      await api.markAllRemindersAsRead(patientId)
      setUnreadCount(0)
      setReminders((prev) => prev.map((r) => ({ ...r, isRead: true })))
    } catch (err) {
      console.error('[NotificationBell] Failed to mark all as read:', err)
    }
  }, [])

  // ── 4. Dismiss / Delete single reminder ──────────────────────────────────
  const handleDismiss = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    setIsDeletingId(id)
    try {
      await api.deleteReminder(id)
    } catch (err: any) {
      // A 404 here means the reminder is already gone server-side (deleted
      // from another tab, or a "mark all read" + delete race) — the delete
      // is idempotent from the user's point of view, so still remove it from
      // the list instead of leaving a stuck item and surfacing a confusing
      // "Not Found" error for something that already achieved its goal.
      if (err?.status !== 404) {
        console.error('[NotificationBell] Failed to delete reminder:', err)
        setIsDeletingId(null)
        return
      }
    }

    setReminders((prev) => {
      const next = prev.filter((r) => r.id !== id)
      const newUnread = next.filter((r) => !r.isRead).length
      setUnreadCount(newUnread)
      return next
    })
    setIsDeletingId(null)
  }

  // ── Polling & window focus listener ──────────────────────────────────────
  useEffect(() => {
    fetchUnreadCount()

    // Poll count every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount()
    }, 30000)

    // Re-fetch on tab focus
    const handleFocus = () => {
      fetchUnreadCount()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [fetchUnreadCount])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle panel open
  const handleToggle = () => {
    const nextOpen = !isOpen
    setIsOpen(nextOpen)

    if (nextOpen) {
      fetchReminders()
      // If there are unread notifications, mark them read after short delay
      if (unreadCount > 0) {
        setTimeout(() => {
          handleMarkAllAsRead()
        }, 800)
      }
    }
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* ── Bell Trigger Button ───────────────────────────────────────────── */}
      <button
        onClick={handleToggle}
        className="relative p-2.5 rounded-full text-muted-foreground hover:text-foreground
                   hover:bg-muted/60 transition-all duration-200 focus:outline-none
                   focus:ring-2 focus:ring-primary/30 active:scale-95"
        aria-label="Doctor Notifications"
        title="Notifications from your doctor"
      >
        <Bell className="w-5 h-5" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span
            className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center
                       rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm
                       animate-in zoom-in-75 duration-200"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown / Popover Panel ───────────────────────────────────────── */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-card border border-border
                     shadow-xl z-50 overflow-hidden animate-in fade-in-50 slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold text-sm text-foreground">Doctor Messages</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {unreadCount} new
                </span>
              )}
            </div>

            {reminders.some((r) => !r.isRead) && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700
                           dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                title="Mark all messages as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Body List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
            {isLoading ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading reminders…</span>
              </div>
            ) : reminders.length > 0 ? (
              reminders.map((rem) => (
                <div
                  key={rem.id}
                  className={`group relative p-4 transition-colors flex gap-3 ${
                    !rem.isRead
                      ? 'bg-blue-500/5 hover:bg-blue-500/10'
                      : 'hover:bg-muted/30'
                  }`}
                >
                  {/* Unread indicator dot */}
                  <div className="pt-1 shrink-0">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        !rem.isRead ? 'bg-blue-500 shadow-sm' : 'bg-transparent'
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {rem.doctorName || 'Doctor'}
                      </span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {formatRelativeTime(rem.sentAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed break-words">
                      {rem.message}
                    </p>
                  </div>

                  {/* Dismiss / Delete Button */}
                  <button
                    onClick={(e) => handleDismiss(e, rem.id)}
                    disabled={isDeletingId === rem.id}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground
                               hover:text-destructive hover:bg-destructive/10 transition-all absolute top-3 right-3"
                    title="Dismiss reminder"
                  >
                    {isDeletingId === rem.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
                <div className="p-3 rounded-full bg-muted/30 text-muted-foreground/60">
                  <Inbox className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground max-w-[200px]">
                  Messages and reminders from your doctor will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send, Bot, Loader2, AlertCircle, Sparkles, PhoneCall } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { getStoredId } from '@/lib/auth'

interface Message {
  id: string
  text: string
  sender: 'user' | 'assistant'
  timestamp: Date
}

const QUICK_QUESTIONS = [
  "What's my latest score?",
  "Set me a reminder",
  "How do I play?",
  "Need help"
]

export default function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your NeuroMind AI assistant. I'm here to help with questions, reminders, and support. How can I help you today?",
      sender: 'assistant',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [chatError, setChatError] = useState<string>()
  // Id of the assistant bubble currently being filled in token-by-token, so
  // the message list can show a typing indicator inside that specific bubble
  // rather than a separate element that would sit oddly next to it.
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const getPatientId = (): string | null => getStoredId('patient')

  // Load chat history when drawer opens or component mounts
  const loadChatHistory = useCallback(async () => {
    const patientId = getPatientId()
    if (!patientId) return

    setIsLoadingHistory(true)
    setChatError(undefined)
    try {
      const history = await api.getChatHistory(patientId)
      if (history.messages && Array.isArray(history.messages) && history.messages.length > 0) {
        setMessages(
          history.messages.map((msg: any) => ({
            id: msg.id ? String(msg.id) : Date.now().toString(),
            text: msg.text || msg.content || msg.message || '',
            sender: msg.sender || (msg.role === 'user' ? 'user' : 'assistant'),
            timestamp: msg.timestamp ? new Date(msg.timestamp) : (msg.createdAt ? new Date(msg.createdAt) : new Date())
          }))
        )
      }
    } catch (error: any) {
      console.warn('[FloatingChatWidget] Failed to load chat history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadChatHistory()
      // Focus moves into the panel the moment it opens, so a keyboard user
      // doesn't have to tab through the whole page to start typing.
      inputRef.current?.focus()
    }
  }, [isOpen, loadChatHistory])

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  // Escape closes the drawer — it's a modal-like overlay, so it should behave
  // like one instead of trapping the user until they find the small X button.
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  const handleSend = async (messageTextToSend?: string) => {
    const textToSend = messageTextToSend || input
    if (!textToSend.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: textToSend.trim(),
      sender: 'user',
      timestamp: new Date()
    }
    const assistantId = (Date.now() + 1).toString()

    // The assistant bubble is inserted empty and filled in as chunks arrive —
    // that's what makes the reply feel like it's being typed live instead of
    // appearing all at once after a multi-second wait.
    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, text: '', sender: 'assistant', timestamp: new Date() },
    ])
    if (!messageTextToSend) setInput('')
    setIsLoading(true)
    setStreamingId(assistantId)
    setChatError(undefined)

    try {
      const patientId = getPatientId()
      await api.sendChatMessageStream(textToSend.trim(), patientId || undefined, (chunk) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, text: m.text + chunk } : m))
        )
      })
    } catch (error: any) {
      console.error('[FloatingChatWidget] Send error:', error)
      setChatError(error.message || 'Failed to send message')
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, text: "Sorry, I'm having trouble understanding right now. Please try again." }
            : m
        )
      )
    } finally {
      setIsLoading(false)
      setStreamingId(null)
    }
  }

  // ── "Talk to my doctor" escalation ────────────────────────────────────────
  // Deliberately does NOT reuse api.sendReminder here: that endpoint writes a
  // Reminder row that the PATIENT's own notification bell displays as a
  // message "from" their doctor — using it for a patient-to-doctor message
  // would render backwards. Booking an urgent appointment instead lands the
  // request in the doctor's existing pending-appointments queue, which is a
  // real, doctor-visible, actionable inbox that already works today.
  const [isEscalating, setIsEscalating] = useState(false)

  const handleEscalate = async () => {
    const patientId = getPatientId()
    if (!patientId) return

    setIsEscalating(true)
    try {
      const doctor: any = await api.getPrimaryDoctor(patientId)
      if (!doctor) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            text: "You don't have a primary doctor set yet — choose one from your dashboard first, and I'll be able to reach them for you.",
            sender: 'assistant',
            timestamp: new Date(),
          },
        ])
        return
      }

      const today = new Date().toISOString().slice(0, 10)
      await api.bookAppointment({
        patientId,
        doctorId: doctor.id,
        date: today,
        time: 'ASAP',
        type: 'Urgent (via AI Assistant)',
        notes: 'Patient requested to speak with a doctor through the NeuroMind chat assistant.',
      })

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: `I've reached out to Dr. ${doctor.fullName} — your request is in their queue and they'll get back to you soon. You can check on it any time from your Appointments page.`,
          sender: 'assistant',
          timestamp: new Date(),
        },
      ])
      toast.success('Request sent to your doctor')
    } catch (err: any) {
      toast.error(err.message || "Couldn't reach your doctor right now — please try again.")
    } finally {
      setIsEscalating(false)
    }
  }

  return (
    <>
      {/* ── Round floating button ────────────────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full
                     bg-ai p-4 text-ai-foreground shadow-soft-lg transition-all duration-200
                     hover:scale-105 hover:shadow-soft-xl active:scale-95"
          aria-label="Open chat assistant"
          title="Open AI chat assistant"
        >
          <MessageSquare className="h-6 w-6 transition-transform duration-200 group-hover:rotate-12" aria-hidden />
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-success" />
          </span>
        </button>
      )}

      {/* ── Slide-in drawer ──────────────────────────────────────────────── */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="NeuroMind chat assistant"
          className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border
                     bg-card shadow-soft-xl animate-in slide-in-from-right duration-300 sm:w-105"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-ai-soft/40 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ai-soft text-ai-strong">
                <Bot className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h3 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
                  NeuroMind Assistant
                  <Sparkles className="h-3.5 w-3.5 text-warning" aria-hidden />
                </h3>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-block h-2 w-2 rounded-full bg-success" aria-hidden />
                  Online · Healthcare AI
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          {/* Escalation — always visible, not tucked in the quick-suggestions
              list, since this is a safety action rather than a casual prompt. */}
          <button
            onClick={handleEscalate}
            disabled={isEscalating}
            className="mx-4 mt-3 flex items-center justify-center gap-2 rounded-xl border border-info/25
                       bg-info-soft px-3 py-2.5 text-sm font-semibold text-info-strong transition-colors
                       hover:bg-info/15 disabled:opacity-60"
          >
            {isEscalating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <PhoneCall className="h-4 w-4" aria-hidden />
            )}
            Talk to my doctor
          </button>

          {chatError && (
            <div className="mx-4 mt-3 flex items-center justify-between gap-2 rounded-xl border border-destructive/20 bg-destructive-soft p-3 text-xs text-destructive-strong">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                {chatError}
              </span>
              <button onClick={() => setChatError(undefined)} className="hover:opacity-80" aria-label="Dismiss">
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          )}

          {/* Messages — aria-live announces each new reply to screen readers
              without re-reading the whole history every time. */}
          <div
            className="flex-1 space-y-4 overflow-y-auto p-4"
            aria-live="polite"
            role="log"
          >
            {isLoadingHistory ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span className="text-sm">Loading chat history…</span>
              </div>
            ) : (
              messages.map((message) => {
                const isStreamingEmpty = message.id === streamingId && message.text === ''
                return (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                        message.sender === 'user'
                          ? 'rounded-br-none bg-primary text-primary-foreground'
                          : 'rounded-bl-none border border-border/50 bg-muted text-foreground'
                      }`}
                    >
                      {isStreamingEmpty ? (
                        <div className="flex items-center gap-1.5 py-0.5" aria-label="Assistant is typing">
                          <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                          <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.2s]" />
                          <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.4s]" />
                        </div>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {message.text}
                            {message.id === streamingId && (
                              <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-current align-middle" />
                            )}
                          </p>
                          <p
                            className={`mt-1.5 text-right text-[10px] ${
                              message.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}
                          >
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions */}
          <div className="border-t border-border/60 bg-muted/10 px-4 py-2">
            <p className="eyebrow mb-1.5">Quick suggestions</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  disabled={isLoading}
                  className="rounded-full border border-border bg-muted px-2.5 py-1 text-left text-xs
                             text-foreground transition-colors hover:bg-ai-soft hover:text-ai-strong disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-border bg-card p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask your assistant..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                aria-label="Message"
                className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="shrink-0 rounded-xl bg-ai p-2.5 text-ai-foreground transition-colors
                           hover:opacity-90 disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// When running in the browser, use relative URLs so Next.js rewrites proxy
// the request to the backend — this avoids CORS issues entirely.
// On the server side (SSR), use the absolute backend URL.
const BASE_URL =
  typeof window !== 'undefined'
    ? '' // relative: browser requests go through Next.js proxy
    : (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080')

/** Set NEXT_PUBLIC_DEBUG_API=1 in .env.local to trace API calls in the console. */
const DEBUG = process.env.NEXT_PUBLIC_DEBUG_API === '1'

export class ApiError extends Error {
  status: number
  response?: any

  constructor(message: string, status: number, response?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.response = response
  }
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      // Try 'auth_token' first, then fallback to 'token'
      return localStorage.getItem('auth_token') || localStorage.getItem('token') || null
    }
    return null
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs = 15_000,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    // Without this, a stopped/unreachable backend leaves every page stuck on
    // its loading skeleton forever: fetch has no built-in timeout, so a
    // request to a dead server just sits pending indefinitely instead of
    // failing. A 15s cap means the caller always gets a real error to show,
    // rather than a spinner nobody can distinguish from "still just slow."
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    // Add JWT token to Authorization header if available
    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Request tracing is opt-in via NEXT_PUBLIC_DEBUG_API=1 rather than always
    // on. The previous version logged every call on every page load — including
    // a preview of the bearer token, which is a credential leak into the
    // browser console (and into any error-reporting tool that scrapes it).
    if (DEBUG) {
      console.debug(`[API] ${options.method || 'GET'} ${endpoint}`)
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (DEBUG) {
        console.debug(`[API] ${response.status} ${endpoint}`)
      }

      if (!response.ok) {
        let errorMessage = response.statusText || 'API request failed'
        let errorBody: any = null
        
        if (response.status === 401) {
          errorMessage = 'Unauthorized: Please log in again.'
        } else if (response.status === 403) {
          errorMessage = 'Forbidden: You do not have permission to access this resource.'
        } else if (response.status >= 500) {
          errorMessage = 'Server error: Please try again later.'
        }

        try {
          const text = await response.text()
          if (text) {
            errorBody = JSON.parse(text)
            errorMessage = errorBody.message || errorBody.error || errorBody.detail || errorMessage
          }
        } catch (e) {
          // Use default error message if body is not JSON or empty
        }

        throw new ApiError(errorMessage, response.status, errorBody)
      }

      const text = await response.text()
      if (!text) {
        return {} as T
      }
      
      try {
        return JSON.parse(text)
      } catch (e) {
        // If it's not valid JSON, but response was OK, return the text directly
        return text as unknown as T
      }
    } catch (error: any) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        throw new ApiError(
          "The server didn't respond in time. It may be offline — please try again shortly.",
          0,
        )
      }
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError(
          'Network error or CORS issue. Please check your connection to the backend.',
          0
        )
      }
      throw error
    }
  }

  // Auth endpoints
  async loginDoctor(email: string, password: string) {
    return this.request('/api/auth/doctor/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }
  async loginPatient(email: string, password: string) {
    return this.request('/api/auth/patient/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password }),
    })
  }

  async registerDoctor(data: {
    fullName: string
    email: string
    phoneNumber: string
    hospitalName: string
    specialization: string
    yearsOfExperience: string
    password: string
  }) {
    return this.request('/api/auth/doctor/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async registerPatient(data: {
    name: string
    email: string
    password: string
  }) {
    return this.request('/api/auth/patient/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Game endpoints
  async submitGameScore(data: {
    patientId: string
    gameType: string
    score: number
    moves?: number
    time?: number
    level?: number
  }) {
    return this.request('/api/game/submit-score', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Game session endpoint (activity-based scoring)
  async submitGameSession(data: {
    patientId: number
    activityId: string
    rawScore: number
    accuracy: number
    timeTaken: number
    consistency: number
  }) {
    // Backend validation requires accuracy and consistency to be decimals between 0.0 and 1.0
    const normalizedData = {
      ...data,
      accuracy: data.accuracy > 1 ? Number((data.accuracy / 100).toFixed(4)) : data.accuracy,
      consistency: data.consistency > 1 ? Number((data.consistency / 100).toFixed(4)) : data.consistency,
    }
    return this.request<{
      sessionId: number
      patientId: number
      activityId: string
      activityName: string
      finalScore: number
      accuracy: number
      speed: number
      consistency: number
      timeTaken: number
      rawScore: number
      createdAt: string
    }>('/api/game-sessions', {
      method: 'POST',
      body: JSON.stringify(normalizedData),
    })
  }

  // Activities endpoints
  async getActivities() {
    return this.request<any[]>('/api/activities', {
      method: 'GET',
    })
  }

  async getActivityById(activityId: string) {
    return this.request<any>(`/api/activities/${activityId}`, {
      method: 'GET',
    })
  }

  // Chat endpoints
  async sendChatMessage(message: string, patientId?: string) {
    const url = patientId ? `/api/chat/send?patientId=${patientId}` : '/api/chat/send'
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  }

  /**
   * Streaming variant — reads the response body as it arrives instead of
   * waiting for the full reply, so it can't go through the shared `request()`
   * helper (that one calls response.text() up front). Calls `onChunk` for
   * each piece of text as it streams in and resolves with the full message
   * once the backend closes the stream.
   */
  async sendChatMessageStream(
    message: string,
    patientId: string | undefined,
    onChunk: (chunk: string) => void,
  ): Promise<string> {
    const url = patientId
      ? `${this.baseUrl}/api/chat/send-stream?patientId=${patientId}`
      : `${this.baseUrl}/api/chat/send-stream`

    const token = this.getToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    // Only guards the connection phase — once the response headers arrive the
    // timer is cleared, so a genuinely long streaming reply is never cut off.
    // Without this, a stopped backend leaves the chat bubble's typing
    // indicator spinning forever instead of surfacing a real error.
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20_000)

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message }),
        signal: controller.signal,
      })
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new ApiError("The assistant didn't respond in time. It may be offline.", 0)
      }
      throw new ApiError('Network error — please check your connection to the backend.', 0)
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok || !response.body) {
      throw new ApiError(response.statusText || 'Chat request failed', response.status)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let full = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      full += chunk
      onChunk(chunk)
    }

    return full
  }

  // Appointment endpoints
  async bookAppointment(data: {
    patientId: string
    doctorId?: number     // optional — omit to use patient's primaryDoctorId
    date: string
    time: string
    type: string
    notes?: string
    setPrimary?: boolean  // true during signup to save doctor as primary
  }) {
    return this.request('/api/appointment/book', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getAppointments(patientId: string) {
    try {
      const response = await this.request<any>(`/api/appointment/list?patientId=${patientId}`, {
        method: 'GET',
      })
      // If the backend returns an array directly, return it. Otherwise try to get appointments property.
      return Array.isArray(response) ? response : (response?.appointments || [])
    } catch (error: any) {
      if (error.status === 403 || error.status === 404 || error.message?.includes('Forbidden')) {
        console.warn('Received 403/404 for appointments, returning empty list');
        return []
      }
      throw error
    }
  }

  // Patient endpoints
  async getPatientProgress(patientId: string) {
    return this.request(`/api/patient/progress?patientId=${patientId}`, {
      method: 'GET',
    })
  }

  // Recommendation endpoints
  async getRecommendations(patientId: string) {
    return this.request<any>(`/api/recommend/${patientId}`, {
      method: 'GET',
    })
  }

  // Doctor endpoints
  async getDoctorPatients(doctorId: string) {
    return this.request(`/api/doctor/patients?doctorId=${doctorId}`, {
      method: 'GET',
    })
  }

  async getDoctorAnalytics(doctorId: string, days = 30) {
    return this.request(`/api/doctor/analytics?doctorId=${doctorId}&days=${days}`, {
      method: 'GET',
    })
  }

  /** Patients whose average score dropped 20%+ week-over-week. */
  async getDoctorDeclineAlerts(doctorId: string) {
    return this.request<Array<{
      patientId: number
      patientName: string
      declinePercent: number
      thisWeekAvg: number
      prevWeekAvg: number
    }>>(`/api/doctor/analytics/alerts?doctorId=${doctorId}`, { method: 'GET' })
  }

  /** Patients who haven't logged a session in at least `minDays` days. */
  async getDoctorInactivePatients(doctorId: string, minDays = 3) {
    return this.request<Array<{
      patientId: number
      patientName: string
      lastPlayedDate: string | null
      daysSinceLastPlayed: number | null
    }>>(`/api/doctor/analytics/inactive?doctorId=${doctorId}&minDays=${minDays}`, { method: 'GET' })
  }

  async getPatientDetails(patientId: string) {
    return this.request(`/api/doctor/patient/${patientId}`, {
      method: 'GET',
    })
  }

  async sendReminder(patientId: string, message: string, doctorId?: string) {
    return this.request('/api/reminders', {
      method: 'POST',
      body: JSON.stringify({
        patientId: Number(patientId),
        doctorId: doctorId ? Number(doctorId) : undefined,
        message,
      }),
    })
  }

  async getPatientReminders(patientId: string) {
    return this.request<any[]>(`/api/reminders/patient/${patientId}`, {
      method: 'GET',
    })
  }

  async getUnreadReminderCount(patientId: string) {
    return this.request<{ unreadCount: number; count: number }>(`/api/reminders/patient/${patientId}/unread-count`, {
      method: 'GET',
    })
  }

  async markReminderAsRead(reminderId: number) {
    return this.request<{ message: string }>(`/api/reminders/${reminderId}/read`, {
      method: 'PUT',
    })
  }

  async markAllRemindersAsRead(patientId: string) {
    return this.request<{ message: string; updatedCount?: number }>(`/api/reminders/patient/${patientId}/read-all`, {
      method: 'PUT',
    })
  }

  async deleteReminder(reminderId: number) {
    return this.request<{ message: string }>(`/api/reminders/${reminderId}`, {
      method: 'DELETE',
    })
  }

  async addPatient(data: {
    doctorId: string
    patientId: string
  }) {
    return this.request('/api/doctor/patients/add', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async createNewPatient(data: {
    doctorId: string
    name: string
    age: number
    diagnosis: string
    email: string
  }) {
    return this.request('/api/doctor/patients/create', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deletePatient(patientId: number) {
    return this.request(`/api/doctor/patients/delete/${patientId}`, {
      method: 'DELETE',
    })
  }

  // Patient endpoints - enhanced
  async getPatientHistory(patientId: string) {
    return this.request(`/api/patient/history?patientId=${patientId}`, {
      method: 'GET',
    })
  }

  async getPatientStats(patientId: string) {
    return this.request(`/api/patient/stats?patientId=${patientId}`, {
      method: 'GET',
    })
  }

  /** Average score per cognitive domain, e.g. { "Working Memory": 62.5, ... }. */
  async getPatientDomainScores(patientId: string) {
    return this.request<Record<string, number>>(`/api/patient/domain-scores?patientId=${patientId}`, {
      method: 'GET',
    })
  }

  // Chat endpoints - enhanced
  async getChatHistory(patientId: string) {
    const data = await this.request<any>(`/api/chat/history?patientId=${patientId}`, {
      method: 'GET',
    })
    return Array.isArray(data) ? { messages: data } : data
  }

  // Appointment endpoints - enhanced
  async cancelAppointment(appointmentId: string) {
    return this.request('/api/appointment/cancel', {
      method: 'POST',
      body: JSON.stringify({ appointmentId }),
    })
  }

  async getDoctorAppointments(doctorId: string) {
    return this.request<any[]>(`/api/appointment/doctor/${doctorId}`, {
      method: 'GET',
    })
  }

  async approveAppointment(appointmentId: string | number) {
    return this.request(`/api/appointment/approve/${appointmentId}`, {
      method: 'PUT',
    })
  }

  async rejectAppointment(appointmentId: string | number) {
    return this.request(`/api/appointment/reject/${appointmentId}`, {
      method: 'PUT',
    })
  }

  async updateAppointmentStatus(appointmentId: string, status: 'approved' | 'rejected') {
    const endpoint = status === 'approved' ? 'approve' : 'reject'
    return this.request(`/api/appointment/${endpoint}/${appointmentId}`, {
      method: 'PUT',
    })
  }

  // ── Doctor-selection endpoints ──────────────────────────────────────────

  /**
   * SIGNUP FLOW — returns all registered doctors so the patient can pick one.
   */
  async getAllDoctors() {
    return this.request<any[]>('/api/patient/all-doctors', { method: 'GET' })
  }

  /**
   * LOGIN FLOW — returns { primaryDoctor, otherDoctors } for the patient dashboard.
   */
  async getDoctorsForPatient(patientId: string) {
    return this.request<{
      primaryDoctor: any | null
      otherDoctors: any[]
    }>(`/api/patient/doctors?patientId=${patientId}`, { method: 'GET' })
  }

  /**
   * Returns only the patient's primary doctor (or null/204 if unset).
   */
  async getPrimaryDoctor(patientId: string) {
    try {
      return await this.request<any>(`/api/patient/primary-doctor?patientId=${patientId}`, { method: 'GET' })
    } catch (err: any) {
      if (err.status === 204) return null
      throw err
    }
  }

  /**
   * Saves or changes the patient's primary doctor.
   */
  async setPrimaryDoctor(patientId: string, doctorId: number) {
    return this.request('/api/patient/primary-doctor', {
      method: 'PUT',
      body: JSON.stringify({ patientId: Number(patientId), doctorId }),
    })
  }

  // ── Profile & Password Change endpoints ──────────────────────────────────

  async getDoctorProfile(doctorId: string) {
    return this.request<any>(`/api/doctor/profile?doctorId=${doctorId}`, { method: 'GET' })
  }

  async updateDoctorProfile(data: { doctorId: number; name?: string; fullName?: string; email?: string; phone?: string; phoneNumber?: string }) {
    return this.request<any>('/api/doctor/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async changeDoctorPassword(data: { doctorId: number; currentPassword: string; newPassword: string }) {
    return this.request<{ message: string }>('/api/doctor/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async getPatientProfile(patientId: string) {
    return this.request<any>(`/api/patient/profile?patientId=${patientId}`, { method: 'GET' })
  }

  async updatePatientProfile(data: { patientId: number; name?: string; email?: string; phone?: string; age?: number; diagnosis?: string }) {
    return this.request<any>('/api/patient/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async changePatientPassword(data: { patientId: number; currentPassword: string; newPassword: string }) {
    return this.request<{ message: string }>('/api/patient/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // ── Scheduled (recurring / future) reminders ────────────────────────────

  async createScheduledReminder(data: {
    patientId: string
    label: string
    time: string // "HH:mm"
    recurrence: 'ONCE' | 'DAILY'
  }) {
    return this.request<{ id: number }>('/api/scheduled-reminders', {
      method: 'POST',
      body: JSON.stringify({ ...data, patientId: Number(data.patientId) }),
    })
  }

  async getScheduledReminders(patientId: string) {
    return this.request<Array<{
      id: number
      label: string
      recurrence: 'ONCE' | 'DAILY'
      nextTriggerAt: string
      active: boolean
    }>>(`/api/scheduled-reminders?patientId=${patientId}`, { method: 'GET' })
  }

  async deleteScheduledReminder(id: number, patientId: string) {
    return this.request<{ message: string }>(
      `/api/scheduled-reminders/${id}?patientId=${patientId}`,
      { method: 'DELETE' },
    )
  }
}

export const api = new ApiClient(BASE_URL)

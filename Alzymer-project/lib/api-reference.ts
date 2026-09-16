const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'

interface ApiError {
  message: string
  status: number
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token')
    }
    return null
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    // Add JWT token to Authorization header if available
    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        let errorMessage = response.statusText || 'API request failed'
        try {
          const errorBody = await response.json()
          errorMessage = errorBody.message || errorBody.error || errorMessage
        } catch (e) {
          // Use default error message if body is not JSON
        }
        
        const error: ApiError = {
          message: errorMessage,
          status: response.status,
        }
        throw error
      }

      const data = await response.json()
      return data
    } catch (error) {
      if (error instanceof TypeError) {
        throw {
          message: 'Network error. Please check your connection.',
          status: 0,
        } as ApiError
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

  async loginPatient(id: string, password: string) {
    return this.request('/api/auth/patient/login', {
      method: 'POST',
      body: JSON.stringify({ id, password }),
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

  // Chat endpoints
  async sendChatMessage(message: string, patientId?: string) {
    return this.request('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({ message, patientId }),
    })
  }

  // Appointment endpoints
  async bookAppointment(data: {
    patientId: string
    date: string
    time: string
    type: string
    notes?: string
  }) {
    return this.request('/api/appointment/book', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getAppointments(patientId: string) {
    return this.request(`/api/appointment/list?patientId=${patientId}`, {
      method: 'GET',
    })
  }

  // Patient endpoints
  async getPatientProgress(patientId: string) {
    return this.request(`/api/patient/progress?patientId=${patientId}`, {
      method: 'GET',
    })
  }

  // Doctor endpoints
  async getDoctorPatients(doctorId: string) {
    return this.request(`/api/doctor/patients?doctorId=${doctorId}`, {
      method: 'GET',
    })
  }

  async getDoctorAnalytics(doctorId: string) {
    return this.request(`/api/doctor/analytics?doctorId=${doctorId}`, {
      method: 'GET',
    })
  }

  async getPatientDetails(patientId: string) {
    return this.request(`/api/doctor/patient/${patientId}`, {
      method: 'GET',
    })
  }

  async sendReminder(patientId: string, message: string) {
    return this.request('/api/doctor/reminder', {
      method: 'POST',
      body: JSON.stringify({ patientId, message }),
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

  // Chat endpoints - enhanced
  async getChatHistory(patientId: string) {
    return this.request(`/api/chat/history?patientId=${patientId}`, {
      method: 'GET',
    })
  }

  // Appointment endpoints - enhanced
  async cancelAppointment(appointmentId: string) {
    return this.request('/api/appointment/cancel', {
      method: 'POST',
      body: JSON.stringify({ appointmentId }),
    })
  }

  async updateAppointmentStatus(appointmentId: string, status: 'approved' | 'rejected') {
    return this.request('/api/appointment/update-status', {
      method: 'POST',
      body: JSON.stringify({ appointmentId, status }),
    })
  }
}

export const api = new ApiClient(BASE_URL)

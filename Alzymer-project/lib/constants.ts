export const API_ENDPOINTS = {
  DOCTOR_LOGIN: '/api/auth/doctor-login',
  DOCTOR_REGISTER: '/api/auth/doctor-register',
  PATIENT_LOGIN: '/api/auth/patient-login',
  PATIENT_REGISTER: '/api/auth/patient-register',
  SUBMIT_GAME_SCORE: '/api/patient/submit-score',
  GET_PATIENT_PROGRESS: '/api/patient/progress',
  GET_DOCTOR_PATIENTS: '/api/doctor/patients',
  SEND_CHAT_MESSAGE: '/api/chat/send',
  BOOK_APPOINTMENT: '/api/appointment/book',
  GET_EMOTIONS: '/api/emotions',
  ADD_PATIENT: '/api/doctor/patients/add'
}

export const GAME_TYPES = {
  MEMORY_CARD: 'memory-card',
  PATTERN_SEQUENCE: 'pattern-sequence',
  OBJECT_RECALL: 'object-recall'
}

export const ROUTES = {
  HOME: '/',
  DOCTOR_LOGIN: '/doctor-login',
  DOCTOR_REGISTER: '/doctor/register',
  PATIENT_LOGIN: '/patient-login',
  DOCTOR_DASHBOARD: '/doctor/dashboard',
  DOCTOR_PATIENTS: '/doctor/patients',
  DOCTOR_ANALYTICS: '/doctor/analytics',
  PATIENT_DASHBOARD: '/patient/dashboard',
  PATIENT_SELECT_DOCTOR: '/patient/select-doctor',
  PATIENT_GAMES: '/patient/games',
  PATIENT_PROGRESS: '/patient/progress',
  PATIENT_CHATBOT: '/patient/chatbot',
  PATIENT_APPOINTMENT: '/patient/appointment',
  DOCTOR_PROFILE: '/doctor/profile',
  PATIENT_PROFILE: '/patient/profile'
}

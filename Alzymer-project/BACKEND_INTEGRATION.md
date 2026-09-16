# NeuroMind Backend Integration Guide

This document outlines all the backend API integrations implemented in the NeuroMind healthcare platform.

## Overview

The NeuroMind frontend has been fully enhanced to integrate with a Spring Boot backend API. All components now use real API calls with JWT token authentication, comprehensive error handling, and loading states.

## Configuration

Set the backend URL via environment variables:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
```

If not set, it defaults to `http://localhost:8080`.

## API Service Layer

**File**: `lib/api.ts`

The API service provides a centralized client for all backend communication with:
- Automatic JWT token attachment to all requests (via `Authorization: Bearer <token>` header)
- Proper error handling with user-friendly messages
- Network error detection
- Request/response mapping

## Authentication APIs

### Doctor Authentication
- **Login**: `POST /api/auth/doctor/login`
  - Request: `{ email, password }`
  - Response: `{ token, doctorId }`
  
- **Register**: `POST /api/auth/doctor/register`
  - Request: `{ fullName, email, phoneNumber, hospitalName, specialization, yearsOfExperience, password }`
  - Response: `{ token, doctorId }`

### Patient Authentication
- **Login**: `POST /api/auth/patient/login`
  - Request: `{ id, password }`
  - Response: `{ token, patientId }`

- **Register**: `POST /api/auth/patient/register`
  - Request: `{ name, email, password }`
  - Response: `{ token, patientId }`

## Enhanced Features

### 1. Doctor Dashboard Enhancement
**File**: `app/doctor/dashboard/page.tsx`

Features:
- Fetches doctor's patients list from backend
- Displays real analytics data (total patients, avg completion rate, improvement)
- Click on patient to view details in modal
- Send reminders to patients

Related Components:
- `components/doctor/patient-detail-modal.tsx` - Patient details and reminder sending

APIs Used:
- `GET /api/doctor/patients?doctorId=` - Get doctor's patient list
- `GET /api/doctor/analytics?doctorId=` - Get analytics data
- `GET /api/doctor/patient/{id}` - Get patient details
- `POST /api/doctor/reminder` - Send reminder to patient

### 2. Patient Progress Enhancement
**File**: `app/patient/progress/page.tsx`

Features:
- Load chat history from backend on mount
- Display score history charts with real data
- Show game distribution
- Display recent game sessions in table
- Responsive loading and error states

APIs Used:
- `GET /api/patient/history?patientId=` - Get patient history
- `GET /api/patient/stats?patientId=` - Get patient statistics

### 3. Game Score Submission
**Files**: `components/games/memory-game.tsx`, `pattern-game.tsx`, `object-recall-game.tsx`

Features:
- Submit game scores to backend immediately after game ends
- Include game type, score, time, moves, and difficulty level
- Async submission doesn't block UI

API Used:
- `POST /api/game/submit-score` - Submit game score with metadata

### 4. Doctor Analytics Dashboard
**File**: `app/doctor/analytics/page.tsx`

Features:
- Display key metrics (total patients, active users, average score, improvement trend)
- Show weekly game completions chart
- Show average score progression chart
- Show game distribution by type
- Loading and error states

API Used:
- `GET /api/doctor/analytics?doctorId=` - Get comprehensive analytics data

### 5. Chat with History
**File**: `app/patient/chatbot/page.tsx`

Features:
- Load previous chat messages from backend on mount
- Send new messages and get responses
- Display loading state while fetching
- Error handling with dismissible alerts
- Automatic scroll to latest message

APIs Used:
- `GET /api/chat/history?patientId=` - Get previous chat messages
- `POST /api/chat/send` - Send chat message and receive response

### 6. Appointment Management
**File**: `api/patient/appointment/page.tsx`

Features:
- Load appointments on page mount
- Book new appointments
- Cancel appointments
- Display appointment status (pending, approved, rejected, cancelled)
- Loading states for all actions
- Error notifications

APIs Used:
- `GET /api/appointment/list?patientId=` - Get patient's appointments
- `POST /api/appointment/book` - Book appointment
- `POST /api/appointment/cancel` - Cancel appointment
- `POST /api/appointment/update-status` - Update appointment status (doctor-side)

## Error Handling

All pages include:
- Error state display with `AlertCircle` icon
- User-friendly error messages from backend
- Network error detection
- Error dismissal capability
- Form validation with error messages
- Loading skeletons and spinners

## Loading States

All async operations display appropriate feedback:
- Page-level loading states
- Form submission spinners
- Action button spinners
- Loading skeleton screens
- Animated loading indicators

## JWT Token Management

The API client automatically:
1. Retrieves the token from `localStorage` (key: `auth_token`)
2. Attaches it to every request in the `Authorization: Bearer` header
3. Handles token-based responses

Token is set during login/registration and cleared on logout.

## Required Backend Endpoints

Ensure your Spring Boot backend implements all endpoints defined in `lib/api.ts`:

### Authentication (6 endpoints)
- POST /api/auth/doctor/login
- POST /api/auth/doctor/register
- POST /api/auth/patient/login
- POST /api/auth/patient/register

### Doctor Operations (5 endpoints)
- GET /api/doctor/patients
- GET /api/doctor/analytics
- GET /api/doctor/patient/{id}
- POST /api/doctor/reminder
- POST /api/doctor/patients/add

### Patient Operations (2 endpoints)
- GET /api/patient/history
- GET /api/patient/stats

### Games (1 endpoint)
- POST /api/game/submit-score

### Chat (2 endpoints)
- POST /api/chat/send
- GET /api/chat/history

### Appointments (3 endpoints)
- GET /api/appointment/list
- POST /api/appointment/book
- POST /api/appointment/cancel
- POST /api/appointment/update-status

**Total: 19 API endpoints**

## Testing the Integration

1. Set `NEXT_PUBLIC_BACKEND_URL` in `.env.local`
2. Start the Spring Boot backend
3. Test login pages - should call auth endpoints
4. Test doctor dashboard - should load real patient data
5. Test patient progress - should display real game history
6. Test appointment booking - should submit to backend
7. Test chatbot - should load history and send messages
8. Play games - scores should submit to backend

## Security Notes

- All authenticated requests include JWT token
- Sensitive data (passwords) only in POST requests
- Token stored in localStorage (accessible to XSS - consider httpOnly cookies for production)
- All user inputs validated before submission
- Error messages don't expose sensitive system information

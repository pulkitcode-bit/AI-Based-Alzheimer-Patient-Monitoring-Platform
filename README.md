# NeuroMind

An AI-assisted cognitive care platform that turns everyday gameplay into clinically meaningful therapy for patients with memory and cognitive decline (e.g. Alzheimer's/dementia) — with a doctor-facing dashboard for continuous, proactive monitoring.

## Why

Cognitive decline patients need regular, structured mental exercise, and caregivers need an easy way to know who's struggling without manually reviewing every session. NeuroMind pairs a patient-facing game platform with a doctor-facing analytics dashboard, so gameplay data becomes something a clinician can actually act on.

## Features

**Patient portal**
- 10 cognitive activities modeled on standard neuropsychological test formats — Trail Making (A & B), Stroop Challenge, Go/No-Go, Digit Span (forward & backward), Corsi Block Recall, N-Back, Word Fluency, and Choice Reaction Time — covering processing speed, executive function, attention/inhibition, working memory, visuospatial memory, sustained attention, and language.
- Each session is scored on accuracy, speed, and consistency against per-activity weightings, not just a raw score.
- Adaptive activity recommendation: a Flask microservice looks at the patient's average score per cognitive domain and recommends the next activity from their weakest domain, steering to an easier variant when they're genuinely struggling.
- Reminders for medicines, hydration, daily activities, and appointments — set once, delivered automatically by a backend scheduler.
- AI companion chat (Groq-hosted LLM), streamed token-by-token, prompted to be empathetic, patient, and simple to follow.
- Appointment booking with assigned doctor(s), progress history, and profile management.

**Doctor portal**
- Patient roster with individual session history and stats.
- Analytics dashboard: weekly completion trends, score progression charts, activity-type distribution.
- Proactive alerts: patients whose average score has dropped week-over-week, and patients who've gone inactive — surfaced automatically instead of requiring manual review.
- Send reminders and manage patient appointments directly.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Radix UI, Recharts |
| Backend | Spring Boot (Java), REST APIs, JWT, BCrypt, Spring Scheduling |
| Database | PostgreSQL (Neon) |
| Recommendation engine | Python, Flask, pandas |
| Conversational AI | Groq API (`openai/gpt-oss-120b`), server-sent-event streaming |

## Architecture

```
Browser (Patient / Doctor)
        │
        ▼
Next.js Frontend (Alzymer-project/)
        │  REST + JWT
        ▼
Spring Boot Backend (neuromind-backend/)
   ├─ Auth (patient/doctor login & register)
   ├─ Activities & Game Sessions
   ├─ Reminders (instant + scheduled, delivered by a background job)
   ├─ Appointments
   ├─ Doctor Analytics (trends, decline alerts, inactivity detection)
   └─ AI Chat (proxies to Groq)
        │
        ├──► PostgreSQL (Neon) — all persistent data
        ├──► ml-service/ (Flask) — adaptive activity recommendation
        └──► Groq LLM API — AI companion responses
```

## Project Structure

```
neuromind/
├── Alzymer-project/     # Next.js frontend (patient + doctor portals)
├── neuromind-backend/   # Spring Boot REST API
└── ml-service/          # Flask recommendation microservice
```

## Getting Started

### Prerequisites
- Node.js 18+
- Java 17+ and Maven
- Python 3.10+
- A PostgreSQL database (e.g. a free [Neon](https://neon.tech) instance)
- A [Groq API key](https://console.groq.com) for the AI chat feature

### 1. Backend (`neuromind-backend/`)

Copy `.env.example` to `.env` and fill in your own values:

```env
DB_URL=jdbc:postgresql://<HOST>:<PORT>/<DATABASE_NAME>?sslmode=require
DB_USERNAME=<YOUR_DB_USERNAME>
DB_PASSWORD=<YOUR_DB_PASSWORD>
JWT_SECRET=<YOUR_SUPER_SECRET_JWT_KEY_AT_LEAST_32_CHARS>
JWT_EXPIRATION=36000000
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
```

Then run:

```bash
cd neuromind-backend
./mvnw spring-boot:run
```

Backend starts on `http://localhost:8080`.

### 2. ML recommendation service (`ml-service/`)

```bash
cd ml-service
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Runs on `http://localhost:5000`.

### 3. Frontend (`Alzymer-project/`)

```bash
cd Alzymer-project
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
```

```bash
npm run dev
```

Runs on `http://localhost:3000`.

## Roadmap

- Multilingual, voice-assisted interaction for elderly users
- Regional/cultural theming for localized deployments
- Offline-first support with background sync for low-connectivity environments
- Enforced route-level authentication and per-resource ownership checks
- Replace the rule-based recommender with a trained ML model as more session data accumulates

## License

Add a license of your choice (MIT recommended for a portfolio project) before making the repository public.

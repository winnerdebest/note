# NoteApp Monorepo - FastAPI Backend Migration & Mobile-First Plan

## Status: Backend & Mobile Integration Completed 🚀
- **FastAPI Backend**: Located at [`backend/`](./backend) (FastAPI + Neon PostgreSQL + JWT Auth + Atomic Sync Engine).
- **Mobile Project**: Located at [`mobile/`](./mobile) (React Native + Expo SDK 54, offline SQLite storage + native sync).
- **Web Landing Page**: Located at [`web/`](./web) (Repurposed as a responsive marketing landing page with download links).

---

## 1. Architecture Overview
We have transitioned from Supabase BaaS to a standalone **FastAPI (Python)** backend connected to **Neon Serverless PostgreSQL**, paired with the **Mobile App** and its offline-first sync engine.

```
+-----------------------------------------------------------+
|               Mobile App (Expo / React Native)            |
|  - UI Screens (Auth, Notes List, Editor, Trash, Settings) |
|  - Local Storage: expo-sqlite (Instant offline reads/save)|
|  - Sync Engine: lib/sync.ts (Single round-trip sync)      |
+-----------------------------------------------------------+
                              |
                     REST API (Bearer JWT)
                              |
+-----------------------------------------------------------+
|                      FastAPI Backend                      |
|  - Auth: /api/v1/auth (Register, Login, Me)               |
|  - Notes: /api/v1/notes (CRUD)                            |
|  - Sync: /api/v1/notes/sync (Batch Push & Delta Pull)     |
|  - Database: SQLAlchemy + Neon Serverless PostgreSQL      |
+-----------------------------------------------------------+
```

---

## 2. Completed Milestones

1. ✅ **Neon Serverless Database Integration**:
   - Connection established with SSL and pool recycle management (`ep-winter-sky-b9lr7vn6`).
   - Tables created and verified: `users`, `notes`.
2. ✅ **FastAPI Backend Architecture**:
   - Modular structure: `models/`, `schemas/`, `routers/`, `security.py`, `config.py`.
   - Secure `bcrypt` password hashing and `PyJWT` bearer token auth.
   - Dedicated `/api/v1/notes/sync` atomic push/pull endpoint with last-write-wins conflict resolution.
3. ✅ **End-to-End Verification**:
   - Automated integration tests (`test_api.py`) passing 100%.
4. ✅ **Web Landing Page**:
   - Replaced web auth gate with a modern product landing page showcasing offline capabilities and download CTAs.
5. ✅ **Mobile App Migration**:
   - Created `mobile/lib/api.ts` for JWT handling and API communication.
   - Updated `mobile/lib/sync.ts` to use single round-trip batch sync.
   - Updated `mobile/app/auth/index.tsx` with email/password authentication.
   - Updated `mobile/app/_layout.tsx` and `settings.tsx` to handle session state without Supabase SDK.

---

## 3. How to Run

### Run Backend
```bash
cd backend
.\venv\Scripts\python run.py
# API Docs available at http://localhost:8000/docs
```

### Run Mobile App
```bash
cd mobile
npm start
```

### Run Web Landing Page
```bash
cd web
npm run dev
# Landing page available at http://localhost:3000
```

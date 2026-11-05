# NoteApp Monorepo

Unified repository containing the mobile client, web client, and planned FastAPI backend.

## Structure

```
noteapp/
├── mobile/          # React Native & Expo Mobile App (Primary Focus)
├── web/             # Next.js 16 Web App
└── backend/         # FastAPI Backend Service (Planned migration from Supabase)
```

## Workspaces

- **Mobile**: See [`mobile/package.json`](./mobile/package.json). Run `npm run start` or `npm run android` / `npm run ios`.
- **Web**: See [`web/package.json`](./web/package.json). Run `npm run dev` or `pnpm dev`.
- **Backend**: (Planned) Python FastAPI + PostgreSQL/SQLite service.

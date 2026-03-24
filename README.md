# CutOff CRM

Next.js + Supabase CRM for call intelligence, follow-up tasks, and admin monitoring.

## Stack

- Next.js App Router
- Supabase Auth + Postgres + Realtime
- Native route handlers under `app/api`

## Setup

1. Install dependencies

```bash
npm install
```

2. Add environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

3. Apply the schema in [supabase/schema.sql](./supabase/schema.sql)

4. Start the app

```bash
npm run dev
```

## Routes

- `/calls/new` fast call logging
- `/calls` calls list with detail drawer
- `/tasks` task management
- `/admin` admin dashboard
- `/sign-in` Supabase magic-link auth

## API

- `POST /api/calls`
- `GET /api/calls`
- `GET /api/customers`
- `GET /api/admin/dashboard`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`

## Notes

- Role is read from Supabase user metadata: `admin` or `staff`
- Calls and tasks are wired for Supabase Realtime subscriptions
- `analyzeCall()` is mock keyword logic today and can be swapped for OpenAI or Claude later

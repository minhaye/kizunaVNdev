# KizunaVN

Next.js frontend + Express backend (Supabase) for the KizunaVN workspace UI.

## Prerequisites

- Node.js 20+
- Supabase project (URL + keys)

## Frontend setup (Next.js)

1) Install dependencies:

```bash
npm install
```

2) Create `.env.local` in the repo root and add:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

3) Start the frontend dev server:

```bash
npm run dev
```

Open http://localhost:3000

## Backend setup (Express)

Backend lives in [server](server).

1) Install dependencies:

```bash
cd server
npm install
```

2) Create `server/.env` from [server/.env.example](server/.env.example) and fill values:

```
PORT=4000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

3) Start the backend dev server:

```bash
npm run dev
```

Health check:

- http://localhost:4000/health

Database ping (uses `employees` table):

- http://localhost:4000/db/ping

## Notes

- If the `employees` table does not exist, update the backend route in [server/src/routes/db.ts](server/src/routes/db.ts).
- For backend details, see [server/README.md](server/README.md).

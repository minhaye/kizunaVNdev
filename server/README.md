# kizunavn-server

## Setup

1) Copy .env.example to .env and fill in values.
2) Install deps: npm install
3) Run: npm run dev
4) In Supabase SQL Editor, run `employees.schema.sql` to create `employees` table.

## Health check

GET http://localhost:4000/health

## Database ping

GET http://localhost:4000/db/ping

# kizunavn-server

## Setup

1) Copy .env.example to .env and fill in values.
2) Install deps: npm install
3) Run: npm run dev
4) In Supabase SQL Editor, run `employees.schema.sql` to create `employees` table.
5) Also run `settings.schema.sql` and `user_notifications.schema.sql` to enable per-account settings, presence, and notification feeds.

## Health check

GET http://localhost:4000/health

## Database ping

GET http://localhost:4000/db/ping

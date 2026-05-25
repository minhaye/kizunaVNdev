# kizunavn-server

## Setup

1) Copy .env.example to .env and fill in values (Supabase + Gmail SMTP).
2) Install deps: npm install
3) Run: npm run dev
4) In Supabase SQL Editor, run `employees.schema.sql` to create `employees` table.
5) Also run `settings.schema.sql` and `user_notifications.schema.sql` to enable per-account settings, presence, and notification feeds.
6) In Supabase SQL Editor, run `password_reset_otps.schema.sql` to create OTP table.

## Health check

GET http://localhost:4000/health

## Database ping

GET http://localhost:4000/db/ping

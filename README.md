# Event QR Code Management System

Full-stack application for event participant management, QR code ticketing, email dispatch, and realtime entry scanning.

Quick start

1. Backend

 - Copy `server/.env.example` to `server/.env` and fill values (Supabase, SMTP, secrets).
 - Install and run:

```powershell
cd server
npm install
node index.js
```

The server exposes API on `http://localhost:5000` by default.

2. Frontend

 - Copy `fontend/.env.local.example` to `fontend/.env.local` if needed.
 - Install and run:

```powershell
cd fontend
npm install
npm run dev
```

Notes

- Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the backend env are set and the database schema is applied.
- Populate `event_days` table as specified in the project spec before scanning.
- Use the admin password from `ADMIN_PASSWORD` to login via `/login`.

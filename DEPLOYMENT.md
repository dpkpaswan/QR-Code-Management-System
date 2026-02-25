# Deployment Checklist — Render (backend) + Vercel (frontend)

This file lists exact steps and environment variables to deploy the backend on Render and the frontend on Vercel.

1) Backend — Render

- Repo setup: push the project to GitHub. When creating the service on Render, point to the repository and set the root directory to `server` (or use `render.yaml`).

- Render Service settings:
  - Type: Web Service
  - Environment: Node
  - Build Command: `npm install`
  - Start Command: `npm start`
  - Health Check Path: `/api/health`

- Required Environment Variables (set in Render → Environment):
  - `SUPABASE_URL` = https://xyz.supabase.co
  - `SUPABASE_SERVICE_ROLE_KEY` = <service_role_key> (PRIVATE)
  - `SMTP_HOST` = smtp.example.com
  - `SMTP_PORT` = 587
  - `SMTP_USER` = user@example.com
  - `SMTP_PASS` = <smtp password> (PRIVATE)
  - `EVENT_NAME` = My Event
  - `ADMIN_PASSWORD` = <strong admin password> (PRIVATE)
  - `JWT_SECRET` = <strong jwt secret> (PRIVATE)

- Notes:
  - Keep `SUPABASE_SERVICE_ROLE_KEY` secret and never expose it to frontend.
  - If you prefer Docker, enable Docker deployment and use `server/Dockerfile`.

2) Frontend — Vercel

- Repo setup: push `fontend` to GitHub (or use monorepo and set project root to `fontend`).

- Vercel Settings:
  - Framework: Next.js
  - Build Command: default (`npm run build`)
  - Root Directory: `fontend` (if monorepo)

- Required Environment Variables (set in Vercel → Project Settings):
  - `NEXT_PUBLIC_API_URL` = https://your-backend-service.onrender.com

- Notes:
  - Use the Render service URL for `NEXT_PUBLIC_API_URL`.
  - Keep other sensitive secrets in the backend only.

3) Post-deploy verification

- Backend health: `GET https://<render-service>/api/health` should return { status: 'ok' }
- Frontend: Visit `https://<vercel-site>/login` and login using `ADMIN_PASSWORD` (from Render env).
- Test flows: Upload participants, send emails, scan QR codes.

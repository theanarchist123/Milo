# Vercel Deployment Guide (Frontend + Backend)

This repository should be deployed as two separate Vercel projects:
- Frontend project rooted at `frontend`
- Backend project rooted at `backend`

## 1) Secrets and Local Development Setup

Use these files:
- `frontend/.env` and `backend/.env` are safe tracked defaults
- Put real local secrets only in:
  - `frontend/.env.local`
  - `backend/.env.local`

These local files are git-ignored and should never be committed.

## 2) Deploy Backend (FastAPI) on Vercel

1. In Vercel Dashboard, click New Project.
2. Import this repository.
3. Set Root Directory to `backend`.
4. Framework preset: Other.
5. Build settings:
   - Install Command: `pip install -r requirements.txt`
   - Build Command: leave empty
   - Output Directory: leave empty
6. Add Environment Variables (Production, and Preview if needed):
   - `OLLAMA_API_KEY`
   - `OLLAMA_ENDPOINT` (optional, defaults to `https://ollama.com/v1/chat/completions`)
   - `OLLAMA_MODEL` (optional, defaults to `deepseek-v3.1:671b`)
   - `FIREBASE_PROJECT_ID`
   - `FRONTEND_ORIGIN` = your frontend production URL (example: `https://your-frontend.vercel.app`)
   - Optional: `CORS_ALLOWED_ORIGINS`
   - Optional: `CORS_ALLOWED_ORIGIN_REGEX`
7. Deploy.
8. Copy backend URL (example: `https://your-backend.vercel.app`).

Notes:
- `backend/vercel.json` is already included.
- APScheduler is automatically disabled on Vercel serverless runtime.
- SQLite on Vercel is ephemeral. For real production persistence, migrate `DATABASE_URL` to a managed Postgres database.

## 3) Deploy Frontend (Vite + React) on Vercel

1. In Vercel Dashboard, click New Project.
2. Import same repository again as a second Vercel project.
3. Set Root Directory to `frontend`.
4. Framework preset: Vite.
5. Build settings (default usually works):
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Add Environment Variables:
   - `VITE_BACKEND_URL` = backend URL from step 2
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID` (optional)
   - `VITE_UNSPLASH_ACCESS_KEY` (optional)
7. Deploy.

Notes:
- `frontend/vercel.json` is included for SPA rewrites.
- Firebase web config values are no longer hardcoded in source.

## 4) Final Cross-Check

After both deploys:
1. Update backend `FRONTEND_ORIGIN` with frontend deployed URL and redeploy backend.
2. Confirm frontend `VITE_BACKEND_URL` points to backend deployed URL.
3. Test:
   - `GET /health` on backend
   - Login flow from frontend
   - Authenticated API calls from frontend to backend

## 5) Security Checklist

- Do not commit real keys in source code.
- Do not commit `.env.local` files.
- Store production secrets only in Vercel Environment Variables.
- Rotate any previously exposed keys (recommended):
  - old backend GEMINI/OLLAMA key
  - old test key

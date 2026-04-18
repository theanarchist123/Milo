# Vercel Deployment Guide — Miro AI (Frontend + Backend)

This monorepo is deployed as **two separate Vercel projects** from the same Git repository:

| Project | Root Directory | Framework Preset | Runtime |
|---------|---------------|-----------------|---------|
| **Backend** | `backend` | Other | Python (Serverless) |
| **Frontend** | `frontend` | Vite | Node.js (Static) |

---

## Prerequisites

1. A [Vercel account](https://vercel.com/signup) (Hobby or Pro)
2. An **external PostgreSQL database** (Neon, Supabase, Railway, etc.)
   - Get a connection string like: `postgresql://user:pass@host:5432/dbname`
3. Your Firebase project credentials
4. Your Ollama / LLM API key

---

## 1) Deploy Backend (FastAPI → Vercel Serverless)

### Step 1: Create Vercel Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → **Add New… → Project**
2. Import your Git repository
3. Set **Root Directory** to `backend`
4. Set **Framework Preset** to `Other`
5. Build settings:
   - **Build Command**: *(leave empty)*
   - **Output Directory**: *(leave empty)*
   - **Install Command**: `pip install -r requirements.txt`

### Step 2: Set Environment Variables
Add these in the Vercel project settings → Environment Variables:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname` | ✅ |
| `FIREBASE_PROJECT_ID` | Your Firebase project ID | ✅ |
| `OLLAMA_API_KEY` | Your Ollama API key | ✅ |
| `OLLAMA_ENDPOINT` | `https://ollama.com/v1/chat/completions` | ✅ |
| `OLLAMA_MODEL` | `deepseek-v3.1:671b` | ✅ |
| `FRONTEND_ORIGIN` | Your frontend Vercel URL (e.g. `https://miro-ai.vercel.app`) | ✅ |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | Optional |
| `CORS_ALLOWED_ORIGIN_REGEX` | Regex for allowed origins | Optional |

> **Note:** The `VERCEL=1` environment variable is automatically set by Vercel's runtime.

### Step 3: Deploy
Click **Deploy**. After success, copy the backend URL (e.g. `https://miro-ai-backend.vercel.app`).

### Verify Backend
```
curl https://miro-ai-backend.vercel.app/health
# Expected: {"status":"online","db":"postgres","runtime":"vercel"}
```

---

## 2) Deploy Frontend (Vite + React → Vercel Static)

### Step 1: Create Vercel Project
1. In Vercel Dashboard → **Add New… → Project**
2. Import the **same** Git repository again
3. Set **Root Directory** to `frontend`
4. Set **Framework Preset** to `Vite`
5. Build settings (defaults should work):
   - **Install Command**: `npm install`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 2: Set Environment Variables

| Variable | Value | Required |
|----------|-------|----------|
| `VITE_BACKEND_URL` | Backend URL from step 1 (e.g. `https://miro-ai-backend.vercel.app`) | ✅ |
| `VITE_FIREBASE_API_KEY` | Your Firebase API key | ✅ |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` | ✅ |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase project ID | ✅ |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` | ✅ |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your Firebase sender ID | ✅ |
| `VITE_FIREBASE_APP_ID` | Your Firebase app ID | ✅ |
| `VITE_FIREBASE_MEASUREMENT_ID` | Your Firebase measurement ID | Optional |
| `VITE_UNSPLASH_ACCESS_KEY` | Your Unsplash access key | Optional |

### Step 3: Deploy
Click **Deploy**.

---

## 3) Post-Deployment Cross-Check

After both projects are deployed:

1. **Update backend `FRONTEND_ORIGIN`** with the frontend's deployed URL → redeploy backend
2. **Confirm frontend `VITE_BACKEND_URL`** points to the backend URL
3. **Add your frontend domain** to Firebase Console → Authentication → Authorized domains
4. **Test the full flow:**
   - `GET /health` on backend
   - Login via Google on frontend
   - Sync emails / classroom items
   - Check notifications (polling fallback is used on Vercel)

---

## 4) Architecture Notes

### Database
- **Local development**: SQLite (`sqlite:///./miro.db`) — zero config
- **Production (Vercel)**: External PostgreSQL via `DATABASE_URL`
- The app auto-detects the DB type from the connection string

### Background Processing (APScheduler)
- **Disabled on Vercel** (serverless functions are short-lived)
- Works normally on local / VPS deployments
- On Vercel, auto-processing must be triggered via external cron (e.g. Vercel Cron Jobs or GitHub Actions)

### Real-time Notifications
- **Local dev**: Server-Sent Events (SSE) — persistent connection
- **Vercel**: Automatic fallback to HTTP polling every 10 seconds
  - SSE connections time out on serverless (max 10–60s)
  - The frontend detects SSE failure and switches to polling transparently

### File Storage
- Generated DOCX files in `media/outputs/` are **ephemeral on Vercel**
- For persistent file storage, consider integrating Vercel Blob or Firebase Storage

---

## 5) Local Development

Create local env files (git-ignored) for development:

```bash
# Backend
cp backend/.env backend/.env.local
# Edit backend/.env.local with your real API keys

# Frontend
cp frontend/.env frontend/.env.local
# Edit frontend/.env.local with your real Firebase keys
```

Run locally:
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## 6) Security Checklist

- [x] `.env` files contain only safe placeholder templates (no real keys)
- [x] `.env.local` files are git-ignored
- [ ] Production secrets are stored only in Vercel Environment Variables
- [ ] Firebase Authorized Domains includes your Vercel frontend URL
- [ ] Rotate any API keys previously exposed in git history (recommended)
- [ ] CORS `FRONTEND_ORIGIN` restricts access to your frontend domain only

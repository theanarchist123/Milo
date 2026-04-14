<div align="center">

<!-- Animated Banner -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0f0f0f,50:6366f1,100:8b5cf6&height=200&section=header&text=MILO%20AI&fontSize=80&fontColor=ffffff&fontAlignY=35&desc=Your%20Autonomous%20Academic%20Intelligence&descAlignY=60&descSize=18&animation=fadeIn" width="100%"/>

<br/>

<!-- Badges Row -->
<p>
  <img src="https://img.shields.io/badge/STATUS-LIVE-22c55e?style=for-the-badge&labelColor=0f0f0f"/>
  &nbsp;
  <img src="https://img.shields.io/badge/VERSION-1.0.0-6366f1?style=for-the-badge&labelColor=0f0f0f"/>
  &nbsp;
  <img src="https://img.shields.io/badge/LICENSE-MIT-8b5cf6?style=for-the-badge&labelColor=0f0f0f"/>
  &nbsp;
  <img src="https://img.shields.io/badge/PRs-WELCOME-ec4899?style=for-the-badge&labelColor=0f0f0f"/>
</p>

<br/>

<!-- Tagline -->
> **"Don't just study smarter — let AI study for you."**  
> *Milo watches your Gmail & Google Classroom 24/7, understands your assignments, and auto-generates complete lab reports, summaries & notes — delivered to your vault before you even open your laptop.*

<br/>

---

</div>

<br/>

## ✦ What is Milo?

**Milo** is a full-stack autonomous AI academic assistant built for university students. It silently monitors your **Gmail** and **Google Classroom** in the background, intelligently classifies every email and assignment, then uses **Gemini AI** to auto-generate complete, submission-ready academic documents — lab reports, study notes, Q&A guides, and summaries — all stored in your personal **Vault**.

No clicking. No prompting. Just open Milo and find your work already done.

<br/>

---

## ✦ Feature Constellation

<div align="center">

|  | Feature | Description |
|--|---------|-------------|
| 🧠 | **Autonomous AI Processing** | Runs a background scheduler every 10 mins, auto-detects new academic content |
| 📧 | **Gmail Intelligence** | Reads & classifies emails into ASSIGNMENT / NOTES / ANNOUNCEMENT / UNCLASSIFIED |
| 🏫 | **Google Classroom Sync** | Pulls coursework, due dates & descriptions across all enrolled courses |
| 📄 | **Lab Report Generator** | Produces complete structured lab docs — Aim, Theory, Procedure, Complexity, Conclusion |
| 🗂️ | **Smart Vault** | Stores all AI-generated outputs as downloadable `.docx` files |
| 🔔 | **Real-time Notifications** | SSE-powered live task progress pushed to your browser instantly |
| 📊 | **Activity Dashboard** | Live task tracker with per-step progress visualization |
| 🌐 | **URL Content Expansion** | Opens Google Sheets/Docs via headless browser to read linked assignment data |
| 🎯 | **Roll-Number Aware** | Finds your specific assigned problem from class spreadsheets automatically |
| ⚙️ | **Auto-Process Toggle** | Enable/disable autonomous mode per-user with configurable intervals |

</div>

<br/>

---

## ✦ Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│                         MILO AI SYSTEM                          │
├──────────────────────────┬──────────────────────────────────────┤
│      FRONTEND (React)    │         BACKEND (FastAPI)            │
│                          │                                      │
│  ╔══════════════════╗   │   ╔════════════════════════════╗     │
│  ║  Landing Page    ║   │   ║   APScheduler (10 min)     ║     │
│  ║  Dashboard       ║   │   ║   Auto-Processing Cycle    ║     │
│  ║  Gmail Inbox     ║◄──┼───║   → Gmail API Fetch        ║     │
│  ║  Classroom       ║   │   ║   → Classroom API Fetch    ║     │
│  ║  Vault           ║   │   ║   → Gemini AI Classify     ║     │
│  ║  Settings        ║   │   ║   → Gemini AI Generate     ║     │
│  ║  Processor       ║   │   ║   → DOCX Export            ║     │
│  ╚══════════════════╝   │   ╚════════════════════════════╝     │
│                          │                                      │
│  SSE Event Stream ◄──────┼──── /api/events/stream              │
│  Firebase Auth ──────────┼──── /api/auth/google                 │
│  Axios REST ─────────────┼──── /api/* endpoints                 │
└──────────────────────────┴──────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              SQLite DB        Gemini API      Google APIs
             (miro.db)     (gemini-3-flash)  (Gmail/Classroom)
```

<br/>

---

## ✦ Tech Stack

<div align="center">

### 🖥️ Frontend

<p>
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB&logoWidth=20"/>
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=FFD62E"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white"/>
</p>
<p>
  <img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white"/>
  <img src="https://img.shields.io/badge/Radix_UI-161618?style=for-the-badge&logo=radix-ui&logoColor=white"/>
  <img src="https://img.shields.io/badge/Zustand-FF6B35?style=for-the-badge&logo=react&logoColor=white"/>
  <img src="https://img.shields.io/badge/Recharts-22b5bf?style=for-the-badge&logo=chartdotjs&logoColor=white"/>
</p>
<p>
  <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black"/>
  <img src="https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white"/>
  <img src="https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white"/>
</p>

### ⚙️ Backend

<p>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white"/>
  <img src="https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge&logo=sqlite&logoColor=white"/>
  <img src="https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white"/>
</p>
<p>
  <img src="https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white"/>
  <img src="https://img.shields.io/badge/APScheduler-FF6B6B?style=for-the-badge&logo=clockify&logoColor=white"/>
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white"/>
  <img src="https://img.shields.io/badge/Uvicorn-499848?style=for-the-badge&logo=gunicorn&logoColor=white"/>
</p>
<p>
  <img src="https://img.shields.io/badge/Google_APIs-4285F4?style=for-the-badge&logo=google&logoColor=white"/>
  <img src="https://img.shields.io/badge/OAuth_2.0-EB5424?style=for-the-badge&logo=auth0&logoColor=white"/>
  <img src="https://img.shields.io/badge/BeautifulSoup4-3E8FC6?style=for-the-badge&logo=python&logoColor=white"/>
</p>

</div>

<br/>

---

## ✦ How the AI Pipeline Works

```
                    ╔═══════════════════════════════╗
                    ║   📬 New Email / 📚 Assignment ║
                    ╚══════════════╦════════════════╝
                                   ▼
                    ╔═══════════════════════════════╗
                    ║  🔍 STEP 1: CLASSIFY           ║
                    ║  Gemini analyzes subject/body  ║
                    ║  → ASSIGNMENT / NOTES /        ║
                    ║    ANNOUNCEMENT / UNCLASSIFIED ║
                    ╚══════════════╦════════════════╝
                                   ▼
                    ╔═══════════════════════════════╗
                    ║  🌐 STEP 2: EXPAND CONTEXT     ║
                    ║  URLs scraped via Playwright   ║
                    ║  Google Sheets/Docs extracted  ║
                    ║  Finds your Roll # assignment  ║
                    ╚══════════════╦════════════════╝
                                   ▼
                    ╔═══════════════════════════════╗
                    ║  ✍️  STEP 3: GENERATE          ║
                    ║  Full lab report / summary /   ║
                    ║  Q&A / notes via Gemini        ║
                    ║  (up to 8192 output tokens)    ║
                    ╚══════════════╦════════════════╝
                                   ▼
                    ╔═══════════════════════════════╗
                    ║  📁 STEP 4: EXPORT & NOTIFY    ║
                    ║  Saved as .docx to Vault       ║
                    ║  SSE notification pushed live  ║
                    ╚═══════════════════════════════╝
```

<br/>

---

## ✦ Pages & Navigation

| Page | Route | Description |
|------|-------|-------------|
| 🏠 Landing | `/` | Marketing page with feature highlights |
| 🔑 Login | `/login` | Google OAuth via Firebase |
| 📊 Dashboard | `/dashboard` | Live task activity tracker |
| 📧 Emails | `/emails` | Gmail inbox with AI classifications |
| 🏫 Classroom | `/classroom` | Coursework from Google Classroom |
| ⚡ Processor | `/processor` | Manual trigger + auto-process toggle |
| 🗂️ Vault | `/vault` | Download AI-generated documents |
| ⚙️ Settings | `/settings` | Profile, roll number, API preferences |

<br/>

---

## ✦ Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- A Google Cloud project with Gmail & Classroom APIs enabled
- Firebase project (for Auth)
- Gemini API key

---

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/milo-ai.git
cd milo-ai
```

---

### 2. Backend Setup

```bash
cd backend

# Create & activate virtual environment
python -m venv venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Install Playwright browser (for Google Sheets scraping)
playwright install chromium
```

Create `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FIREBASE_PROJECT_ID=your_firebase_project_id
```

Start the backend:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

Start the dev server:

```bash
npm run dev
```

🚀 App is running at **http://localhost:5173**

<br/>

---

## ✦ Project Structure

```
milo-ai/
├── 📁 backend/
│   ├── 📄 main.py              # FastAPI app + APScheduler lifecycle
│   ├── 📄 models.py            # SQLAlchemy DB models
│   ├── 📄 database.py          # SQLite engine config
│   ├── 📄 requirements.txt     # Python dependencies
│   ├── 📁 api/
│   │   ├── 📄 router.py        # All REST endpoints
│   │   ├── 📄 auth.py          # Google OAuth + Firebase verify
│   │   └── 📄 sse.py           # Server-Sent Events stream
│   └── 📁 services/
│       ├── 📄 gemini_service.py      # AI classify + generate
│       ├── 📄 auto_processor.py      # Background job cycle
│       ├── 📄 docx_generator.py      # Word document export
│       └── 📄 browser_scraper.py     # Playwright Google Sheets scraper
│
└── 📁 frontend/
    ├── 📄 index.html
    ├── 📄 vite.config.ts
    └── 📁 src/
        ├── 📁 pages/
        │   ├── 📄 LandingPage.tsx
        │   ├── 📄 DashboardPage.tsx
        │   ├── 📄 EmailsPage.tsx
        │   ├── 📄 ClassroomPage.tsx
        │   ├── 📄 ProcessorPage.tsx
        │   ├── 📄 VaultPage.tsx
        │   └── 📄 SettingsPage.tsx
        ├── 📁 components/
        │   ├── 📁 layout/       # Sidebar, Navbar
        │   └── 📁 features/     # ActivityRow, cards, modals
        └── 📁 stores/           # Zustand global state
```

<br/>

---

## ✦ API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Service health check |
| `POST` | `/api/auth/google` | Exchange Google token → session |
| `GET` | `/api/emails` | Fetch classified emails |
| `POST` | `/api/emails/sync` | Pull latest Gmail messages |
| `GET` | `/api/classroom/courses` | List enrolled courses |
| `GET` | `/api/classroom/items` | Get all coursework items |
| `POST` | `/api/process` | Manually trigger AI processing |
| `GET` | `/api/tasks` | List all background tasks |
| `GET` | `/api/outputs` | List all vault documents |
| `GET` | `/api/events/stream` | SSE live event stream |
| `GET` | `/api/notifications` | Get user notifications |
| `GET` | `/media/{path}` | Download generated `.docx` files |

<br/>

---

## ✦ Data Models

```python
User          →  id, email, display_name, roll_number,
                 google_access_token, auto_process_enabled
                 
EmailRecord   →  id (Gmail Message ID), subject, sender,
                 body_text, classification (JSON), status

Course        →  id (Classroom ID), name, teacher, section
CourseItem    →  id, title, type, description, due_date, status

Task          →  id, source_type, source_subject,
                 status, current_step, error_message

GeneratedOutput → id, type (ASSIGNMENT/SUMMARY/QA/NOTES),
                  title, preview_text, file_path

Notification  →  id, title, body, type (INFO/SUCCESS/WARNING/ERROR)
```

<br/>

---

## ✦ AI Output Types

| Type | Use Case | Structure |
|------|----------|-----------|
| `ASSIGNMENT` | Lab reports, coding problems | Aim → Theory → Procedure → Complexity → Conclusion |
| `SUMMARY` | Lectures, announcements | Key concepts, formulas, bullet points, quick-revision |
| `NOTES` | PDFs, study materials | Topic headings, definitions, key takeaways |
| `QA` | Exam prep | 10+ Q&A pairs — conceptual, application, analytical |

<br/>

---

## ✦ Roadmap

- [x] Google OAuth + Firebase authentication
- [x] Gmail sync & AI classification
- [x] Google Classroom coursework sync
- [x] Gemini-powered content generation
- [x] Autonomous background processing (APScheduler)
- [x] Real-time SSE notifications
- [x] DOCX export & Vault storage
- [x] Roll-number-aware assignment targeting
- [x] Playwright-powered Google Sheets scraping
- [ ] PDF export support
- [ ] Multi-user collaboration vaults
- [ ] WhatsApp / Telegram notifications
- [ ] Mobile app (React Native)
- [ ] GPT-4o model toggle

<br/>

---

## ✦ Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create your feature branch: `git checkout -b feat/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feat/amazing-feature`
5. Open a Pull Request

<br/>

---

## ✦ License

This project is licensed under the **MIT License**.  
See the [LICENSE](LICENSE) file for details.

<br/>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:8b5cf6,50:6366f1,100:0f0f0f&height=120&section=footer&animation=fadeIn" width="100%"/>

<br/>

**Built with 🧠 + ☕ by a student, for students.**

*If Milo saved you from a 2am panic submission, give it a ⭐*

<br/>

[![GitHub stars](https://img.shields.io/github/stars/yourusername/milo-ai?style=social)](https://github.com/yourusername/milo-ai)

</div>

# CareerForge — AI Resume Builder

An AI-powered resume builder and job-application companion. Build ATS-friendly resumes, tailor them to any job description, and track every application in one pipeline — from job discovery to offer.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-61dafb) ![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8) ![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47a248) ![Groq](https://img.shields.io/badge/AI-Groq-orange) ![License](https://img.shields.io/badge/license-ISC-green)

---

## Features

### Resume builder

- Create resumes from scratch or import an existing PDF (AI parses it into structured data)
- Live preview with multiple templates and full typography / color / spacing control
- Auto-save with debounce, resume completeness score, drag-to-reorder sections
- Resume versioning — snapshots before AI edits so nothing is ever lost
- One-page PDF export that reflows content to fit instead of shrinking it
- Profile photo upload with background removal and face crop (ImageKit)

### AI toolkit (Groq)

- **ATS score checker** — paste a job description, get a 0–100 compatibility score with matched / missing keywords and suggestions ranked by impact
- **Tailor to JD** — rewrites summary, experience bullets, and skills to match a specific job posting
- **Resume matcher** — paste a JD or job link, ranks all your resumes by fit (score, matched/missing skills, one-line reason)
- **Cover letter generator** — tailored letters in formal, conversational, or enthusiastic tone
- **Interview prep** — role-specific questions with suggested answers across behavioural, technical, situational, and role-specific categories
- **Writing assistance** — enhance professional summary, rewrite bullets, suggest skills, enhance job descriptions

### Job application tracker

- Pipeline: Applied → Screening → Interview → Offer (+ Rejected / Withdrawn), with full status history
- **Paste-to-import** — paste a confirmation email/SMS or a job link; AI extracts company, role, source, date, and URL automatically
- Link resumes (and their ATS score at apply time) to each application
- Stats dashboard: total applications, response rate, interviews, offers
- Notes and timeline per application

### Platform

- Firebase Authentication (Google + email), server-verified ID tokens
- Daily usage quotas per AI feature for free tier; premium tier via Razorpay

## Architecture

CareerForge follows a practical **layered architecture** (Next.js monolith):

1. **Presentation** — `src/app` (App Router pages), `src/old-pages` (large screens), `src/components`
2. **Controller / transport** — `src/app/api/**/route.ts`. Thin handlers: connect DB → `protect()` auth → `checkQuota()` → parse request → call a service → map `ServiceError` to HTTP responses. No business logic lives here.
3. **Service / business logic** — `src/lib/services/`. Each domain owns its module (`resumeService`, `applicationService`, `userService`, `paymentService`, `atsService`, `matcherService`, `tailorService`, `enhanceService`, `scoreService`, `interviewService`, `coverLetterService`) plus shared plumbing: `aiService` (Groq model selection, JSON extraction, provider-error mapping) and `errors` (`ServiceError` with HTTP status).
4. **Data access** — Mongoose models in `src/lib/models`.
5. **Cross-cutting** — `src/lib/middlewares` (auth, quota), `src/lib/config` (db, ai, imageKit, firebase, mailer), `src/lib/observability` (logger), `src/lib/validators`, `src/lib/utils`.

Rules of thumb: routes never touch the database or the AI directly; services throw `ServiceError` and never build HTTP responses; input that must not burn quota is validated in the route **before** `checkQuota()`.
- Dark mode, responsive UI

---

## Tech stack

| Layer      | Technology |
| ---------- | ---------- |
| Framework  | Next.js 16 (App Router), React 19 |
| Styling    | Tailwind CSS v4, CSS custom properties |
| State      | Redux Toolkit + redux-persist |
| Auth       | Firebase Auth (client) + firebase-admin (server token verify) |
| Database   | MongoDB Atlas + Mongoose |
| AI         | Groq (OpenAI-compatible SDK), default `llama-3.3-70b-versatile` |
| Payments   | Razorpay |
| Images     | ImageKit (CDN, transforms, background removal) |
| Email      | Brevo SMTP via nodemailer |
| PDF        | html2canvas + jsPDF (export), react-pdftotext (import) |
| Drag & drop | @dnd-kit |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  React 19 pages  ·  Redux Toolkit  ·  Tailwind v4           │
│  apiClient (attaches fresh Firebase ID token per request)   │
└──────────────────────────┬──────────────────────────────────┘
                           │  HTTPS + Authorization: Bearer <ID token>
┌──────────────────────────▼──────────────────────────────────┐
│                  Next.js 16 App Router                      │
│                                                             │
│  Pages (/app/*):                                            │
│    /app              dashboard (resume library)              │
│    /app/builder/[id] resume editor + AI panels              │
│    /app/applications job-application pipeline               │
│    /app/matcher      JD → resume ranking                    │
│    /app/upgrade      premium checkout                       │
│                                                             │
│  API routes (/api/*):                                       │
│    protect()      → verifies Firebase ID token (firebase-   │
│                     admin), resolves Mongo user             │
│    checkQuota()   → per-feature daily limits (free tier);   │
│                     premium bypasses; quota refunded on      │
│                     failures so users never pay for errors   │
│    services/      → atsService, quota utils, validators     │
│    models/        → Mongoose schemas                        │
└──────┬──────────────┬───────────────┬──────────────────────┘
       │              │               │
┌──────▼──────┐ ┌─────▼───────┐ ┌─────▼────────┐ ┌──────────────┐
│ Firebase    │ │ MongoDB     │ │ Groq AI      │ │ Razorpay /   │
│ Auth/Admin  │ │ Atlas       │ │ (llama-3.3   │ │ ImageKit /   │
│ (identity)  │ │ (app data)  │ │  -70b)       │ │ Brevo (infra)│
└─────────────┘ └─────────────┘ └──────────────┘ └──────────────┘
```

### Data model (MongoDB)

- **User** — firebaseUid, subscriptionTier (`free` | `premium`), profile
- **Resume** — userId, structured content (sections, experience, skills), template, styling, `lastAts` snapshot
- **ResumeVersion** — point-in-time snapshots of a resume (created before AI rewrites)
- **Application** — userId, company, role, source, jobUrl, resumeId, versionId, atsScoreAtApply, status, statusHistory[], appliedAt, notes
- **AtsScore / CoverLetter / InterviewQuestion** — persisted AI outputs per resume
- **UsageCounter** — per-user, per-feature daily AI usage backing the quota system

### Request lifecycle (AI routes)

```
Client → protect() → validate input → checkQuota() → Groq call
   → validate AI output → refundQuotaOnError() on failure → persist → respond
```

Quota is always claimed **after** input validation and **refunded** on AI failure, rate limits, or invalid output — free-tier users never lose quota to errors.

---

## Key flows

### 1. Sign in

Firebase client SDK signs the user in → `apiClient` interceptor attaches a fresh Firebase ID token to every API request → `protect()` middleware verifies it with firebase-admin and maps it to the Mongo `User`.

### 2. Build a resume

Dashboard → create (blank or import PDF via `/api/ai/upload-resume`) → builder auto-saves edits (debounced) → version snapshot is stored before any AI rewrite → export to PDF.

### 3. Check ATS score

Builder → paste JD → `POST /api/ai/ats-score` → score 0–100 with matched/missing keywords and prioritized suggestions → result persisted to `AtsScore` and cached on the resume as `lastAts`.

### 4. Tailor to a job

Builder → Tailor panel → `POST /api/ai/tailor-resume` → summary, bullets, and skills rewritten against the JD → user reviews diff → saves as a new version.

### 5. Match → tailor → track (the job-hunt loop)

```
/app/matcher → paste JD or job link → POST /api/resumes/match
   → resumes ranked in ONE AI call (score, skills, reason, company/role)
   → "Tailor in builder"  → opens builder with the JD prefilled
   → "Track application" → opens /app/applications with company/role/
                              URL/source prefilled → one click to save
```

Link-only input is fetched server-side and normalized to text first, so tailoring always works from real JD content. Scoring uses low temperature for run-to-run stability.

### 6. Track an application

`/app/applications` → new application (manual, or paste confirmation text / job link → `POST /api/applications/extract` pulls company, role, source, date, URL) → pick a resume (ATS score snapshotted at zero quota cost) → move it through the pipeline; every status change is recorded in `statusHistory`.

### 7. Go premium

`/app/upgrade` → Razorpay checkout → webhook verifies payment → `subscriptionTier: "premium"` → all quota checks bypassed.

---

## API reference

### Resumes

| Method | Route | Description |
| ------ | ----- | ----------- |
| POST | `/api/resumes/create` | Create resume |
| POST | `/api/resumes/get` | Fetch resume(s) |
| POST | `/api/resumes/update` | Update resume |
| POST | `/api/resumes/delete` | Soft-delete resume |
| POST | `/api/resumes/duplicate` | Duplicate resume |
| POST | `/api/resumes/restore` | Restore deleted resume |
| POST | `/api/resumes/versions` | List / create version snapshots |
| POST | `/api/resumes/public` | Public share link handling |
| POST | `/api/resumes/match` | Rank resumes against a JD or job link |

### AI

| Method | Route | Description |
| ------ | ----- | ----------- |
| POST | `/api/ai/ats-score` | ATS compatibility score vs JD |
| POST | `/api/ai/tailor-resume` | Rewrite resume for a JD |
| POST | `/api/ai/cover-letter` | Generate cover letter |
| POST | `/api/ai/generate-cover-letter` | Cover letter (alt flow) |
| POST | `/api/ai/interview-questions` | Role-specific Q&A |
| POST | `/api/ai/enhance-pro-sum` | Enhance professional summary |
| POST | `/api/ai/rewrite-bullets` | Rewrite experience bullets |
| POST | `/api/ai/suggest-skills` | Skill suggestions |
| POST | `/api/ai/enhance-job-desc` | Enhance a job description |
| POST | `/api/ai/upload-resume` | Parse uploaded PDF into structured data |
| POST | `/api/ai/score-resume` | General resume quality score |

### Applications

| Method | Route | Description |
| ------ | ----- | ----------- |
| POST | `/api/applications/create` | Track a new application |
| GET  | `/api/applications/list` | List with status filter + resume populate |
| PATCH / DELETE | `/api/applications/[id]` | Update status/fields, delete |
| POST | `/api/applications/extract` | Extract company/role/source/date/URL from pasted text or link |

### Other

| Method | Route | Description |
| ------ | ----- | ----------- |
| — | `/api/users/*` | Profile & subscription |
| — | `/api/payments/*` | Razorpay order + webhook verify |
| — | `/api/imagekit/*` | Upload auth & transforms |

All `/api/*` routes (except webhooks) require a Firebase ID token via `protect()`.

---

## Daily AI quotas (free tier)

| Feature | Limit |
| ------- | ----- |
| ATS score | 1 / day |
| Tailor resume | 3 / day |
| Resume match | 10 / day |
| Application extract | 30 / day |

Premium users skip quota checks entirely. Quota is refunded automatically when the AI call fails.

---

## Getting started

### Prerequisites

- Node.js 22
- MongoDB Atlas cluster (or local MongoDB)
- Firebase project (Auth enabled)
- Groq API key
- Optional: Razorpay, ImageKit, Brevo SMTP keys

### Setup

```bash
git clone <repo-url>
cd resume-builder
npm install
cp .env.example .env
# fill in the values below, then:
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Key | Description |
| --- | ----------- |
| `MONGODB_URI` | MongoDB connection string |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client config |
| `FIREBASE_SERVICE_ACCOUNT` | Service-account JSON (string or file path) for token verification |
| `GROQ_API_KEY` | Groq API key |
| `GROQ_BASE_URL` | Defaults to `https://api.groq.com/openai/v1` |
| `GROQ_MODEL` | Defaults to `llama-3.3-70b-versatile` |
| `IMAGEKIT_*` / `NEXT_PUBLIC_IMAGEKIT_*` | ImageKit keys & endpoint |
| `SMTP_*` | Brevo SMTP credentials |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay keys |
| `CLIENT_URL` | App base URL |

> If the same key exists in both `.env` and `.env.local`, `.env.local` wins (Next.js convention).

### Scripts

```bash
npm run dev    # start dev server (Turbopack)
npm run build  # production build
npm start      # serve production build
npm run lint   # eslint
```

---

## Project structure

```
resume-builder/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # landing page
│   │   ├── login/              # sign in
│   │   ├── app/                # authenticated area
│   │   │   ├── page.tsx        # dashboard (resume library)
│   │   │   ├── builder/[id]/   # resume editor
│   │   │   ├── applications/   # job-application tracker
│   │   │   ├── matcher/        # JD → resume ranking
│   │   │   └── upgrade/        # premium checkout
│   │   └── api/                # route handlers (see API reference)
│   ├── old-pages/              # page-level React components (builder, tracker, matcher…)
│   ├── components/             # shared UI (Navbar, templates, tailor panels…)
│   ├── assets/templates/       # resume template components
│   ├── hooks/                  # shared React hooks
│   ├── utils/                  # client utilities
│   ├── types/                  # TypeScript types
│   └── lib/
│       ├── config/             # db, ai, firebase, apiClient, mailer, imageKit
│       ├── middlewares/        # protect (auth), quota
│       ├── models/             # Mongoose schemas
│       ├── services/           # atsService, quota utils…
│       ├── validators/         # zod schemas
│       ├── store/              # Redux slices
│       └── observability/      # logging (pino)
├── public/                     # static assets
└── README.md
```

---

## License

ISC

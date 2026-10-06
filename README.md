# MEDIBRIDGE AI

**Bridging Patient Voice, Medical Documents and Intelligent Health Records.**

MediBridge AI is a full-stack healthcare documentation support prototype for hackathons and research demos. It turns unstructured patient voice/text and medical documents into editable structured information, connects approved information to a longitudinal EHR, visualizes the record as a timeline and medical graph, and generates a concise documentation summary.

> Safety boundary: this prototype does **not** diagnose disease, prescribe treatment, or replace a doctor. AI/OCR output is documentation support and must be verified before clinical use. All seed data is synthetic.

## Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS + React Router + React Flow + Recharts
- Backend: Node.js + Express + TypeScript
- Local database: SQLite + Prisma
- Optional production database: Supabase PostgreSQL + Prisma
- Auth: JWT + bcrypt + role-based access
- AI: deterministic mock medical NLP by default; structured integration point for a future external provider
- Speech: Browser Web Speech API + manual text fallback; browser support varies and recognition may use the browser vendor's recognition service
- Documents: PDF/image upload + deterministic mock extraction

## Main routes

- `/` polished landing page
- `/login`, `/register`
- `/patient/dashboard`
- `/doctor/dashboard`
- `/admin/dashboard`
- `/voice-consultation`
- `/document-upload`
- `/patients/:id`
- `/patients/:id/timeline`
- `/patients/:id/graph`
- `/patients/:id/summary`

## Demo accounts

After seeding:

- Patient: `patient@medibridge.ai` / `demo123`
- Doctor: `doctor@medibridge.ai` / `demo123`
- Admin: `admin@medibridge.ai` / `demo123`

The detailed demo patient is **Ravi Kumar (MB-P-1001)** with Type 2 Diabetes, Metformin, HbA1c results, old prescription data, multiple symptoms, consultations, timeline events, and graph nodes.

## Local setup

### Windows PowerShell

```powershell
cd MediBridge-AI
.\setup-local.ps1
npm run dev
```

### macOS / Linux

```bash
cd MediBridge-AI
./setup-local.sh
npm run dev
```

### Manual setup

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Frontend: `http://localhost:5173`
Backend health check: `http://localhost:5000/api/health`

## Tamil demo workflow

1. Login as the patient or doctor.
2. Open **Voice Consultation**.
3. Select Tamil and use the preloaded demo sentence:

   `Enakku moonu naala fever irukku. Inniki moochu vida konjam kashtama irukku. Enakku sugar irukku. Metformin tablet sapidren.`

4. Click **Extract Medical Information**.
5. Review/edit Fever, Breathing difficulty, 3 days, Diabetes and Metformin.
6. Answer optional follow-up questions. A patient saves the session as **Pending clinician review**; a doctor/admin can explicitly approve it before it is written to the EHR.
7. Open **Document Upload** and upload any synthetic PDF/JPG/PNG/WEBP prescription or lab-report demo file.
8. Mock extraction creates editable structured document data.
9. Login as Doctor and click **Approve & Save**.
10. Open Ravi Kumar and view Overview, Voice Sessions, Timeline, Medical Graph, Documents, Medications, Labs and AI Summary.

## Database modes

### Local SQLite

Use `prisma/schema.prisma` and:

```env
DATABASE_URL="file:../prisma/dev.db"
```

### Supabase PostgreSQL

Use `prisma/schema.supabase.prisma`. See `SUPABASE_SETUP.md` and `supabase_setup.sql`.

Production commands:

```bash
npm run prisma:generate:prod -w backend
npm run db:push:prod -w backend
npm run seed:prod -w backend
```

## API highlights

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/clinicians` (ADMIN only)
- `GET /api/patients`
- `GET /api/patients/:id`
- `GET /api/patients/:id/timeline`
- `GET /api/patients/:id/graph`
- `POST /api/patients/:id/summary`
- `POST /api/voice/extract`
- `POST /api/voice/save`
- `POST /api/voice/:id/approve` (DOCTOR / ADMIN)
- `POST /api/documents/extract`
- `GET /api/documents/:id/file` (authenticated / authorized)
- `PUT /api/documents/:id/extracted`
- `POST /api/documents/:id/approve`

## Security included

- bcrypt password hashing
- JWT-protected API routes
- role-based access for PATIENT / DOCTOR / ADMIN
- patient ownership checks and clinician/admin review gates
- public registration is patient-only; clinician creation is admin-only
- login attempt throttling for the prototype
- upload MIME + file-signature validation and upload size limit
- medical files are no longer served from a public static `/uploads` route
- request body validation on write endpoints, including AI/OCR extraction payloads
- audit records for important write/review actions
- approved document extraction is locked against later silent edits
- patient voice extraction must be clinician-approved before EHR persistence
- no committed API keys
- synthetic demo data only

## AI integration point

`backend/src/services/ai.service.ts` is the mock medical NLP layer. Replace or extend it with your chosen external model provider while keeping the same structured JSON contract. Put API keys only in environment variables.

`backend/src/services/document.service.ts` is the mock OCR/document extraction layer. It can later be replaced with Azure Document Intelligence, Google Document AI, AWS Textract, Tesseract/OCR, or a multimodal model.

## Deployment

- Render instructions: `DEPLOYMENT_RENDER.md`
- Supabase instructions and queries: `SUPABASE_SETUP.md`
- Render Blueprint: `render.yaml`
- QA status: `QA_REPORT.md`

## Important production note

Render web-service local disk is not intended as permanent uploaded-file storage across instance replacement/redeploys. For a real deployment, store medical documents in an object store (for example Supabase Storage) and keep only metadata / object keys in Prisma. This prototype intentionally keeps local `/uploads` storage to stay simple for the hackathon demo. Files are exposed only through an authenticated API route; however, for production use you should still replace local storage with private object storage and signed/authorized retrieval.

# MediBridge AI — Complete Project Review & Enhancement Log

**Review date:** 6 October 2026  
**Scope:** frontend, backend, Prisma schemas, mock AI/NLP, document extraction workflow, authentication/authorization, upload handling, voice input, patient EHR, dashboards, deployment files and demo data.

## Executive assessment

The original project already had a strong hackathon architecture: React/TypeScript frontend, Express/TypeScript backend, Prisma/SQLite with a Supabase PostgreSQL schema, role-based UI, patient timeline/graph/summary, voice-to-structured-data and document-to-structured-data flows. The main weaknesses were not the number of features, but the trust boundaries around AI-generated data and a few security/data-quality issues.

This enhanced version changes the core rule to: **AI can extract and propose; only an authorized clinician/admin can approve AI-generated voice/document information into the longitudinal EHR.**

## Existing features confirmed

- PATIENT / DOCTOR / ADMIN authentication and protected routes.
- Patient dashboard, doctor dashboard and admin dashboard.
- Multilingual voice/text capture for English, Tamil, Hindi and Telugu.
- Structured extraction of chief complaint, symptoms, duration, severity, conditions, medications, allergies and follow-up questions.
- Medical-document upload and mock extraction for prescription/lab/discharge/consultation/certificate/other records.
- Patient overview, consultations, diagnoses, medication history, lab results and documents.
- Longitudinal timeline and React Flow medical graph.
- Clinician-facing AI clinical summary workflow.
- SQLite local schema plus Supabase/PostgreSQL deployment schema.
- Synthetic seed accounts and sample patient data.
- Audit logging for key writes/reviews.

## High-impact problems found and fixed

| Area | Original issue | Enhancement applied |
| --- | --- | --- |
| Account security | Public registration could request `DOCTOR`, allowing privilege escalation | Public registration is PATIENT-only. Added ADMIN-only clinician creation API + admin UI |
| Voice → EHR safety | A patient could submit `approved: true` and directly write AI extraction into the EHR | Patient submissions are always pending; DOCTOR/ADMIN must explicitly approve |
| Voice recognition | Interim speech hypotheses could be appended repeatedly, duplicating transcript text | Only finalized recognition results are committed; interim text is displayed separately |
| Voice reliability | Recognition errors/unsupported browsers were not handled well | Added browser/support/secure-context checks, microphone error messages, cleanup and confidence display |
| Stale AI extraction | Transcript/language could change after extraction and the old extraction could still be saved | Save is blocked until extraction is re-run after transcript/language changes |
| Voice provenance | Approved voice output was inserted as disconnected records | Approval now creates a `VOICE_REVIEWED` consultation and links symptoms; conditions/meds/allergies retain reviewed source |
| Allergy loss | Voice/document allergy extraction was not consistently written to the EHR | Reviewed voice and document approvals persist allergies with deduplication |
| Medical-file privacy | `/uploads` was publicly exposed by Express static hosting | Removed public static exposure; added authenticated/authorized `GET /api/documents/:id/file` |
| Upload spoofing | Upload validation trusted browser-declared MIME type only | Added PDF/JPEG/PNG/WEBP file-signature verification plus size limits |
| Upload orphan files | Failed validation/extraction could leave files on disk | Failed upload flows now clean temporary files |
| Document tampering | Approved extracted document data could be edited afterwards | Approved extraction is locked; re-approval returns conflict |
| Duplicate EHR rows | Re-approval/repeated extracted items could create duplicate diagnoses/medications | Added one-time approval and deduplication checks for structured writes |
| Input validation | Several AI/document payloads accepted broad/unbounded data | Added Zod schemas, enums, field lengths and array limits |
| Internal leakage | API errors and document records could expose implementation details/paths | Generic production-safe 500 errors and document path sanitization |
| Password handling | Registration password requirements/hashing were weak for a prototype | Minimum 8 chars with letter+number, bcrypt cost 12 |
| Patient code | Timestamp-derived code could collide | Registration now uses random UUID-derived patient codes |
| Brute-force login | No login attempt control | Added a lightweight in-memory 10-attempt/15-minute prototype limiter |
| Inactive accounts | Login did not reject inactive users | `isActive` is checked during login |
| Session UX | Expired JWT could leave stale local auth state | API client clears local auth on 401 and has a request timeout |
| Demo seed documents | Seed metadata references PDFs not shipped in the ZIP | API exposes `fileAvailable`; UI disables missing-original actions gracefully |

## Voice assistant / voice input review

### What it does now

1. User selects English/Tamil/Hindi/Telugu.
2. Browser speech recognition captures audio, or the user types manually.
3. Interim hypotheses are shown as live text but are **not** permanently appended.
4. Only final recognition results are committed to the transcript.
5. The transcript is sent to `/api/voice/extract`.
6. Structured fields remain editable and individual extracted items can be removed.
7. If transcript/language changes, the extraction becomes stale and cannot be saved until re-analysis.
8. PATIENT saves a pending review session. DOCTOR/ADMIN can approve it.
9. Approved data is written with voice-review provenance and appears in the patient record/timeline.

### NLP improvements

The deterministic mock NLP was expanded for demo reliability: English, transliterated Tamil, Tamil script and additional Indian-language terms; duration parsing for hours/days/weeks/months; number-word recognition; severity terms; breathing/cough/fever/headache/stomach-related symptoms; common conditions; medication dosage/frequency recognition; and allergy phrases.

### Important limitation

This is still **browser speech recognition + mock medical NLP**, not a production medical speech-to-text engine. Web Speech recognition support varies by browser, and some implementations can use a server-based recognition service. For a privacy-sensitive real healthcare deployment, move to a healthcare-approved/on-device or contractually controlled STT provider, obtain consent, define retention rules and avoid assuming microphone audio remains local.

## Document workflow review

Document extraction remains intentionally mocked, which is correct for a research/hackathon prototype as long as the UI does not present it as real OCR. The enhanced workflow validates the document type, checks content signatures, protects file retrieval, validates the extracted JSON contract, allows review/editing before approval, locks approved extraction, saves reviewed diagnoses/medications/labs/allergies with provenance and prevents repeated approval.

A production version should replace `document.service.ts` with real OCR/document intelligence, store files in private object storage, encrypt sensitive objects, scan uploads for malware and introduce retention/deletion policies.

## Remaining production limitations (not disguised as completed features)

- AI/NLP and OCR are deterministic mocks; `AI_PROVIDER` does not yet implement a real external model adapter.
- Browser `SpeechRecognition` is not universally supported and is not sufficient as the only production voice path.
- JWT is kept in localStorage for demo simplicity; a production web app should consider short-lived access tokens plus secure HttpOnly cookie/refresh-token architecture and CSRF controls.
- The login limiter is process-local; use Redis/API-gateway rate limiting in a scaled deployment.
- Uploaded files are local-disk based; use private object storage in production.
- Seed demo credentials are intentionally easy and must never be reused in a real environment.
- The app is a documentation-support prototype, not a diagnostic/prescribing system, and has not undergone clinical validation, medical-device assessment or healthcare compliance certification.

## Recommended next-stage enhancements

For a stronger competition/final-year demonstration, the next highest-value additions are: real multilingual STT with explicit consent + audio-retention controls; real OCR/document extraction with confidence per field; clinician diff view (“AI proposed” vs “clinician corrected”); source-level provenance links from every EHR fact back to voice/document evidence; version history instead of destructive edits; structured coding support such as SNOMED/ICD/FHIR mapping for research demonstration; RBAC scoped to assigned patients/organizations; PostgreSQL migrations plus automated test suite; object storage; and accessibility/mobile QA.

## Safety statement

MediBridge AI remains a research/demo documentation-support system. It must not diagnose disease, prescribe treatment or replace a qualified clinician. AI-generated content should remain visibly unverified until reviewed and approved by an authorized healthcare professional.

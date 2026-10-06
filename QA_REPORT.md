# MediBridge AI — QA Report

**Review date:** 6 October 2026  
**Build reviewed:** enhanced full-prototype ZIP

## Status

**Static code review and targeted logic validation: PASS with environment limitation.**

The complete dependency-backed `npm install` / Vite build / Prisma migration could not be completed in this sandbox because package installation did not finish within the available environment. The source was therefore checked with syntax-oriented Node/TypeScript parsing, schema comparison, targeted service execution and manual route/authorization review. Run the commands below on a machine with npm registry access before a real demo/deployment.

## Validation performed

- Reviewed the full project tree and all application/configuration source files.
- Backend TypeScript syntax check with Node type stripping: passed.
- JSON/config structure checked.
- SQLite and Supabase Prisma model changes were kept aligned (datasource/provider differences aside).
- Targeted mock medical-NLP tests passed for English, transliterated Tamil and Tamil script samples.
- Voice recognition event handling was reviewed for final/interim-result semantics and rewritten to prevent duplicate transcript commits.
- Authorization review covered registration, patient ownership, voice approval, document approval and protected document retrieval.
- Upload workflow reviewed for content type, file signature, size limit and cleanup behavior.

## Targeted NLP checks

Expected examples verified against `extractMedicalInfo`:

- Transliteration: `moonu naala fever ... moochu ... sugar ... Metformin 500 mg twice a day` → Fever, breathing difficulty, 3 days, Diabetes, Metformin dosage/frequency.
- Tamil script: `மூன்று நாளா காய்ச்சல் ... மூச்சு ... சர்க்கரை` → Fever, breathing difficulty, 3 days, Diabetes.
- English: `severe cough for 2 weeks ... allergic to penicillin ... amlodipine 5 mg daily` → cough, 2 weeks, severe, penicillin allergy and amlodipine dosage/frequency.

## Required local verification

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run typecheck
npm run build
npm run dev
```

Then test in the target browser:

1. Login as patient and record English/Tamil speech. Confirm live interim text does not duplicate in the final transcript.
2. Deny microphone permission once and verify a useful error is shown and manual typing still works.
3. Change transcript after extraction and confirm Save is disabled until re-analysis.
4. Save as patient and confirm the voice session is Pending, with no diagnosis/medication written yet.
5. Login as doctor, open the patient Voice Sessions tab, approve, and confirm reviewed facts appear in overview/timeline.
6. Upload a real synthetic PDF/image; verify it can only be viewed while authenticated and with patient access.
7. Attempt to upload a renamed non-PDF/non-image file and confirm file-signature rejection.
8. Approve a document once, confirm its extraction fields lock, and confirm a second approval receives 409.
9. Try public signup with a doctor role in a raw API client; confirm the schema rejects it.
10. From Admin Dashboard, create a clinician and verify that account can log in.

## Known test limitation

A container cannot verify the physical microphone, browser permission UI, OS speech service quality or real device/browser language accuracy. Those must be tested in Chrome/Edge/another supported target browser on the actual demo device. Browser Web Speech support varies, so manual text input must remain available as the fallback.

See `PROJECT_REVIEW_AND_ENHANCEMENTS.md` for the full audit and remaining production limitations.

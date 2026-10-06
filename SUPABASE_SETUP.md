# Supabase setup for MediBridge AI

The project uses **SQLite locally** and provides `prisma/schema.supabase.prisma` for **Supabase PostgreSQL** in production.

## 1. Create a Supabase project

Create a new project and save the database password securely.

## 2. Optional: create a dedicated Prisma database user

Open Supabase SQL Editor, copy `supabase_setup.sql`, replace the placeholder password with a strong generated password, and run it.

Using a separate Prisma role is recommended because it isolates application database permissions and is easier to monitor.

## 3. Copy the correct connection string

In Supabase Dashboard, open **Connect** and copy the **Supavisor Session Pooler** connection string for a normal long-running Node/Render backend. It uses port `5432`.

If you created the `prisma` role, the username in a shared pooler connection is typically `prisma.<PROJECT_REF>`.

Example shape only:

```env
DATABASE_URL="postgresql://prisma.PROJECT_REF:YOUR_PASSWORD@POOLER_HOST:5432/postgres"
```

Do not guess the pooler host. Copy it from Supabase's Connect panel.

## 4. Push the Prisma schema

From the project root:

```bash
npm install
DATABASE_URL="YOUR_SUPABASE_CONNECTION_STRING" npm run prisma:generate:prod -w backend
DATABASE_URL="YOUR_SUPABASE_CONNECTION_STRING" npm run db:push:prod -w backend
```

On Windows PowerShell, set it first:

```powershell
$env:DATABASE_URL="YOUR_SUPABASE_CONNECTION_STRING"
npm run prisma:generate:prod -w backend
npm run db:push:prod -w backend
```

## 5. Seed demo data once

```bash
DATABASE_URL="YOUR_SUPABASE_CONNECTION_STRING" npm run seed:prod -w backend
```

The seed is idempotent: if `admin@medibridge.ai` already exists, it skips creating duplicate demo data.

## 6. Useful verification queries

Run these in Supabase SQL Editor after schema push and seed:

```sql
select count(*) as patients from "Patient";
select count(*) as doctors from "Doctor";
select count(*) as consultations from "Consultation";
select count(*) as documents from "MedicalDocument";
select count(*) as voice_sessions from "VoiceSession";
```

Detailed Ravi Kumar check:

```sql
select p."patientCode", p.name, p.age, p.gender, p."preferredLanguage"
from "Patient" p
where p."patientCode" = 'MB-P-1001';
```

Medication query:

```sql
select p.name as patient, m.name as medication, pm.dosage, pm.frequency, pm.status
from "PatientMedication" pm
join "Patient" p on p.id = pm."patientId"
join "Medication" m on m.id = pm."medicationId"
where p."patientCode" = 'MB-P-1001'
order by pm."startedAt" desc;
```

Timeline-style query:

```sql
select 'consultation' as event_type, c."consultationDate" as event_date, coalesce(c."chiefComplaint", c."clinicalNotes") as detail
from "Consultation" c
join "Patient" p on p.id = c."patientId"
where p."patientCode" = 'MB-P-1001'
union all
select 'lab', lr."resultDate", lt.name || ': ' || lr.value || coalesce(' ' || lr.unit, '')
from "LabResult" lr
join "LabTest" lt on lt.id = lr."labTestId"
join "Patient" p on p.id = lr."patientId"
where p."patientCode" = 'MB-P-1001'
order by event_date desc;
```

## 7. Render environment variable

In the Render backend Web Service, set:

```text
DATABASE_URL = <Supabase Session Pooler connection string>
```

The included Render configuration uses `prisma/schema.supabase.prisma` in production.

## Transaction-pooler note

Supabase transaction mode uses port `6543` and is designed for serverless/auto-scaling connection patterns. If you deliberately use transaction mode with Prisma, follow Supabase/Prisma pooler guidance (including prepared-statement limitations). For this Render Node web-service prototype, Session Pooler on `5432` is the simpler default.

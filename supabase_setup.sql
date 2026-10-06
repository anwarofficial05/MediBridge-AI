-- MediBridge AI - optional Supabase Prisma role setup.
-- Run in Supabase SQL Editor only if you want a dedicated Prisma database user.
-- IMPORTANT: Replace CHANGE_ME_WITH_A_STRONG_PASSWORD before running.

create user "prisma" with password 'CHANGE_ME_WITH_A_STRONG_PASSWORD' bypassrls createdb;
grant "prisma" to "postgres";

grant usage on schema public to prisma;
grant create on schema public to prisma;
grant all on all tables in schema public to prisma;
grant all on all routines in schema public to prisma;
grant all on all sequences in schema public to prisma;

alter default privileges for role postgres in schema public grant all on tables to prisma;
alter default privileges for role postgres in schema public grant all on routines to prisma;
alter default privileges for role postgres in schema public grant all on sequences to prisma;

-- Useful verification queries after Prisma db push / seed:
-- select count(*) as patients from "Patient";
-- select count(*) as doctors from "Doctor";
-- select count(*) as consultations from "Consultation";
-- select count(*) as documents from "MedicalDocument";
-- select "preferredLanguage", count(*) from "Patient" group by "preferredLanguage" order by count(*) desc;

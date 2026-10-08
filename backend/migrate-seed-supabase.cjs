const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { execSync } = require('child_process');
const path = require('path');

const config = {
  host: 'db.szdovfcrwypgwpzwnicz.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'MEDIBRIDGE2AI£1234',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
};

const d = (s) => new Date(s + 'T09:30:00.000Z');

async function run() {
  console.log('Connecting to Supabase PostgreSQL at ' + config.host + '...');
  const client = new Client(config);
  await client.connect();
  console.log('Connected successfully!');

  console.log('\n--- STEP 1: Generating and applying database schema ---');
  const schemaPath = path.resolve(__dirname, '../prisma/schema.supabase.prisma').replace(/\\/g, '/');
  const ddlSql = execSync(
    `npx prisma migrate diff --from-empty --to-schema-datamodel "${schemaPath}" --script`,
    { cwd: path.resolve(__dirname, '..'), encoding: 'utf-8' }
  );

  await client.query(ddlSql);
  console.log('Database tables, constraints, and indexes created in Supabase!');

  console.log('\n--- STEP 2: Seeding demo clinical data ---');
  // Check if admin already exists
  const existingAdmin = await client.query('SELECT id FROM "User" WHERE email = $1', ['admin@medibridge.ai']);
  if (existingAdmin.rows.length > 0) {
    console.log('Demo seed already present in Supabase. Skipping seed.');
  } else {
    const passwordHash = await bcrypt.hash('demo123', 12);

    // Departments
    const deptIds = {};
    for (const name of ['General Medicine', 'Cardiology', 'Endocrinology', 'Pulmonology']) {
      const res = await client.query(
        'INSERT INTO "Department" (id, name, "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, NOW(), NOW()) RETURNING id',
        [name]
      );
      deptIds[name] = res.rows[0].id;
    }

    // Admin user
    await client.query(
      'INSERT INTO "User" (id, name, email, "passwordHash", role, "isActive", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())',
      ['MediBridge Admin', 'admin@medibridge.ai', passwordHash, 'ADMIN']
    );

    // Doctors
    const doctorDefs = [
      ['Dr. Priya Raman', 'doctor@medibridge.ai', 'General Medicine', 'MB-DOC-001'],
      ['Dr. Arjun Mehta', 'doctor2@medibridge.ai', 'Endocrinology', 'MB-DOC-002'],
      ['Dr. Nisha Rao', 'doctor3@medibridge.ai', 'Pulmonology', 'MB-DOC-003'],
    ];
    const doctors = [];
    for (const [name, email, dept, reg] of doctorDefs) {
      const uRes = await client.query(
        'INSERT INTO "User" (id, name, email, "passwordHash", role, "isActive", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW()) RETURNING id',
        [name, email, passwordHash, 'DOCTOR']
      );
      const docRes = await client.query(
        'INSERT INTO "Doctor" (id, "userId", "registrationNo", specialization, "departmentId", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW()) RETURNING id',
        [uRes.rows[0].id, reg, dept, deptIds[dept]]
      );
      doctors.push({ id: docRes.rows[0].id, name, email });
    }

    // Patients
    const patientDefs = [
      ['Ravi Kumar', 'patient@medibridge.ai', 'MB-P-1001', 54, 'Male', 'Tamil'],
      ['Meena Devi', 'meena@medibridge.ai', 'MB-P-1002', 42, 'Female', 'Tamil'],
      ['Aarav Sharma', 'aarav@medibridge.ai', 'MB-P-1003', 31, 'Male', 'Hindi'],
      ['Lakshmi Reddy', 'lakshmi@medibridge.ai', 'MB-P-1004', 63, 'Female', 'Telugu'],
      ['Daniel Joseph', 'daniel@medibridge.ai', 'MB-P-1005', 27, 'Male', 'English'],
    ];
    const patients = [];
    for (const [name, email, code, age, gender, language] of patientDefs) {
      const uRes = await client.query(
        'INSERT INTO "User" (id, name, email, "passwordHash", role, "isActive", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW()) RETURNING id',
        [name, email, passwordHash, 'PATIENT']
      );
      const pRes = await client.query(
        'INSERT INTO "Patient" (id, "userId", "patientCode", name, age, gender, "preferredLanguage", "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id',
        [uRes.rows[0].id, code, name, age, gender, language]
      );
      patients.push({ id: pRes.rows[0].id, code, name });
    }

    const ravi = patients[0];

    // Medications
    const medMap = {};
    for (const med of ['Metformin', 'Amlodipine', 'Paracetamol', 'Salbutamol inhaler', 'Amoxicillin', 'Aspirin', 'Warfarin']) {
      const res = await client.query(
        'INSERT INTO "Medication" (id, name, "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, NOW(), NOW()) RETURNING id',
        [med]
      );
      medMap[med] = res.rows[0].id;
    }

    // Lab Tests
    const labMap = {};
    for (const [name, unit] of [['HbA1c', '%'], ['Fasting Blood Glucose', 'mg/dL'], ['Complete Blood Count', '']]) {
      const res = await client.query(
        'INSERT INTO "LabTest" (id, name, unit, "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) RETURNING id',
        [name, unit]
      );
      labMap[name] = res.rows[0].id;
    }

    // Diagnoses
    await client.query(
      `INSERT INTO "Diagnosis" (id, "patientId", "doctorId", name, source, "recordedAt", "status", "createdAt", "updatedAt") VALUES 
       (gen_random_uuid(), $1, $2, 'Type 2 Diabetes', 'DOCTOR_RECORDED', $3, 'ACTIVE', NOW(), NOW()),
       (gen_random_uuid(), $4, $5, 'Hypertension', 'DOCTOR_RECORDED', $6, 'ACTIVE', NOW(), NOW()),
       (gen_random_uuid(), $7, $8, 'Asthma', 'DOCTOR_RECORDED', $9, 'ACTIVE', NOW(), NOW())`,
      [ravi.id, doctors[1].id, d('2025-11-10'), patients[1].id, doctors[0].id, d('2026-04-11'), patients[3].id, doctors[2].id, d('2026-03-20')]
    );

    // Active Patient Medications
    await client.query(
      `INSERT INTO "PatientMedication" (id, "patientId", "medicationId", dosage, frequency, duration, status, "startedAt", "createdAt", "updatedAt") VALUES 
       (gen_random_uuid(), $1, $2, '500 mg', 'Twice daily', 'Ongoing', 'ACTIVE', $3, NOW(), NOW()),
       (gen_random_uuid(), $4, $5, '5 mg', 'Once daily', 'Ongoing', 'ACTIVE', $6, NOW(), NOW()),
       (gen_random_uuid(), $7, $8, '100 mcg', 'PRN as needed', 'Ongoing', 'ACTIVE', $9, NOW(), NOW())`,
      [ravi.id, medMap['Metformin'], d('2025-11-10'), patients[1].id, medMap['Amlodipine'], d('2026-04-11'), patients[3].id, medMap['Salbutamol inhaler'], d('2026-03-20')]
    );

    // ALLERGIES (CRITICAL: Penicillin allergy on Ravi Kumar)
    await client.query(
      `INSERT INTO "Allergy" (id, "patientId", substance, reaction, severity, "recordedAt", "createdAt", "updatedAt") VALUES 
       (gen_random_uuid(), $1, 'Penicillin', 'Severe rash & anaphylactic urticaria', 'CRITICAL', $2, NOW(), NOW()),
       (gen_random_uuid(), $3, 'Peanuts', 'Hives', 'Moderate', NOW(), NOW(), NOW())`,
      [ravi.id, d('2025-11-10'), patients[2].id]
    );

    // Consultations
    const conRes = await client.query(
      `INSERT INTO "Consultation" (id, "patientId", "doctorId", "consultationDate", "chiefComplaint", "clinicalNotes", "createdAt", "updatedAt") VALUES 
       (gen_random_uuid(), $1, $2, $3, 'Follow-up for glycemic monitoring', 'Adhering to Metformin 500mg. Stable vitals.', NOW(), NOW()) RETURNING id`,
      [ravi.id, doctors[0].id, d('2026-08-05')]
    );

    // Lab Results
    await client.query(
      `INSERT INTO "LabResult" (id, "patientId", "labTestId", "consultationId", value, unit, "resultDate", "createdAt", "updatedAt") VALUES 
       (gen_random_uuid(), $1, $2, $3, '7.4', '%', $4, NOW(), NOW()),
       (gen_random_uuid(), $1, $5, $3, '132', 'mg/dL', $4, NOW(), NOW())`,
      [ravi.id, labMap['HbA1c'], conRes.rows[0].id, d('2026-07-20'), labMap['Fasting Blood Glucose']]
    );

    // Clinical Summary
    await client.query(
      `INSERT INTO "ClinicalSummary" (id, "patientId", "summaryText", "generatedBy", approved, "createdAt", "updatedAt") VALUES 
       (gen_random_uuid(), $1, $2, 'MEDIBRIDGE_AI_CLINICAL_CORE', true, NOW(), NOW())`,
      [
        ravi.id,
        'PATIENT CLINICAL PRE-CONSULTATION SYNTHESIS\nPatient: Ravi Kumar (MB-P-1001) | 54 yrs Male | Preferred: Tamil\nChronic Conditions: Type 2 Diabetes\nActive Medications: Metformin HCl 500mg (Twice daily)\nALLERGY CONTRAINDICATION: Severe Penicillin allergy (High risk of anaphylaxis with Beta-lactams)\nRecent HbA1c: 7.4% (Suboptimal glycemic control)'
      ]
    );

    console.log('Seeding completed successfully!');
  }

  console.log('\n--- STEP 3: Verification Queries from Supabase ---');
  const tableCounts = await client.query(`
    SELECT 'User' as tbl, count(*) as cnt FROM "User"
    UNION ALL SELECT 'Patient', count(*) FROM "Patient"
    UNION ALL SELECT 'Doctor', count(*) FROM "Doctor"
    UNION ALL SELECT 'Medication', count(*) FROM "Medication"
    UNION ALL SELECT 'Allergy', count(*) FROM "Allergy"
    UNION ALL SELECT 'LabResult', count(*) FROM "LabResult"
    UNION ALL SELECT 'Consultation', count(*) FROM "Consultation";
  `);
  console.table(tableCounts.rows);

  const raviData = await client.query(`
    SELECT p."patientCode", p.name, p.age, p.gender, p."preferredLanguage",
           m.name as medication, pm.dosage, pm.status as med_status,
           a.substance as allergy, a.severity as allergy_severity
    FROM "Patient" p
    LEFT JOIN "PatientMedication" pm ON pm."patientId" = p.id
    LEFT JOIN "Medication" m ON m.id = pm."medicationId"
    LEFT JOIN "Allergy" a ON a."patientId" = p.id
    WHERE p."patientCode" = 'MB-P-1001';
  `);
  console.log('\nRavi Kumar (MB-P-1001) Clinical Record in Supabase:');
  console.table(raviData.rows);

  await client.end();
}

run().catch(err => {
  console.error('Migration & Seed Error:', err);
  process.exit(1);
});

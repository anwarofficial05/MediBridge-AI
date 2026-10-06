import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const d = (s: string) => new Date(s + 'T09:30:00.000Z');

async function main() {
  if (await prisma.user.findUnique({ where: { email: 'admin@medibridge.ai' } })) {
    console.log('Demo seed already present. Skipping.');
    return;
  }

  const passwordHash = await bcrypt.hash('demo123', 12);
  const departments: Record<string, string> = {};
  for (const name of ['General Medicine', 'Cardiology', 'Endocrinology', 'Pulmonology']) {
    const dep = await prisma.department.create({ data: { name } });
    departments[name] = dep.id;
  }

  await prisma.user.create({ data: { name: 'MediBridge Admin', email: 'admin@medibridge.ai', passwordHash, role: 'ADMIN' } });

  const doctorDefs = [
    ['Dr. Priya Raman', 'doctor@medibridge.ai', 'General Medicine', 'MB-DOC-001'],
    ['Dr. Arjun Mehta', 'doctor2@medibridge.ai', 'Endocrinology', 'MB-DOC-002'],
    ['Dr. Nisha Rao', 'doctor3@medibridge.ai', 'Pulmonology', 'MB-DOC-003'],
  ] as const;
  const doctors: any[] = [];
  for (const [name, email, dept, reg] of doctorDefs) {
    const user = await prisma.user.create({ data: { name, email, passwordHash, role: 'DOCTOR' } });
    doctors.push(await prisma.doctor.create({ data: { userId: user.id, registrationNo: reg, specialization: dept, departmentId: departments[dept] } }));
  }

  const patientDefs = [
    ['Ravi Kumar', 'patient@medibridge.ai', 'MB-P-1001', 54, 'Male', 'Tamil'],
    ['Meena Devi', 'meena@medibridge.ai', 'MB-P-1002', 42, 'Female', 'Tamil'],
    ['Aarav Sharma', 'aarav@medibridge.ai', 'MB-P-1003', 31, 'Male', 'Hindi'],
    ['Lakshmi Reddy', 'lakshmi@medibridge.ai', 'MB-P-1004', 63, 'Female', 'Telugu'],
    ['Daniel Joseph', 'daniel@medibridge.ai', 'MB-P-1005', 27, 'Male', 'English'],
  ] as const;
  const patients: any[] = [];
  for (const [name, email, code, age, gender, language] of patientDefs) {
    const user = await prisma.user.create({ data: { name, email, passwordHash, role: 'PATIENT' } });
    patients.push(await prisma.patient.create({ data: { userId: user.id, name, patientCode: code, age, gender, preferredLanguage: language } }));
  }
  const ravi = patients[0];

  const metformin = await prisma.medication.create({ data: { name: 'Metformin' } });
  const amlodipine = await prisma.medication.create({ data: { name: 'Amlodipine' } });
  const paracetamol = await prisma.medication.create({ data: { name: 'Paracetamol' } });
  const salbutamol = await prisma.medication.create({ data: { name: 'Salbutamol inhaler' } });
  const hba1c = await prisma.labTest.create({ data: { name: 'HbA1c', unit: '%' } });
  const fbg = await prisma.labTest.create({ data: { name: 'Fasting Blood Glucose', unit: 'mg/dL' } });
  const cbc = await prisma.labTest.create({ data: { name: 'Complete Blood Count', unit: '' } });

  await prisma.diagnosis.createMany({ data: [
    { patientId: ravi.id, doctorId: doctors[1].id, name: 'Type 2 Diabetes', source: 'DOCTOR_RECORDED', recordedAt: d('2025-11-10') },
    { patientId: patients[1].id, doctorId: doctors[0].id, name: 'Hypertension', recordedAt: d('2026-04-11') },
    { patientId: patients[3].id, doctorId: doctors[2].id, name: 'Asthma', recordedAt: d('2026-03-20') },
  ] });
  await prisma.patientMedication.createMany({ data: [
    { patientId: ravi.id, medicationId: metformin.id, dosage: '500 mg', frequency: 'Twice daily', duration: 'Ongoing', startedAt: d('2025-11-10') },
    { patientId: patients[1].id, medicationId: amlodipine.id, dosage: '5 mg', frequency: 'Once daily', duration: 'Ongoing', startedAt: d('2026-04-11') },
    { patientId: patients[3].id, medicationId: salbutamol.id, frequency: 'As recorded by clinician', duration: 'Ongoing', startedAt: d('2026-03-20') },
  ] });
  await prisma.allergy.createMany({ data: [
    { patientId: ravi.id, substance: 'Penicillin', reaction: 'Rash', severity: 'Moderate', recordedAt: d('2025-11-10') },
    { patientId: patients[2].id, substance: 'Peanuts', reaction: 'Hives', severity: 'Moderate' },
  ] });

  const consultationData = [
    [ravi.id, doctors[1].id, '2025-11-10', 'Increased thirst and fatigue', 'Diabetes follow-up and baseline counselling.'],
    [ravi.id, doctors[1].id, '2026-02-08', 'Routine diabetes review', 'Medication adherence documented.'],
    [ravi.id, doctors[0].id, '2026-08-02', 'Fever and cough', 'Symptom documentation; investigations recorded separately.'],
    [ravi.id, doctors[0].id, '2026-09-15', 'Follow-up consultation', 'Reviewed prior reports and current medication list.'],
    [patients[1].id, doctors[0].id, '2026-04-11', 'Headache', 'Blood pressure history reviewed.'],
    [patients[1].id, doctors[0].id, '2026-07-18', 'Routine review', 'Medication history updated.'],
    [patients[2].id, doctors[0].id, '2026-06-03', 'Fever', 'Short symptom history documented.'],
    [patients[3].id, doctors[2].id, '2026-03-20', 'Breathing difficulty', 'Known asthma history documented.'],
    [patients[3].id, doctors[2].id, '2026-08-21', 'Cough', 'Follow-up consultation recorded.'],
    [patients[4].id, doctors[0].id, '2026-09-03', 'Abdominal pain', 'Initial consultation note.'],
  ] as const;
  const consultations: any[] = [];
  for (const [patientId, doctorId, date, complaint, notes] of consultationData) {
    consultations.push(await prisma.consultation.create({ data: { patientId, doctorId, consultationDate: d(date), chiefComplaint: complaint, clinicalNotes: notes } }));
  }

  await prisma.patientSymptom.createMany({ data: [
    { patientId: ravi.id, consultationId: consultations[2].id, name: 'Fever', duration: '3 days', reportedAt: d('2026-08-02') },
    { patientId: ravi.id, consultationId: consultations[2].id, name: 'Cough', duration: '2 days', severity: 'Mild', reportedAt: d('2026-08-02') },
    { patientId: ravi.id, name: 'Breathing difficulty', duration: '1 day', severity: 'Mild', reportedAt: d('2026-09-24') },
    { patientId: patients[1].id, name: 'Headache', duration: '1 day', reportedAt: d('2026-04-11') },
    { patientId: patients[2].id, name: 'Fever', duration: '2 days', reportedAt: d('2026-06-03') },
    { patientId: patients[3].id, name: 'Breathing difficulty', duration: '2 days', reportedAt: d('2026-03-20') },
    { patientId: patients[3].id, name: 'Cough', duration: '4 days', reportedAt: d('2026-08-21') },
    { patientId: patients[4].id, name: 'Abdominal pain', duration: '6 hours', reportedAt: d('2026-09-03') },
  ] });

  await prisma.labResult.createMany({ data: [
    { patientId: ravi.id, labTestId: hba1c.id, value: '7.8', unit: '%', referenceRange: 'Lab-specific', resultDate: d('2026-02-08') },
    { patientId: ravi.id, labTestId: hba1c.id, value: '7.4', unit: '%', referenceRange: 'Lab-specific', resultDate: d('2026-08-05') },
    { patientId: ravi.id, labTestId: fbg.id, value: '132', unit: 'mg/dL', referenceRange: '70-99 mg/dL', resultDate: d('2026-08-05') },
    { patientId: patients[2].id, labTestId: cbc.id, value: 'Within documented range', unit: '', resultDate: d('2026-06-04') },
  ] });

  await prisma.patientMedication.create({ data: { patientId: ravi.id, medicationId: paracetamol.id, dosage: '500 mg', frequency: 'As recorded', duration: '3 days', status: 'COMPLETED', source: 'DOCUMENT_RECORDED', startedAt: d('2026-08-02'), endedAt: d('2026-08-05') } });

  const oldPrescription = await prisma.medicalDocument.create({ data: {
    patientId: ravi.id, originalName: 'ravi_old_prescription_demo.pdf', storedName: 'seed-ravi-prescription.pdf', mimeType: 'application/pdf', filePath: 'uploads/seed-ravi-prescription.pdf', documentType: 'PRESCRIPTION', documentDate: d('2026-08-02'), status: 'APPROVED',
    extractedData: { create: { approved: true, approvedAt: d('2026-08-03'), reviewedBy: doctors[0].userId, dataJson: JSON.stringify({ patientName: 'Ravi Kumar', doctorName: 'Dr. Priya Raman', hospital: 'MediBridge Demo Hospital', date: '2026-08-02', diagnosisRecorded: [], medicines: [{ name: 'Paracetamol', dosage: '500 mg', frequency: 'As recorded', duration: '3 days' }], labTests: [], allergies: [], followUpDate: '2026-09-15', note: 'Seeded synthetic document extraction.' }) } }
  } });
  await prisma.medicalDocument.create({ data: { patientId: ravi.id, originalName: 'hba1c_lab_report_demo.pdf', storedName: 'seed-hba1c-report.pdf', mimeType: 'application/pdf', filePath: 'uploads/seed-hba1c-report.pdf', documentType: 'LAB_REPORT', documentDate: d('2026-08-05'), status: 'APPROVED', extractedData: { create: { approved: true, approvedAt: d('2026-08-06'), reviewedBy: doctors[1].userId, dataJson: JSON.stringify({ patientName: 'Ravi Kumar', labTests: [{ name: 'HbA1c', value: '7.4', unit: '%' }] }) } } } });

  await prisma.voiceSession.create({ data: { patientId: ravi.id, language: 'Tamil', transcript: 'Enakku moonu naala fever irukku. Inniki moochu vida konjam kashtama irukku. Enakku sugar irukku. Metformin tablet sapidren.', extractedJson: JSON.stringify({ symptoms: [{ name: 'Fever', duration: '3 days' }, { name: 'Breathing difficulty' }], conditions: [{ name: 'Diabetes' }], medications: [{ name: 'Metformin' }] }), approved: true, approvedAt: d('2026-09-24'), reviewedBy: doctors[0].userId, createdAt: d('2026-09-24') } });
  await prisma.clinicalSummary.create({ data: { patientId: ravi.id, generatedBy: 'MOCK_AI', approved: true, summaryText: 'Patient: Ravi Kumar, 54-year-old male.\n\nKnown Conditions: Type 2 Diabetes.\n\nCurrent/Recent Reported Symptoms: Fever and breathing difficulty.\n\nCurrent Medications: Metformin.\n\nRecent Reports: HbA1c 7.4%.\n\nAllergies: Penicillin (rash).' } });
  await prisma.auditLog.create({ data: { action: 'SEED_CREATED', entityType: 'MedicalDocument', entityId: oldPrescription.id, metadata: JSON.stringify({ synthetic: true }) } });

  console.log('MediBridge AI demo database seeded.');
  console.log('Patient: patient@medibridge.ai / demo123');
  console.log('Doctor:  doctor@medibridge.ai / demo123');
  console.log('Admin:   admin@medibridge.ai / demo123');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => prisma.$disconnect());

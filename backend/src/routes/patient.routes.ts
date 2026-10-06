import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { prisma } from '../utils/prisma.js';
import { generateClinicalSummary } from '../services/ai.service.js';
import { audit } from '../utils/audit.js';
import { storedFileExists } from '../utils/files.js';

const router = Router();
router.use(requireAuth);

async function canAccess(req: any, patientId: string) {
  if (req.authUser.role === 'DOCTOR' || req.authUser.role === 'ADMIN') return true;
  const own = await prisma.patient.findUnique({ where: { userId: req.authUser.id } });
  return own?.id === patientId;
}

const patientInclude = {
  allergies: { orderBy: { recordedAt: 'desc' as const } },
  symptoms: { orderBy: { reportedAt: 'desc' as const }, take: 20 },
  diagnoses: { orderBy: { recordedAt: 'desc' as const }, take: 20 },
  patientMedications: { include: { medication: true }, orderBy: { startedAt: 'desc' as const }, take: 30 },
  labResults: { include: { labTest: true }, orderBy: { resultDate: 'desc' as const }, take: 20 },
  consultations: { include: { doctor: { include: { user: true } } }, orderBy: { consultationDate: 'desc' as const }, take: 20 },
  medicalDocuments: { include: { extractedData: true }, orderBy: { uploadedAt: 'desc' as const }, take: 20 },
  clinicalSummaries: { orderBy: { createdAt: 'desc' as const }, take: 10 },
  voiceSessions: { orderBy: { createdAt: 'desc' as const }, take: 20 },
};

function publicPatient(patient: any) {
  return {
    ...patient,
    medicalDocuments: patient.medicalDocuments?.map(({ filePath, storedName: _storedName, ...doc }: any) => ({ ...doc, fileAvailable: storedFileExists(filePath) })),
    voiceSessions: patient.voiceSessions?.map((session: any) => ({
      ...session,
      extracted: (() => { try { return JSON.parse(session.extractedJson); } catch { return null; } })(),
      extractedJson: undefined,
    })),
  };
}

router.get('/me', async (req, res) => {
  const patient = await prisma.patient.findUnique({ where: { userId: req.authUser!.id }, include: patientInclude });
  if (!patient) return res.status(404).json({ message: 'Patient profile not found' });
  res.json(publicPatient(patient));
});

router.get('/', allowRoles('DOCTOR', 'ADMIN'), async (req, res) => {
  const q = String(req.query.q || '').trim();
  const patients = await prisma.patient.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { patientCode: { contains: q } }] } : undefined,
    include: { diagnoses: { take: 2, orderBy: { recordedAt: 'desc' } }, patientMedications: { where: { status: 'ACTIVE' }, include: { medication: true }, take: 3 } },
    orderBy: { updatedAt: 'desc' }, take: 50,
  });
  res.json(patients);
});

router.get('/:id', async (req, res) => {
  if (!(await canAccess(req, req.params.id))) return res.status(403).json({ message: 'Forbidden' });
  const patient = await prisma.patient.findUnique({ where: { id: req.params.id }, include: patientInclude });
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  res.json(publicPatient(patient));
});

router.patch('/:id', async (req, res) => {
  if (!(await canAccess(req, req.params.id))) return res.status(403).json({ message: 'Forbidden' });
  const body = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    age: z.number().int().min(0).max(130).optional(),
    gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']).optional(),
    phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'Invalid phone number').optional(),
    preferredLanguage: z.enum(['English', 'Tamil', 'Hindi', 'Telugu']).optional(),
  }).parse(req.body);
  const existing = await prisma.patient.findUnique({ where: { id: req.params.id }, select: { id: true, userId: true } });
  if (!existing) return res.status(404).json({ message: 'Patient not found' });
  const patient = await prisma.$transaction(async (tx) => {
    const updated = await tx.patient.update({ where: { id: existing.id }, data: body });
    if (body.name && existing.userId) await tx.user.update({ where: { id: existing.userId }, data: { name: body.name } });
    return updated;
  });
  await audit(req, 'PATIENT_UPDATED', 'Patient', patient.id);
  res.json(patient);
});

router.get('/:id/timeline', async (req, res) => {
  if (!(await canAccess(req, req.params.id))) return res.status(403).json({ message: 'Forbidden' });
  const p = await prisma.patient.findUnique({ where: { id: req.params.id }, include: patientInclude });
  if (!p) return res.status(404).json({ message: 'Patient not found' });
  const events = [
    ...p.consultations.map(c => ({ id: `c-${c.id}`, type: 'Consultations', date: c.consultationDate, title: 'Consultation', detail: c.chiefComplaint || c.clinicalNotes || 'Clinical consultation' })),
    ...p.symptoms.map(s => ({ id: `s-${s.id}`, type: 'Symptoms', date: s.reportedAt, title: s.name, detail: [s.duration, s.severity].filter(Boolean).join(' • ') || 'Reported symptom' })),
    ...p.diagnoses.map(d => ({ id: `d-${d.id}`, type: 'Diagnoses', date: d.recordedAt, title: 'Diagnosis / Condition', detail: `${d.name} • ${d.source.replaceAll('_', ' ')}` })),
    ...p.patientMedications.map(m => ({ id: `m-${m.id}`, type: 'Medicines', date: m.startedAt, title: 'Medication', detail: `${m.medication.name}${m.dosage ? ` • ${m.dosage}` : ''}${m.frequency ? ` • ${m.frequency}` : ''}` })),
    ...p.labResults.map(l => ({ id: `l-${l.id}`, type: 'Lab Tests', date: l.resultDate, title: l.labTest.name, detail: `${l.value}${l.unit ? ` ${l.unit}` : ''}` })),
    ...p.medicalDocuments.map(d => ({ id: `doc-${d.id}`, type: 'Documents', date: d.uploadedAt, title: d.documentType.replaceAll('_', ' '), detail: `${d.originalName} • ${d.status.replaceAll('_', ' ')}` })),
    ...p.voiceSessions.map(v => ({ id: `voice-${v.id}`, type: 'Voice Sessions', date: v.createdAt, title: `${v.language} voice session`, detail: v.approved ? 'Clinician reviewed and approved' : 'Pending clinician review' })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(events);
});

router.get('/:id/graph', async (req, res) => {
  if (!(await canAccess(req, req.params.id))) return res.status(403).json({ message: 'Forbidden' });
  const p = await prisma.patient.findUnique({ where: { id: req.params.id }, include: patientInclude });
  if (!p) return res.status(404).json({ message: 'Patient not found' });
  const nodes: any[] = [{ id: `patient-${p.id}`, type: 'patient', label: p.name, subtitle: p.patientCode }];
  const edges: any[] = [];
  const root = nodes[0].id;
  const add = (id: string, type: string, label: string, relation: string, subtitle?: string) => { nodes.push({ id, type, label, subtitle }); edges.push({ id: `e-${root}-${id}`, source: root, target: id, label: relation }); };
  p.symptoms.slice(0, 8).forEach(s => add(`symptom-${s.id}`, 'symptom', s.name, 'REPORTED_SYMPTOM', s.duration || undefined));
  p.diagnoses.slice(0, 8).forEach(d => add(`condition-${d.id}`, 'condition', d.name, 'HAS_CONDITION', d.source));
  p.patientMedications.filter(m => m.status === 'ACTIVE').slice(0, 8).forEach(m => add(`med-${m.id}`, 'medication', m.medication.name, 'TAKES_MEDICATION', m.dosage || undefined));
  p.labResults.slice(0, 8).forEach(l => add(`lab-${l.id}`, 'lab', l.labTest.name, 'UNDERWENT_TEST', `${l.value}${l.unit ? ` ${l.unit}` : ''}`));
  p.allergies.slice(0, 5).forEach(a => add(`allergy-${a.id}`, 'allergy', a.substance, 'HAS_ALLERGY', a.reaction || undefined));
  p.consultations.slice(0, 5).forEach(c => {
    const id = `consult-${c.id}`; add(id, 'consultation', 'Consultation', 'HAD_CONSULTATION', new Date(c.consultationDate).toLocaleDateString('en-IN'));
    if (c.doctor) { const docId = `doctor-${c.doctor.id}`; if (!nodes.some(n => n.id === docId)) nodes.push({ id: docId, type: 'doctor', label: c.doctor.user.name, subtitle: c.doctor.specialization || 'Doctor' }); edges.push({ id: `e-${id}-${docId}`, source: id, target: docId, label: 'SEEN_BY' }); }
  });
  p.medicalDocuments.slice(0, 5).forEach(d => add(`doc-${d.id}`, 'document', d.originalName, 'HAS_DOCUMENT', d.status));
  res.json({ nodes, edges });
});

router.get('/:id/summary', async (req, res) => {
  if (!(await canAccess(req, req.params.id))) return res.status(403).json({ message: 'Forbidden' });
  const latest = await prisma.clinicalSummary.findFirst({
    where: { patientId: req.params.id, ...(req.authUser!.role === 'PATIENT' ? { approved: true } : {}) },
    orderBy: { createdAt: 'desc' },
  });
  res.json(latest || null);
});

router.post('/:id/summary', allowRoles('DOCTOR', 'ADMIN'), async (req, res) => {
  const patient = await prisma.patient.findUnique({ where: { id: req.params.id }, include: patientInclude });
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  const summaryText = generateClinicalSummary(patient);
  const summary = await prisma.clinicalSummary.create({ data: { patientId: patient.id, summaryText, generatedBy: 'MOCK_AI' } });
  await audit(req, 'AI_SUMMARY_GENERATED', 'ClinicalSummary', summary.id);
  res.status(201).json(summary);
});


router.post('/:id/summary/:summaryId/approve', allowRoles('DOCTOR', 'ADMIN'), async (req, res) => {
  const existing = await prisma.clinicalSummary.findFirst({ where: { id: req.params.summaryId, patientId: req.params.id } });
  if (!existing) return res.status(404).json({ message: 'Summary not found' });
  const summary = await prisma.clinicalSummary.update({ where: { id: existing.id }, data: { approved: true } });
  await audit(req, 'CLINICAL_SUMMARY_APPROVED', 'ClinicalSummary', summary.id);
  res.json(summary);
});

router.post('/:id/consultations', allowRoles('DOCTOR', 'ADMIN'), async (req, res) => {
  const body = z.object({ chiefComplaint: z.string().trim().max(500).optional(), clinicalNotes: z.string().trim().max(5000).optional() }).refine(v => Boolean(v.chiefComplaint || v.clinicalNotes), { message: 'Chief complaint or clinical note is required' }).parse(req.body);
  const doctor = req.authUser!.role === 'DOCTOR' ? await prisma.doctor.findUnique({ where: { userId: req.authUser!.id } }) : null;
  const item = await prisma.consultation.create({ data: { patientId: req.params.id, doctorId: doctor?.id, chiefComplaint: body.chiefComplaint, clinicalNotes: body.clinicalNotes } });
  await audit(req, 'CONSULTATION_ADDED', 'Consultation', item.id);
  res.status(201).json(item);
});

router.post('/:id/diagnoses', allowRoles('DOCTOR', 'ADMIN'), async (req, res) => {
  const body = z.object({ name: z.string().min(2), status: z.string().default('ACTIVE') }).parse(req.body);
  const doctor = req.authUser!.role === 'DOCTOR' ? await prisma.doctor.findUnique({ where: { userId: req.authUser!.id } }) : null;
  const item = await prisma.diagnosis.create({ data: { patientId: req.params.id, doctorId: doctor?.id, name: body.name, status: body.status } });
  await audit(req, 'DIAGNOSIS_ADDED', 'Diagnosis', item.id);
  res.status(201).json(item);
});

router.post('/:id/medications', allowRoles('DOCTOR', 'ADMIN'), async (req, res) => {
  const body = z.object({ name: z.string().min(2), dosage: z.string().optional(), frequency: z.string().optional(), duration: z.string().optional() }).parse(req.body);
  const med = await prisma.medication.upsert({ where: { name: body.name }, update: {}, create: { name: body.name } });
  const item = await prisma.patientMedication.create({ data: { patientId: req.params.id, medicationId: med.id, dosage: body.dosage, frequency: body.frequency, duration: body.duration } });
  await audit(req, 'MEDICATION_ADDED', 'PatientMedication', item.id);
  res.status(201).json(item);
});


router.post('/:id/allergies', allowRoles('DOCTOR', 'ADMIN'), async (req, res) => {
  const body = z.object({ substance: z.string().trim().min(2).max(150), reaction: z.string().trim().max(500).optional(), severity: z.string().trim().max(100).optional() }).parse(req.body);
  const patient = await prisma.patient.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  const existing = await prisma.allergy.findFirst({ where: { patientId: patient.id, substance: body.substance } });
  if (existing) return res.status(409).json({ message: 'This allergy is already recorded for the patient' });
  const item = await prisma.allergy.create({ data: { patientId: patient.id, substance: body.substance, reaction: body.reaction, severity: body.severity } });
  await audit(req, 'ALLERGY_ADDED', 'Allergy', item.id);
  res.status(201).json(item);
});

router.post('/:id/labs', allowRoles('DOCTOR', 'ADMIN'), async (req, res) => {
  const body = z.object({ name: z.string().min(2), value: z.string().min(1), unit: z.string().optional(), referenceRange: z.string().optional() }).parse(req.body);
  const test = await prisma.labTest.upsert({ where: { name: body.name }, update: { unit: body.unit }, create: { name: body.name, unit: body.unit } });
  const item = await prisma.labResult.create({ data: { patientId: req.params.id, labTestId: test.id, value: body.value, unit: body.unit, referenceRange: body.referenceRange } });
  await audit(req, 'LAB_RESULT_ADDED', 'LabResult', item.id);
  res.status(201).json(item);
});

export default router;

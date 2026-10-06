import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { extractMedicalInfo } from '../services/ai.service.js';
import { prisma } from '../utils/prisma.js';
import { audit } from '../utils/audit.js';

const router = Router();
router.use(requireAuth);

const languageSchema = z.enum(['English', 'Tamil', 'Hindi', 'Telugu']);
const shortText = z.string().trim().max(500);
const extractionSchema = z.object({
  chiefComplaint: z.string().trim().max(500).default(''),
  symptoms: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    duration: shortText.optional(),
    severity: shortText.optional(),
  })).max(30).default([]),
  conditions: z.array(z.object({ name: z.string().trim().min(1).max(120) })).max(30).default([]),
  previousTreatments: z.array(z.string().trim().max(500)).max(30).default([]),
  medications: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    dosage: shortText.optional(),
    frequency: shortText.optional(),
    duration: shortText.optional(),
  })).max(50).default([]),
  allergies: z.array(z.object({
    substance: z.string().trim().min(1).max(120),
    reaction: shortText.optional(),
  })).max(30).default([]),
  relevantHistory: z.array(z.string().trim().max(1000)).max(50).default([]),
  followUpQuestions: z.array(z.string().trim().max(500)).max(20).default([]),
});

async function canAccessPatient(user: NonNullable<Express.Request['authUser']>, patientId: string) {
  if (user.role === 'DOCTOR' || user.role === 'ADMIN') return true;
  const own = await prisma.patient.findUnique({ where: { userId: user.id }, select: { id: true } });
  return own?.id === patientId;
}

async function applyApprovedVoiceData(tx: any, session: any, extracted: z.infer<typeof extractionSchema>, reviewer: NonNullable<Express.Request['authUser']>) {
  const doctor = reviewer.role === 'DOCTOR'
    ? await tx.doctor.findUnique({ where: { userId: reviewer.id }, select: { id: true } })
    : null;

  const consultation = await tx.consultation.create({
    data: {
      patientId: session.patientId,
      doctorId: doctor?.id,
      chiefComplaint: extracted.chiefComplaint || undefined,
      clinicalNotes: session.transcript,
      source: 'VOICE_REVIEWED',
    },
  });

  for (const symptom of extracted.symptoms) {
    await tx.patientSymptom.create({
      data: {
        patientId: session.patientId,
        consultationId: consultation.id,
        name: symptom.name,
        duration: symptom.duration || undefined,
        severity: symptom.severity || undefined,
        notes: 'Captured from clinician-reviewed voice session',
      },
    });
  }

  for (const condition of extracted.conditions) {
    const duplicate = await tx.diagnosis.findFirst({ where: { patientId: session.patientId, name: condition.name, status: 'ACTIVE' } });
    if (!duplicate) {
      await tx.diagnosis.create({
        data: {
          patientId: session.patientId,
          doctorId: doctor?.id,
          consultationId: consultation.id,
          name: condition.name,
          source: 'VOICE_REVIEWED',
        },
      });
    }
  }

  for (const item of extracted.medications) {
    const med = await tx.medication.upsert({ where: { name: item.name }, update: {}, create: { name: item.name } });
    const duplicate = await tx.patientMedication.findFirst({
      where: { patientId: session.patientId, medicationId: med.id, status: 'ACTIVE' },
    });
    if (!duplicate) {
      await tx.patientMedication.create({
        data: {
          patientId: session.patientId,
          medicationId: med.id,
          dosage: item.dosage || undefined,
          frequency: item.frequency || undefined,
          duration: item.duration || undefined,
          source: 'VOICE_REVIEWED',
        },
      });
    }
  }

  for (const item of extracted.allergies) {
    const duplicate = await tx.allergy.findFirst({ where: { patientId: session.patientId, substance: item.substance } });
    if (!duplicate) {
      await tx.allergy.create({
        data: {
          patientId: session.patientId,
          substance: item.substance,
          reaction: item.reaction || undefined,
        },
      });
    }
  }

  return tx.voiceSession.update({
    where: { id: session.id },
    data: { approved: true, approvedAt: new Date(), reviewedBy: reviewer.id },
  });
}

router.post('/extract', async (req, res) => {
  const body = z.object({
    text: z.string().trim().min(2).max(10000),
    language: languageSchema.default('English'),
  }).parse(req.body);
  const result = await extractMedicalInfo(body.text, body.language);
  res.json({ ...result, disclaimer: 'AI-generated documentation support. Verify before saving to the medical record.' });
});

router.get('/patient/:patientId', async (req, res) => {
  if (!(await canAccessPatient(req.authUser!, req.params.patientId))) return res.status(403).json({ message: 'Forbidden' });
  const sessions = await prisma.voiceSession.findMany({
    where: { patientId: req.params.patientId },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
  res.json(sessions.map((session) => ({ ...session, extracted: JSON.parse(session.extractedJson) })));
});

router.post('/save', async (req, res) => {
  const body = z.object({
    patientId: z.string().min(1),
    language: languageSchema,
    transcript: z.string().trim().min(2).max(10000),
    extracted: extractionSchema,
    approved: z.boolean().default(false),
  }).parse(req.body);

  const patient = await prisma.patient.findUnique({ where: { id: body.patientId }, select: { id: true } });
  if (!patient) return res.status(404).json({ message: 'Patient not found' });
  if (!(await canAccessPatient(req.authUser!, body.patientId))) return res.status(403).json({ message: 'Cannot write another patient record' });
  if (body.approved && req.authUser!.role === 'PATIENT') {
    return res.status(403).json({ message: 'Patient-submitted voice data requires clinician review before EHR approval' });
  }

  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.voiceSession.create({
      data: {
        patientId: body.patientId,
        language: body.language,
        transcript: body.transcript,
        extractedJson: JSON.stringify(body.extracted),
        approved: false,
      },
    });
    if (!body.approved) return created;
    return applyApprovedVoiceData(tx, created, body.extracted, req.authUser!);
  });

  await audit(req, 'VOICE_SESSION_SAVED', 'VoiceSession', session.id, { language: body.language, approved: session.approved });
  res.status(201).json(session);
});

router.post('/:id/approve', allowRoles('DOCTOR', 'ADMIN'), async (req, res) => {
  const existing = await prisma.voiceSession.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ message: 'Voice session not found' });
  if (existing.approved) return res.status(409).json({ message: 'Voice session is already approved' });

  let extracted: z.infer<typeof extractionSchema>;
  try {
    extracted = extractionSchema.parse(JSON.parse(existing.extractedJson));
  } catch {
    return res.status(422).json({ message: 'Stored voice extraction is invalid and cannot be approved' });
  }

  const approved = await prisma.$transaction((tx) => applyApprovedVoiceData(tx, existing, extracted, req.authUser!));
  await audit(req, 'VOICE_SESSION_APPROVED', 'VoiceSession', existing.id, { patientId: existing.patientId });
  res.json(approved);
});

export default router;

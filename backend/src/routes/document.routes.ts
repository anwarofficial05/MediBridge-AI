import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { z } from 'zod';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { env } from '../utils/env.js';
import { extractDocumentData } from '../services/document.service.js';
import { prisma } from '../utils/prisma.js';
import { audit } from '../utils/audit.js';
import { resolveStoredFilePath } from '../utils/files.js';

const router = Router();
router.use(requireAuth);

const uploadDir = path.resolve(process.cwd(), '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const documentTypeSchema = z.enum([
  'PRESCRIPTION', 'LAB_REPORT', 'DISCHARGE_SUMMARY', 'CONSULTATION_REPORT', 'MEDICAL_CERTIFICATE', 'OTHER',
]);
const textField = z.string().trim().max(500);
const documentExtractionSchema = z.object({
  patientName: textField.default(''),
  doctorName: textField.default(''),
  hospital: textField.default(''),
  date: textField.default(''),
  diagnosisRecorded: z.array(z.string().trim().min(1).max(200)).max(50).default([]),
  medicines: z.array(z.object({
    name: z.string().trim().min(1).max(150),
    dosage: textField.default(''),
    frequency: textField.default(''),
    duration: textField.default(''),
  })).max(50).default([]),
  labTests: z.array(z.object({
    name: z.string().trim().min(1).max(150),
    value: z.string().trim().min(1).max(100),
    unit: textField.default(''),
    referenceRange: textField.optional(),
  })).max(100).default([]),
  allergies: z.array(z.object({
    substance: z.string().trim().min(1).max(150),
    reaction: textField.optional(),
  })).max(50).default([]),
  followUpDate: textField.default(''),
  note: z.string().trim().max(2000).default(''),
  safetyEvaluation: z.object({
    hasCriticalAlerts: z.boolean(),
    interactionAlerts: z.array(z.any()),
    allergyAlerts: z.array(z.any()),
    safetyScore: z.number(),
    safetySummary: z.string(),
  }).optional(),
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`),
});
const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const upload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowed.has(file.mimetype)) {
      return cb(new Error('Only PDF/JPG/PNG/WEBP files are allowed'));
    }
    cb(null, true);
  },});

function safeUnlink(filePath?: string) {
  if (!filePath) return;
  fs.promises.unlink(filePath).catch(() => undefined);
}

async function hasExpectedSignature(filePath: string, mimeType: string) {
  const handle = await fs.promises.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(1024);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const head = buffer.subarray(0, bytesRead);
    if (mimeType === 'application/pdf') return head.indexOf(Buffer.from('%PDF-')) >= 0;
    if (mimeType === 'image/jpeg') return head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    if (mimeType === 'image/png') return head.length >= 8 && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mimeType === 'image/webp') return head.length >= 12 && head.subarray(0, 4).toString('ascii') === 'RIFF' && head.subarray(8, 12).toString('ascii') === 'WEBP';
    return false;
  } finally {
    await handle.close();
  }
}

async function canAccessPatient(user: NonNullable<Express.Request['authUser']>, patientId: string) {
  if (user.role === 'DOCTOR' || user.role === 'ADMIN') return true;
  const own = await prisma.patient.findUnique({ where: { userId: user.id }, select: { id: true } });
  return own?.id === patientId;
}

function safeDocument(doc: any) {
  const { filePath: _filePath, storedName: _storedName, ...safe } = doc;
  return safe;
}

router.post('/extract', upload.single('document'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Document file required' });
  const cleanup = () => safeUnlink(req.file?.path);

  try {
    const patientId = z.string().min(1).parse(req.body.patientId);
    const documentType = documentTypeSchema.parse(req.body.documentType || 'OTHER');
    const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
    if (!patient) { cleanup(); return res.status(404).json({ message: 'Patient not found' }); }
    if (!(await canAccessPatient(req.authUser!, patientId))) { cleanup(); return res.status(403).json({ message: 'Cannot upload for another patient' }); }

    if (!(await hasExpectedSignature(req.file.path, req.file.mimetype))) {
      cleanup();
      return res.status(400).json({ message: 'File content does not match the declared PDF/image type' });
    }

    const rawExtraction = await extractDocumentData(req.file.path, req.file.mimetype, req.file.originalname, patientId);
    const extraction = documentExtractionSchema.parse(rawExtraction);
    const documentDate = extraction.date && !Number.isNaN(Date.parse(extraction.date)) ? new Date(extraction.date) : undefined;
    const doc = await prisma.medicalDocument.create({
      data: {
        patientId,
        originalName: req.file.originalname,
        storedName: req.file.filename,
        mimeType: req.file.mimetype,
        filePath: req.file.path,
        documentType,
        documentDate,
        extractedData: { create: { dataJson: JSON.stringify(extraction) } },
      },
      include: { extractedData: true },
    });
    await audit(req, 'DOCUMENT_EXTRACTED', 'MedicalDocument', doc.id, { provider: 'mock' });
    res.status(201).json({ document: safeDocument(doc), extracted: extraction });
  } catch (error) {
    cleanup();
    throw error;
  }
});

router.get('/:id/file', async (req, res) => {
  const docId = String(req.params.id);
  const doc = await prisma.medicalDocument.findUnique({ where: { id: docId } });
  if (!doc) return res.status(404).json({ message: 'Document not found' });
  if (!(await canAccessPatient(req.authUser!, doc.patientId))) return res.status(403).json({ message: 'Forbidden' });
  const resolvedPath = resolveStoredFilePath(doc.filePath);
  if (!resolvedPath) return res.status(404).json({ message: 'Stored file is unavailable' });
  const safeName = doc.originalName.replace(/["\r\n]/g, '_');
  res.type(doc.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  return res.sendFile(resolvedPath);
});

router.put('/:id/extracted', async (req, res) => {
  const docId = String(req.params.id);
  const doc = await prisma.medicalDocument.findUnique({ where: { id: docId }, include: { extractedData: true } });
  if (!doc?.extractedData) return res.status(404).json({ message: 'Document extraction not found' });
  if (!(await canAccessPatient(req.authUser!, doc.patientId))) return res.status(403).json({ message: 'Forbidden' });
  if (doc.status === 'APPROVED' || doc.extractedData.approved) return res.status(409).json({ message: 'Approved document extraction is locked from further edits' });

  const data = documentExtractionSchema.parse(req.body);
  const updated = await prisma.extractedMedicalData.update({
    where: { id: doc.extractedData.id },
    data: { dataJson: JSON.stringify(data) },
  });
  await audit(req, 'DOCUMENT_EXTRACTION_EDITED', 'MedicalDocument', doc.id);
  res.json({ ...updated, data });
});

router.post('/:id/approve', allowRoles('DOCTOR', 'ADMIN'), async (req, res) => {
  const docId = String(req.params.id);
  const doc = await prisma.medicalDocument.findUnique({ where: { id: docId }, include: { extractedData: true } });
  if (!doc?.extractedData) return res.status(404).json({ message: 'Document extraction not found' });
  if (doc.status === 'APPROVED' || doc.extractedData.approved) return res.status(409).json({ message: 'Document is already approved' });

  const raw = req.body?.extracted ?? JSON.parse(doc.extractedData.dataJson);
  const data = documentExtractionSchema.parse(raw);
  await prisma.$transaction(async (tx) => {
    await tx.medicalDocument.update({ where: { id: doc.id }, data: { status: 'APPROVED' } });
    await tx.extractedMedicalData.update({
      where: { id: doc.extractedData!.id },
      data: { dataJson: JSON.stringify(data), approved: true, approvedAt: new Date(), reviewedBy: req.authUser!.id },
    });

    const seenDiagnoses = new Set<string>();
    for (const diagnosis of data.diagnosisRecorded) {
      const key = diagnosis.toLowerCase();
      if (seenDiagnoses.has(key)) continue;
      seenDiagnoses.add(key);
      const exists = await tx.diagnosis.findFirst({ where: { patientId: doc.patientId, name: diagnosis, status: 'ACTIVE' } });
      if (!exists) await tx.diagnosis.create({ data: { patientId: doc.patientId, name: diagnosis, source: 'DOCUMENT_REVIEWED' } });
    }

    const seenMeds = new Set<string>();
    for (const item of data.medicines) {
      const key = item.name.toLowerCase();
      if (seenMeds.has(key)) continue;
      seenMeds.add(key);
      const med = await tx.medication.upsert({ where: { name: item.name }, update: {}, create: { name: item.name } });
      const exists = await tx.patientMedication.findFirst({ where: { patientId: doc.patientId, medicationId: med.id, status: 'ACTIVE' } });
      if (!exists) {
        await tx.patientMedication.create({
          data: {
            patientId: doc.patientId,
            medicationId: med.id,
            dosage: item.dosage || undefined,
            frequency: item.frequency || undefined,
            duration: item.duration || undefined,
            source: 'DOCUMENT_REVIEWED',
          },
        });
      }
    }

    const seenLabs = new Set<string>();
    for (const item of data.labTests) {
      const key = `${item.name.toLowerCase()}|${item.value}|${item.unit.toLowerCase()}`;
      if (seenLabs.has(key)) continue;
      seenLabs.add(key);
      const test = await tx.labTest.upsert({
        where: { name: item.name },
        update: { unit: item.unit || undefined },
        create: { name: item.name, unit: item.unit || undefined },
      });
      await tx.labResult.create({
        data: {
          patientId: doc.patientId,
          labTestId: test.id,
          value: item.value,
          unit: item.unit || undefined,
          referenceRange: item.referenceRange || undefined,
          resultDate: doc.documentDate || new Date(),
        },
      });
    }

    const seenAllergies = new Set<string>();
    for (const item of data.allergies) {
      const key = item.substance.toLowerCase();
      if (seenAllergies.has(key)) continue;
      seenAllergies.add(key);
      const exists = await tx.allergy.findFirst({ where: { patientId: doc.patientId, substance: item.substance } });
      if (!exists) {
        await tx.allergy.create({ data: { patientId: doc.patientId, substance: item.substance, reaction: item.reaction || undefined } });
      }
    }
  });

  await audit(req, 'DOCUMENT_APPROVED', 'MedicalDocument', doc.id);
  res.json({ message: 'Approved information added to patient record' });
});

export default router;

import { Router } from 'express';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { prisma } from '../utils/prisma.js';

const router = Router();
router.use(requireAuth);

router.get('/dashboard', allowRoles('DOCTOR', 'ADMIN'), async (_req, res) => {
  const [patients, doctors, consultations, documents, voiceSessions, pendingVoiceSessions, pendingDocuments] = await Promise.all([
    prisma.patient.count(),
    prisma.doctor.count(),
    prisma.consultation.count(),
    prisma.medicalDocument.count(),
    prisma.voiceSession.count(),
    prisma.voiceSession.count({ where: { approved: false } }),
    prisma.medicalDocument.count({ where: { status: 'PENDING_REVIEW' } }),
  ]);
  res.json({ patients, doctors, consultations, documents, voiceSessions, pendingVoiceSessions, pendingDocuments });
});

router.get('/admin', allowRoles('ADMIN'), async (_req, res) => {
  const [patients, doctors, consultations, documents, voiceSessions, pendingVoiceSessions, pendingDocuments, languageRows] = await Promise.all([
    prisma.patient.count(),
    prisma.doctor.count(),
    prisma.consultation.count(),
    prisma.medicalDocument.count(),
    prisma.voiceSession.count(),
    prisma.voiceSession.count({ where: { approved: false } }),
    prisma.medicalDocument.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.voiceSession.groupBy({ by: ['language'], _count: { language: true } }),
  ]);
  res.json({
    totals: { patients, doctors, consultations, documents, voiceSessions, pendingVoiceSessions, pendingDocuments },
    languageUsage: languageRows.map(r => ({ language: r.language, count: r._count.language })),
  });
});

export default router;

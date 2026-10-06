import { randomUUID } from 'node:crypto';
import { Router, type NextFunction, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { env } from '../utils/env.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { audit } from '../utils/audit.js';

const router = Router();
const email = z.string().trim().email().max(254);
const loginCredentials = z.object({ email, password: z.string().min(1).max(128) });
const registerBody = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password: z.string().min(8).max(128)
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/\d/, 'Password must contain at least one number'),
  role: z.literal('PATIENT').optional(),
  preferredLanguage: z.enum(['English', 'Tamil', 'Hindi', 'Telugu']).optional(),
});

const clinicianBody = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password: z.string().min(8).max(128)
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/\d/, 'Password must contain at least one number'),
  specialization: z.string().trim().min(2).max(120).default('General Medicine'),
  registrationNo: z.string().trim().max(100).optional(),
  departmentId: z.string().trim().min(1).optional(),
});

type Attempt = { count: number; resetAt: number };
const loginAttempts = new Map<string, Attempt>();
function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const key = req.ip || 'unknown';
  const current = loginAttempts.get(key);
  if (current && current.resetAt > now && current.count >= 10) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ message: 'Too many login attempts. Please try again later.' });
  }
  if (!current || current.resetAt <= now) loginAttempts.set(key, { count: 0, resetAt: now + 15 * 60 * 1000 });
  next();
}
function recordFailedLogin(req: Request) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const current = loginAttempts.get(key);
  if (!current || current.resetAt <= now) loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
  else current.count += 1;
  if (loginAttempts.size > 1000) {
    for (const [ip, item] of loginAttempts) if (item.resetAt <= now) loginAttempts.delete(ip);
  }
}


router.post('/register', async (req, res) => {
  const body = registerBody.parse(req.body);
  const normalizedEmail = body.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (exists) return res.status(409).json({ message: 'Email already registered' });

  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: normalizedEmail,
      passwordHash,
      role: 'PATIENT',
      patient: {
        create: {
          name: body.name,
          patientCode: `MB-${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`,
          preferredLanguage: body.preferredLanguage || 'English',
        },
      },
    },
  });

  const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
  await audit(req, 'PATIENT_REGISTERED', 'User', user.id);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.post('/login', loginRateLimit, async (req, res) => {
  const body = loginCredentials.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
  if (!user || !user.isActive || !(await bcrypt.compare(body.password, user.passwordHash))) {
    recordFailedLogin(req);
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  loginAttempts.delete(req.ip || 'unknown');
  const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any });
  await audit(req, 'LOGIN', 'User', user.id);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});


router.post('/clinicians', requireAuth, allowRoles('ADMIN'), async (req, res) => {
  const body = clinicianBody.parse(req.body);
  const normalizedEmail = body.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (exists) return res.status(409).json({ message: 'Email already registered' });
  if (body.departmentId) {
    const department = await prisma.department.findUnique({ where: { id: body.departmentId } });
    if (!department) return res.status(400).json({ message: 'Invalid department' });
  }
  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: normalizedEmail,
      passwordHash,
      role: 'DOCTOR',
      doctor: {
        create: {
          specialization: body.specialization,
          registrationNo: body.registrationNo || undefined,
          department: body.departmentId ? { connect: { id: body.departmentId } } : undefined,
        },
      },
    },
    include: { doctor: true },
  });
  await audit(req, 'CLINICIAN_CREATED', 'User', user.id);
  res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    doctor: user.doctor,
  });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.authUser!.id }, include: { patient: true, doctor: true } });
  res.json({ user: user && { id: user.id, name: user.name, email: user.email, role: user.role }, patient: user?.patient, doctor: user?.doctor });
});

export default router;

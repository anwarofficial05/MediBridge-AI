import type { Request } from 'express';
import { prisma } from './prisma.js';

export async function audit(req: Request, action: string, entityType: string, entityId?: string, metadata?: unknown) {
  await prisma.auditLog.create({
    data: {
      userId: req.authUser?.id,
      action,
      entityType,
      entityId,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      ipAddress: req.ip,
    },
  }).catch(() => undefined);
}

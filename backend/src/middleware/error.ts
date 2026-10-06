import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  if (err instanceof ZodError) {
    return res.status(400).json({ message: 'Invalid request data', issues: err.issues });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }
  if (err instanceof Error && err.message.startsWith('Only PDF/JPG/PNG/WEBP')) {
    return res.status(400).json({ message: err.message });
  }
  return res.status(500).json({ message: 'Unexpected server error' });
}

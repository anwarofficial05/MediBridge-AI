import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/auth.routes.js';
import patientRoutes from './routes/patient.routes.js';
import voiceRoutes from './routes/voice.routes.js';
import documentRoutes from './routes/document.routes.js';
import statsRoutes from './routes/stats.routes.js';
import { errorHandler } from './middleware/error.js';
import { env } from './utils/env.js';
import { prisma } from './utils/prisma.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(cors({ origin: env.FRONTEND_URL.split(',').map(s => s.trim()), credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'MediBridge AI API', aiProvider: env.AI_PROVIDER }));
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api', (_req, res) => res.status(404).json({ message: 'API endpoint not found' }));
app.use(errorHandler);

const server = app.listen(env.PORT, () => console.log(`MediBridge AI API running on port ${env.PORT}`));

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

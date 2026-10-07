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
import { isGeminiConfigured } from './services/gemini.service.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    const allowed = env.FRONTEND_URL.split(',').map(s => s.trim());
    if (allowed.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('CORS not allowed for this origin'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ 
  status: 'ok', 
  service: 'MediBridge AI API', 
  aiProvider: env.AI_PROVIDER, 
  geminiActive: isGeminiConfigured(),
  mode: isGeminiConfigured() ? 'Gemini 1.5 Multimodal Vision & Voice' : 'Intelligent Local Clinical Engine (Offline Safe)'
}));
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

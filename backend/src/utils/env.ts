import 'dotenv/config';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET is required. Copy backend/.env.example to backend/.env and set a secure value.');
}

export const env = {
  PORT: Number(process.env.PORT || 5000),
  JWT_SECRET: jwtSecret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  AI_PROVIDER: process.env.AI_PROVIDER || 'mock',
  AI_API_KEY: process.env.AI_API_KEY || '',
  MAX_FILE_SIZE_MB: Number(process.env.MAX_FILE_SIZE_MB || 8),
};

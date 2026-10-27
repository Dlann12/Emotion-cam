import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import emotionRoutes from './routes/emotions';
import analyticsRoutes from './routes/analytics';
import memoryRoutes from './routes/memories';
import profileRoutes from './routes/profile';
import privacyRoutes from './routes/privacy';

import path from 'path';
import helmet from 'helmet';

dotenv.config();

const app = express();

// Security Headers with cross-origin asset allowance for /uploads
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/emotions', emotionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/privacy', privacyRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;

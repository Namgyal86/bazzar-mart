import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';

const app = express();
const PORT = process.env.PORT || 8001;
const MONGO_URI = process.env.MONGO_URI_USER || 'mongodb://localhost:27017/user_db';

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'user-service' }));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const status = err.statusCode || 500;
  res.status(status).json({ success: false, error: err.message || 'Internal server error' });
});

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to user_db');
    app.listen(PORT, () => console.log(`🚀 User Service running on port ${PORT}`));
  })
  .catch((err) => { console.error('❌ DB connection failed:', err); process.exit(1); });

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import Redis from 'ioredis';
import cartRoutes from './routes/cart.routes';

const app = express();
const PORT = process.env.PORT || 8003;

// In-memory fallback store when Redis is unavailable
const memoryStore = new Map<string, string>();
let redisAvailable = false;

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  connectTimeout: 3000,
});

redisClient.on('connect', () => { redisAvailable = true; console.log('✅ Connected to Redis'); });
redisClient.on('error', () => { redisAvailable = false; });
redisClient.connect().catch(() => { console.log('⚠️  Redis unavailable — using in-memory cart store'); });

// Wrapper that falls back to in-memory when Redis is down
export const redis = {
  get: async (key: string) => {
    if (redisAvailable) { try { return await redisClient.get(key); } catch {} }
    return memoryStore.get(key) ?? null;
  },
  setex: async (key: string, ttl: number, value: string) => {
    if (redisAvailable) { try { await redisClient.setex(key, ttl, value); return; } catch {} }
    memoryStore.set(key, value);
  },
  del: async (key: string) => {
    if (redisAvailable) { try { await redisClient.del(key); return; } catch {} }
    memoryStore.delete(key);
  },
};

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'cart-service' }));
app.use('/api/v1/cart', cartRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.statusCode || 500).json({ success: false, error: err.message });
});

app.listen(PORT, () => console.log(`🚀 Cart Service running on port ${PORT}`));

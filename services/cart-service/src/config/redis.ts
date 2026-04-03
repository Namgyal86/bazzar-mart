import Redis from 'ioredis';
import { env } from './env';

const memoryStore = new Map<string, string>();
let redisAvailable = false;

const redisClient = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  connectTimeout: 3000,
});

redisClient.on('connect', () => { redisAvailable = true; console.log('✅ Connected to Redis'); });
redisClient.on('error', () => { redisAvailable = false; });
redisClient.connect().catch(() => { console.log('⚠️  Redis unavailable — using in-memory cart store'); });

export const redis = {
  get: async (key: string): Promise<string | null> => {
    if (redisAvailable) { try { return await redisClient.get(key); } catch {} }
    return memoryStore.get(key) ?? null;
  },
  setex: async (key: string, ttl: number, value: string): Promise<void> => {
    if (redisAvailable) { try { await redisClient.setex(key, ttl, value); return; } catch {} }
    memoryStore.set(key, value);
  },
  del: async (key: string): Promise<void> => {
    if (redisAvailable) { try { await redisClient.del(key); return; } catch {} }
    memoryStore.delete(key);
  },
};

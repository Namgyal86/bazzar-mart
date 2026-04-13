import Redis from 'ioredis';
import { env } from './env';

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 0,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: () => null, // don't auto-retry; let startup continue if Redis is down
    });
    client.on('connect',  () => console.log('✅ Redis connected'));
    client.on('error',    (err) => console.error('❌ Redis error:', err.message));
    client.on('reconnecting', () => console.warn('⚠️  Redis reconnecting…'));
  }
  return client;
}

export async function connectRedis(): Promise<void> {
  await getRedis().connect();
}

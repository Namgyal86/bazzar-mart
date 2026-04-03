import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('8003'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().default('access_secret_dev'),
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = envSchema.parse(process.env);

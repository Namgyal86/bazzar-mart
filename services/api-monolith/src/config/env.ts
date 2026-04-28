import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV:            z.enum(['development', 'production', 'test']).default('development'),
  PORT:                z.coerce.number().default(8100),

  // Auth
  JWT_ACCESS_SECRET:   z.string().min(32),
  JWT_REFRESH_SECRET:  z.string().min(32),

  // Database — single shared connection
  MONGO_URI:           z.string().url(),

  // Redis — cart module
  REDIS_URL:           z.string().default('redis://localhost:6379'),

  // Kafka
  KAFKA_BROKERS:       z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID:     z.string().default('api-monolith'),
  KAFKA_GROUP_ID:      z.string().default('api-monolith-group'),

  // Payment gateways
  KHALTI_SECRET_KEY:   z.string().optional(),
  ESEWA_SECRET_KEY:    z.string().optional(),
  ESEWA_MERCHANT_CODE: z.string().optional(),
  FONEPAY_MERCHANT_CODE: z.string().optional(),
  FONEPAY_SECRET_KEY:  z.string().optional(),

  // Public URLs
  API_BASE_URL:        z.string().url().default('http://localhost:8100'),
  // PUBLIC_API_URL: browser-accessible URL for payment gateway callbacks.
  // In Docker, API_BASE_URL is the internal hostname (api-monolith:8100).
  // Set this to http://localhost:3000 so callbacks go through Next.js rewrites.
  PUBLIC_API_URL:      z.string().url().optional(),
  WEB_URL:             z.string().url().default('http://localhost:3000'),

  // Email — SendGrid
  SENDGRID_API_KEY:    z.string().min(1).optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),

  // OAuth
  GOOGLE_CLIENT_ID:     z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_APP_ID:      z.string().optional(),
  FACEBOOK_APP_SECRET:  z.string().optional(),
});

const rawEnv = Object.fromEntries(
  Object.entries(process.env).map(([k, v]) => [k, v === '' ? undefined : v])
);
const parsed = EnvSchema.safeParse(rawEnv);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

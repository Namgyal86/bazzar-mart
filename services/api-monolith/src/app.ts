/**
 * Express application factory — Bazzar API Monolith.
 *
 * Single base URL: http://localhost:8100  (MONOLITH_URL env var)
 * All routes mounted at /api/v1/* — identical prefixes to the original
 * microservices so the frontend requires zero URL changes.
 *
 * Frontend BASE_URL: set NEXT_PUBLIC_API_BASE_URL=http://localhost:8100
 *   (or leave empty — Next.js rewrites proxy to this monolith automatically)
 *
 * Module → route prefix
 *  users        /api/v1/auth  /api/v1/users
 *  products     /api/v1/products  /api/v1/categories  /api/v1/banners
 *  orders       /api/v1/orders  /api/v1/coupons
 *  cart         /api/v1/cart
 *  payments     /api/v1/payments
 *  sellers      /api/v1/seller
 *  reviews      /api/v1/reviews
 *  referrals    /api/v1/referrals  /api/v1/admin/referrals
 *  support      /api/v1/support
 *  storefront   /api/v1/storefront
 *  search       /api/v1/search
 *  recommendations /api/v1/recommendations
 *  analytics    /api/v1/analytics
 *
 * Kept separate (not in monolith):
 *  delivery-service     /api/v1/delivery  → DELIVERY_SERVICE_URL (port 8013)
 *  notification-service /api/v1/notifications → NOTIFICATION_SERVICE_URL (port 8008)
 */
import express, { Application, Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { env } from './config/env';

import userRoutes            from './modules/users/user.routes';
import productRoutes         from './modules/products/product.routes';
import orderRoutes           from './modules/orders/order.routes';
import cartRoutes            from './modules/cart/cart.routes';
import paymentRoutes         from './modules/payments/payment.routes';
import sellerRoutes          from './modules/sellers/seller.routes';
import reviewRoutes          from './modules/reviews/review.routes';
import referralRoutes        from './modules/referrals/referral.routes';
import supportRoutes         from './modules/support/support.routes';
import storefrontRoutes      from './modules/storefront/storefront.routes';
import searchRoutes          from './modules/search/search.routes';
import recommendationRoutes  from './modules/recommendations/recommendation.routes';
import analyticsRoutes       from './modules/analytics/analytics.routes';
import uploadRoutes          from './modules/upload/upload.routes';

import { notFound, errorHandler } from './shared/middleware/error';

// ── DB readyState labels ───────────────────────────────────────────────────────
const DB_STATE_LABEL: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized',
};

// ── CORS ───────────────────────────────────────────────────────────────────────
// Allowed origins: WEB_URL from env + localhost:3000 for local dev.
// All origins permitted in development so curl / Postman work without friction.
const allowedOrigins = Array.from(new Set([env.WEB_URL, 'http://localhost:3000']));

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Requests with no Origin header (curl, server-to-server, same-origin) — always allow.
    if (!origin) { callback(null, true); return; }
    if (env.NODE_ENV === 'development' || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin "${origin}" is not allowed`));
    }
  },
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-role'],
  credentials:    true,
  maxAge:         86400, // preflight cache 24 h
};

export function createApp(): Application {
  const app = express();

  // ── Global middleware ──────────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions)); // explicit preflight handler for all routes
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Health endpoints ───────────────────────────────────────────────────────

  /** Basic liveness probe — load balancer / k8s uses this */
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status:  'ok',
      service: 'api-monolith',
      uptime:  process.uptime(),
      env:     env.NODE_ENV,
    });
  });

  /**
   * DB readiness probe.
   * Returns 200 when Mongoose readyState === 1 AND a ping succeeds.
   * Returns 500 with the exact error when the DB is unreachable.
   * Frontend / ops should call this to confirm the monolith is fully ready.
   */
  app.get('/health/db', async (_req: Request, res: Response) => {
    const state = mongoose.connection.readyState;
    const label = DB_STATE_LABEL[state] ?? 'unknown';

    if (state !== 1) {
      res.status(500).json({
        status: 'error',
        db: {
          readyState: state,
          label,
          error: `Mongoose connection is "${label}" (expected "connected")`,
        },
      });
      return;
    }

    // Actually ping the server — readyState can be 1 while the socket is broken
    try {
      const start = Date.now();
      await mongoose.connection.db!.command({ ping: 1 });
      res.json({
        status: 'ok',
        db: {
          readyState: state,
          label,
          host:       mongoose.connection.host,
          name:       mongoose.connection.name,
          pingMs:     Date.now() - start,
        },
      });
    } catch (err: unknown) {
      res.status(500).json({
        status: 'error',
        db: {
          readyState: state,
          label,
          host:  mongoose.connection.host,
          error: (err as Error).message,
          code:  (err as { code?: number }).code ?? null,
        },
      });
    }
  });

  /** Full system status — DB + Redis + uptime in one call */
  app.get('/health/full', async (_req: Request, res: Response) => {
    const dbState = mongoose.connection.readyState;
    let dbOk = dbState === 1;
    let dbPingMs: number | null = null;
    let dbError: string | null = null;

    if (dbOk) {
      try {
        const t = Date.now();
        await mongoose.connection.db!.command({ ping: 1 });
        dbPingMs = Date.now() - t;
      } catch (err: unknown) {
        dbOk    = false;
        dbError = (err as Error).message;
      }
    }

    const allOk = dbOk;
    res.status(allOk ? 200 : 503).json({
      status:  allOk ? 'ok' : 'degraded',
      service: 'api-monolith',
      uptime:  process.uptime(),
      env:     env.NODE_ENV,
      checks: {
        db: {
          ok:         dbOk,
          readyState: dbState,
          label:      DB_STATE_LABEL[dbState] ?? 'unknown',
          pingMs:     dbPingMs,
          ...(dbError ? { error: dbError } : {}),
        },
      },
    });
  });

  app.get('/api/v1', (_req: Request, res: Response) => {
    res.json({
      service:  'Bazzar API Monolith',
      baseUrl:  env.API_BASE_URL,
      version:  'v1',
      modules:  [
        'users', 'products', 'orders', 'cart', 'payments',
        'sellers', 'reviews', 'referrals', 'support', 'storefront',
        'search', 'recommendations', 'analytics',
      ],
      separate: ['delivery-service', 'notification-service'],
    });
  });

  // ── Module routes ──────────────────────────────────────────────────────────
  app.use('/api/v1', userRoutes);
  app.use('/api/v1', productRoutes);
  app.use('/api/v1', orderRoutes);
  app.use('/api/v1', cartRoutes);
  app.use('/api/v1', paymentRoutes);
  app.use('/api/v1', sellerRoutes);
  app.use('/api/v1', reviewRoutes);
  app.use('/api/v1', referralRoutes);
  app.use('/api/v1', supportRoutes);
  app.use('/api/v1', storefrontRoutes);
  app.use('/api/v1', searchRoutes);
  app.use('/api/v1', recommendationRoutes);
  app.use('/api/v1', analyticsRoutes);
  app.use('/api/v1', uploadRoutes);

  // ── Error handling ─────────────────────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

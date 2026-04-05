/**
 * Express application factory — Bazzar API Monolith.
 *
 * All routes mounted at /api/v1/* — identical prefixes to the original
 * microservices so the frontend requires zero URL changes.
 *
 * Module → original port → route prefix
 *  products    8002  /api/v1/products  /categories  /banners
 *  orders      8004  /api/v1/orders    /coupons
 *  cart        8003  /api/v1/cart
 *  payments    8005  /api/v1/payments
 *  sellers     8007  /api/v1/seller
 *  reviews     8006  /api/v1/reviews   /products/:id/reviews
 *  referrals   8012  /api/v1/referrals  /admin/referrals
 *  support     8015  /api/v1/support
 *  storefront  8011  /api/v1/storefront
 */
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import userRoutes       from './modules/users/user.routes';
import productRoutes    from './modules/products/product.routes';
import orderRoutes      from './modules/orders/order.routes';
import cartRoutes       from './modules/cart/cart.routes';
import paymentRoutes    from './modules/payments/payment.routes';
import sellerRoutes     from './modules/sellers/seller.routes';
import reviewRoutes     from './modules/reviews/review.routes';
import referralRoutes        from './modules/referrals/referral.routes';
import supportRoutes         from './modules/support/support.routes';
import storefrontRoutes      from './modules/storefront/storefront.routes';
import searchRoutes          from './modules/search/search.routes';
import recommendationRoutes  from './modules/recommendations/recommendation.routes';
import analyticsRoutes       from './modules/analytics/analytics.routes';

import { notFound, errorHandler } from './shared/middleware/error';

export function createApp(): Application {
  const app = express();

  // ── Global middleware ──────────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Health ─────────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'api-monolith', uptime: process.uptime() });
  });

  app.get('/api/v1', (_req, res) => {
    res.json({
      service: 'Bazzar API Monolith',
      modules: ['users', 'products', 'orders', 'cart', 'payments', 'sellers', 'reviews', 'referrals', 'support', 'storefront', 'search', 'recommendations', 'analytics'],
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

  // ── Error handling ─────────────────────────────────────────────────────────
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

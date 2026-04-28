/**
 * Server entry point — Bazzar API Monolith.
 *
 * Boot order:
 *  1.  Load + validate env (process exits on missing required vars)
 *  2.  Connect MongoDB (single shared connection for all modules)
 *  3.  Connect Redis (cart module)
 *  4.  Connect Kafka producer (shared across all modules)
 *  5.  Register internal EventEmitter handlers (replaces Kafka consumers between merged services)
 *  6.  Start Kafka consumers (events from kept microservices: delivery-service, user-service)
 *  7.  Seed default data (categories, banners)
 *  8.  Start HTTP server
 */
import dotenv from 'dotenv';

dotenv.config({
  path: '../../.env',
});

import { env }                                    from './config/env';
import { connectDB }                              from './config/db';
import { connectRedis }                           from './config/redis';
import { connectProducer, disconnectProducer }    from './kafka/producer';
import { startConsumers, stopConsumers }          from './kafka/consumers';

// Module event handlers (each module registers its internalBus subscriptions)
import { registerOrderEventHandlers }          from './modules/orders/order.controller';
import { registerSellerEventHandlers }         from './modules/sellers/seller.controller';
import { registerReviewEventHandlers }         from './modules/reviews/review.controller';
import { registerReferralEventHandlers }       from './modules/referrals/referral.controller';
import { registerRecommendationEventHandlers } from './modules/recommendations/recommendation.controller';
import { registerAnalyticsEventHandlers }      from './modules/analytics/analytics.controller';

// Seed helpers

// Background jobs
import { startOrderScheduler } from './modules/orders/order.scheduler';

import { createApp } from './app';

async function bootstrap(): Promise<void> {
  // 1. MongoDB
  await connectDB();

  // 2. Redis
  try {
    await connectRedis();
  } catch (err) {
    console.warn('⚠️  Redis unavailable — cart module degraded:', (err as Error).message);
  }

  // 3. Kafka producer
  try {
    await connectProducer();
  } catch (err) {
    console.warn('⚠️  Kafka producer unavailable — async events will be dropped:', (err as Error).message);
  }

  // 4. Internal event handlers (replaces inter-service Kafka consumers)
  registerOrderEventHandlers();          // payment:success/failed → order status
  registerSellerEventHandlers();         // payment:success         → seller balance credit
  registerReviewEventHandlers();         // review:posted           → product rating update
  registerReferralEventHandlers();       // order:created           → referral wallet credit
  registerRecommendationEventHandlers(); // review:posted + order:created + product:created → interaction tracking
  registerAnalyticsEventHandlers();      // order:created + payment:success + user:registered + delivery:completed → metrics

  // 5. External Kafka consumers
  try {
    await startConsumers();
  } catch (err) {
    console.warn('⚠️  Kafka consumers unavailable:', (err as Error).message);
  }

  // 7. Background jobs
  startOrderScheduler();

  // 8. HTTP server
  const app    = createApp();
  const port   = env.PORT;
  const server = app.listen(port, () => {
    console.log(`\n🚀  Bazzar API Monolith  →  http://localhost:${port}`);
    console.log(`    Health              →  http://localhost:${port}/health\n`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} — shutting down…`);
    server.close(async () => {
      await stopConsumers();
      await disconnectProducer();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

bootstrap().catch(err => {
  console.error('❌  Fatal startup error:', err);
  process.exit(1);
});

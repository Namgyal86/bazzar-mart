/**
 * Cart module — Phase 2 migration stub.
 *
 * Migration steps:
 *  1. Copy cart-service/src/services/cart.service.ts here (Redis-backed).
 *  2. Copy cart-service/src/controllers/cart.controller.ts here.
 *  3. Wire routes at /api/v1/cart in app.ts.
 *  4. Kafka publishing (cart.updated, cart.cleared) → use shared producer.ts.
 *  5. Remove inter-service pattern: cart already has no HTTP deps, just Redis.
 *
 * Port to migrate from: 8003
 */
export {};

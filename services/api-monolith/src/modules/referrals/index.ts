/**
 * Referrals module — Phase 3 migration stub.
 *
 * Currently referral-service consumes Kafka:
 *   user.registered  → record pending referral
 *   order.created    → credit wallets on first order
 *
 * AFTER migration:
 *   - user.registered: user-service remains separate — still consume via Kafka
 *     consumer (already wired in kafka/consumers/index.ts as USER_REGISTERED stub)
 *   - order.created: orders module emits internalBus ORDER_CREATED →
 *     referrals module listens and credits wallets (no Kafka needed internally)
 *
 * Port to migrate from: 8012
 */
export {};

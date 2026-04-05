/**
 * Referrals module — migration COMPLETE.
 *
 * Events wired:
 *   internalBus ORDER_CREATED → credit wallets on referred user's first order
 *   auth.controller calls handleUserRegistered() directly on registration
 *   Kafka: no consumers needed (user-service registration handled in-process)
 */
export {};

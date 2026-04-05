/**
 * Payments module — Phase 2 migration stub.
 *
 * Migration steps:
 *  1. Copy payment-service/src/models/payment.model.ts.
 *  2. Copy payment-service/src/services/khalti.service.ts + esewa.service.ts.
 *  3. Copy payment-service/src/controllers/payment.controller.ts.
 *  4. After successful payment verification, instead of publishing ONLY to Kafka:
 *       - emit internalBus PAYMENT_SUCCESS  → orders module + sellers module
 *       - publish Kafka payment.success     → analytics-service + notification-service
 *  5. Remove: payment-service's own Kafka consumer (payment.success → order update)
 *     because that is now handled by the internal EventEmitter in orders module.
 *
 * Port to migrate from: 8005
 */
export {};

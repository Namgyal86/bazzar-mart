/**
 * Sellers module — migration COMPLETE.
 *
 * All inter-service HTTP calls replaced with direct Mongoose model imports:
 *   Product → ../products/models/product.model
 *   Order   → ../orders/models/order.model
 *   Review  → ../reviews/models/review.model
 *
 * Kafka:
 *   REMOVED consumer: payment.success (now via internalBus PAYMENT_SUCCESS)
 *   KEPT    publisher: seller.approved → notification-service
 */
export {};

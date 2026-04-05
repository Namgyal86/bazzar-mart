/**
 * Payments module — migration COMPLETE.
 *
 * On successful payment verification:
 *   internalBus PAYMENT_SUCCESS → orders module (status → CONFIRMED) + sellers module (balance credit)
 *   Kafka payment.success       → analytics-service + notification-service (remain separate)
 */
export {};

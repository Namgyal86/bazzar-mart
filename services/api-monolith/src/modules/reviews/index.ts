/**
 * Reviews module — migration COMPLETE.
 *
 * After posting a review:
 *   1. internalBus REVIEW_POSTED → products module recalculates rating (in-process)
 *   2. Kafka review.posted       → recommendation-service (remains separate)
 */
export {};

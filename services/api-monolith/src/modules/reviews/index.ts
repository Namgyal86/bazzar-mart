/**
 * Reviews module — Phase 3 migration stub.
 *
 * After posting a review:
 *  BEFORE: Kafka review.posted → recommendation-service (kept separate, still needed)
 *  AFTER:
 *    1. emit internalBus REVIEW_POSTED → products module updateProductRating() (direct function)
 *    2. publish Kafka review.posted → recommendation-service (still separate)
 *
 * Import to use for #1:
 *    import { updateProductRating } from '../products/product.controller';
 *
 * Port to migrate from: 8006
 */
export {};

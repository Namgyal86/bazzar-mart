/**
 * Sellers module — Phase 3 migration stub.
 *
 * Key inter-service HTTP calls to replace with direct function calls:
 *
 *  BEFORE (HTTP):
 *    GET http://localhost:8002/api/v1/products?sellerId=...
 *    GET http://localhost:8004/api/v1/orders/all?sellerId=...
 *    GET http://localhost:8006/api/v1/reviews/admin/list?sellerId=...
 *
 *  AFTER (direct imports):
 *    import { Product } from '../products/models/product.model';
 *    import { Order }   from '../orders/models/order.model';
 *    import { Review }  from '../reviews/models/review.model';
 *    // Query directly — same process, no network hop
 *
 *  Kafka:
 *    - STOP consuming payment.success via Kafka (now via internalBus PAYMENT_SUCCESS)
 *    - KEEP publishing seller.approved to Kafka (notification-service consumes it)
 *
 * Port to migrate from: 8007
 */
export {};

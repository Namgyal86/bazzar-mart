/**
 * Typed in-process EventEmitter — replaces all inter-service HTTP calls
 * and internal Kafka consumer loops between modules merged into the monolith.
 *
 * Rules:
 *  • Producers call `internalBus.emit(EVENT, payload)` — fire-and-forget.
 *  • Consumers call `internalBus.on(EVENT, handler)` in their module's
 *    `registerXxxEventHandlers()` function, called once at server startup.
 *  • Handlers must never throw synchronously; always wrap with try/catch.
 *  • These events stay in-process — NOT forwarded to Kafka automatically.
 *    Kafka events for kept microservices are published separately.
 *
 * Events still forwarded to Kafka (external kept microservices):
 *   order.created         → analytics-service, recommendation-service
 *   order.status_updated  → notification-service
 *   payment.success       → analytics-service, notification-service
 *   payment.failed        → notification-service
 *   review.posted         → recommendation-service
 *   cart.updated          → (future recommendation)
 *   seller.approved       → notification-service
 */
import { EventEmitter } from 'events';

// ── Payload types ─────────────────────────────────────────────────────────────

export interface PaymentSuccessPayload {
  paymentId:     string;
  orderId:       string;
  userId:        string;
  sellerId:      string;
  amount:        number;
  gateway:       string;
  transactionId?: string;
}

export interface PaymentFailedPayload {
  paymentId: string;
  orderId:   string;
  userId:    string;
  amount:    number;
  gateway:   string;
}

export interface OrderCreatedPayload {
  orderId:     string;
  userId:      string;
  total:       number;
  couponCode?: string;
}

export interface ReviewPostedPayload {
  reviewId:  string;
  productId: string;
  userId:    string;
  sellerId:  string;
  rating:    number;
}

export interface DeliveryCompletedPayload {
  orderId:    string;
  deliveryId: string;
}

export interface UserRegisteredPayload {
  userId:        string;
  referredBy?:   string;
  referralCode?: string;
}

export interface ProductCreatedPayload {
  productId: string;
  sellerId:  string;
  name:      string;
  category?: string;
}

// ── Event name constants ──────────────────────────────────────────────────────

export const EVENTS = {
  PAYMENT_SUCCESS:    'payment:success',
  PAYMENT_FAILED:     'payment:failed',
  ORDER_CREATED:      'order:created',
  REVIEW_POSTED:      'review:posted',
  DELIVERY_COMPLETED: 'delivery:completed',
  USER_REGISTERED:    'user:registered',
  PRODUCT_CREATED:    'product:created',
} as const;

// ── Typed emitter ─────────────────────────────────────────────────────────────

type EventMap = {
  [EVENTS.PAYMENT_SUCCESS]:    (p: PaymentSuccessPayload)    => void;
  [EVENTS.PAYMENT_FAILED]:     (p: PaymentFailedPayload)     => void;
  [EVENTS.ORDER_CREATED]:      (p: OrderCreatedPayload)      => void;
  [EVENTS.REVIEW_POSTED]:      (p: ReviewPostedPayload)      => void;
  [EVENTS.DELIVERY_COMPLETED]: (p: DeliveryCompletedPayload) => void;
  [EVENTS.USER_REGISTERED]:    (p: UserRegisteredPayload)    => void;
  [EVENTS.PRODUCT_CREATED]:    (p: ProductCreatedPayload)    => void;
};

class InternalBus extends EventEmitter {
  emit<K extends keyof EventMap>(event: K, payload: Parameters<EventMap[K]>[0]): boolean {
    return super.emit(event as string, payload);
  }
  on<K extends keyof EventMap>(event: K, listener: EventMap[K]): this {
    return super.on(event as string, listener as (...args: unknown[]) => void);
  }
  once<K extends keyof EventMap>(event: K, listener: EventMap[K]): this {
    return super.once(event as string, listener as (...args: unknown[]) => void);
  }
}

export const internalBus = new InternalBus();
internalBus.setMaxListeners(50);

// ============================================================
// Standard API Response Envelope
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============================================================
// JWT Payload
// ============================================================

export type UserRole = 'BUYER' | 'SELLER' | 'ADMIN' | 'DELIVERY';

export interface JwtPayload {
  sub: string;          // userId
  role: UserRole;
  sellerId?: string;
  deliveryAgentId?: string;
  iat: number;
  exp: number;
}

// ============================================================
// Kafka Event Types
// ============================================================

export interface KafkaEventEnvelope<T = unknown> {
  eventId: string;
  eventType: string;
  timestamp: string;
  payload: T;
}

// ---- User Events ----
export interface UserRegisteredPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  referralCode: string;
  referredBy?: string;
}

// ---- Product Events ----
export interface ProductCreatedPayload {
  productId: string;
  sellerId: string;
  name: string;
  categoryId: string;
  basePrice: number;
  stock: number;
}

export interface InventoryUpdatedPayload {
  productId: string;
  sellerId: string;
  newStock: number;
  previousStock: number;
}

// ---- Order Events ----
export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export interface OrderCreatedPayload {
  orderId: string;
  userId: string;
  sellerId: string;
  totalAmount: number;
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface OrderStatusChangedPayload {
  orderId: string;
  userId: string;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  note?: string;
}

export interface OrderConfirmedPayload {
  orderId: string;
  userId: string;
  sellerId: string;
  deliveryAddress: {
    addressLine1: string;
    city: string;
    country: string;
    postalCode: string;
    coordinates?: { lat: number; lng: number };
  };
  pickupAddress: {
    addressLine1: string;
    city: string;
    country: string;
    postalCode: string;
    coordinates?: { lat: number; lng: number };
  };
}

// ---- Payment Events ----
export type PaymentMethod = 'KHALTI' | 'ESEWA' | 'FONEPAY' | 'STRIPE' | 'RAZORPAY' | 'COD';
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export interface PaymentSuccessPayload {
  paymentId: string;
  orderId: string;
  userId: string;
  sellerId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  gatewayPaymentId: string;
}

export interface PaymentFailedPayload {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  reason: string;
}

export interface PaymentRefundedPayload {
  paymentId: string;
  refundId: string;
  orderId: string;
  amount: number;
  reason: string;
}

// ---- Review Events ----
export interface ReviewPostedPayload {
  reviewId: string;
  productId: string;
  userId: string;
  sellerId: string;
  rating: number;
}

// ---- Delivery Events ----
export type DeliveryStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export interface DeliveryAssignedPayload {
  taskId: string;
  orderId: string;
  buyerId: string;
  agentId: string;
  agentName: string;
  agentPhone: string;
  estimatedDuration: number;
}

export interface DeliveryStatusChangedPayload {
  taskId: string;
  orderId: string;
  buyerId: string;
  agentId: string;
  status: DeliveryStatus;
  timestamp: string;
}

export interface DeliveryCompletedPayload {
  taskId: string;
  orderId: string;
  buyerId: string;
  agentId: string;
  deliveredAt: string;
  proofOfDeliveryUrl?: string;
  agentEarning: number;
}

// ---- Referral Events ----
export interface ReferralRewardIssuedPayload {
  referralId: string;
  referrerId: string;
  refereeId: string;
  referrerAmount: number;
  refereeAmount: number;
  currency: string;
}

// ---- Seller Events ----
export interface SellerApprovedPayload {
  sellerId: string;
  userId: string;
  businessName: string;
  email: string;
}

export interface PayoutProcessedPayload {
  payoutId: string;
  sellerId: string;
  amount: number;
  periodStart: string;
  periodEnd: string;
  transactionRef: string;
}

// ---- Storefront Events ----
export interface StorefrontPublishedPayload {
  designId: string;
  sellerId: string;
  sellerSlug: string;
  publishedUrl: string;
  version: number;
}

// ============================================================
// Kafka Topic Constants
// ============================================================

export const KafkaTopics = {
  USER_REGISTERED: 'user.registered',
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  INVENTORY_UPDATED: 'inventory.updated',
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_STATUS_CHANGED: 'order.status_changed',
  ORDER_CANCELLED: 'order.cancelled',
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  REVIEW_POSTED: 'review.posted',
  DELIVERY_ASSIGNED: 'delivery.assigned',
  DELIVERY_PICKED_UP: 'delivery.picked_up',
  DELIVERY_COMPLETED: 'delivery.completed',
  DELIVERY_FAILED: 'delivery.failed',
  REFERRAL_REWARD_ISSUED: 'referral.reward_issued',
  SELLER_APPROVED: 'seller.approved',
  PAYOUT_PROCESSED: 'payout.processed',
  STOREFRONT_PUBLISHED: 'storefront.published',
} as const;

export type KafkaTopic = (typeof KafkaTopics)[keyof typeof KafkaTopics];

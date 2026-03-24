import mongoose, { Document, Schema } from 'mongoose';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' | 'RETURN_REQUESTED';

interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  sellerId: string;
  sellerName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  province: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  status: OrderStatus;
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  couponCode?: string;
  notes?: string;
  trackingNumber?: string;
  statusHistory: Array<{ status: string; timestamp: Date; note?: string }>;
  estimatedDelivery?: Date;
}

const OrderSchema = new Schema<IOrder>({
  orderNumber:     { type: String, unique: true },
  userId:          { type: String, required: true, index: true },
  items:           { type: Schema.Types.Mixed, required: true },
  shippingAddress: { type: Schema.Types.Mixed, required: true },
  paymentMethod:   { type: String, required: true },
  paymentStatus:   { type: String, enum: ['PENDING','PAID','FAILED','REFUNDED'], default: 'PENDING' },
  status:          { type: String, enum: ['PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED','REFUNDED','RETURN_REQUESTED'], default: 'PENDING' },
  subtotal:        { type: Number, required: true },
  shippingFee:     { type: Number, default: 0 },
  discount:        { type: Number, default: 0 },
  total:           { type: Number, required: true },
  couponCode:      { type: String },
  notes:           { type: String },
  trackingNumber:  { type: String },
  statusHistory:   { type: Schema.Types.Mixed, default: [] },
  estimatedDelivery: { type: Date },
}, { timestamps: true });

OrderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    this.orderNumber = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 5).toUpperCase();
  }
  next();
});

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ orderNumber: 1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);

import mongoose, { Document, Schema } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrder: number;
  maxDiscount: number;
  usageLimit: number;
  usageCount: number;
  validUntil?: Date;
  isActive: boolean;
}

const CouponSchema = new Schema<ICoupon>({
  code:        { type: String, required: true, unique: true, uppercase: true },
  type:        { type: String, enum: ['PERCENTAGE', 'FIXED'], default: 'PERCENTAGE' },
  value:       { type: Number, required: true },
  minOrder:    { type: Number, default: 0 },
  maxDiscount: { type: Number, default: 0 },  // 0 = unlimited
  usageLimit:  { type: Number, default: 100 },
  usageCount:  { type: Number, default: 0 },
  validUntil:  { type: Date },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

export const Coupon = mongoose.model<ICoupon>('Coupon', CouponSchema);

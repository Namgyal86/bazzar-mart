import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  productId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  body: string;
  images: string[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  isActive: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  productName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>({
  productId:         { type: String, required: true, index: true },
  userId:            { type: String, required: true },
  userName:          { type: String, required: true },
  userAvatar:        { type: String },
  rating:            { type: Number, required: true, min: 1, max: 5 },
  title:             { type: String, required: true },
  body:              { type: String, required: true },
  images:            { type: [String], default: [] },
  isVerifiedPurchase:{ type: Boolean, default: false },
  helpfulCount:      { type: Number, default: 0 },
  isActive:          { type: Boolean, default: true },
  status:            { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'APPROVED' },
  productName:       { type: String },
}, { timestamps: true });

ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);

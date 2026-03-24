import mongoose, { Document, Schema } from 'mongoose';
export interface ISeller extends Document {
  userId: string;
  storeName: string;
  storeDescription?: string;
  logo?: string;
  banner?: string;
  category: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  commissionRate: number;
  balance: number;
  totalEarnings: number;
  totalOrders: number;
  rating: number;
  reviewCount: number;
  phone: string;
  email: string;
  panNumber?: string;
  bankDetails?: { bankName: string; accountNumber: string; accountName: string };
  notificationPreferences?: Record<string, boolean>;
}
const SellerSchema = new Schema<ISeller>({
  userId:                    { type: String, required: true, unique: true },
  storeName:                 { type: String, required: true },
  storeDescription:          { type: String },
  logo:                      { type: String },
  banner:                    { type: String },
  category:                  { type: String, required: true },
  status:                    { type: String, enum: ['PENDING','ACTIVE','SUSPENDED'], default: 'PENDING' },
  commissionRate:            { type: Number, default: 10 },
  balance:                   { type: Number, default: 0 },
  totalEarnings:             { type: Number, default: 0 },
  totalOrders:               { type: Number, default: 0 },
  rating:                    { type: Number, default: 0 },
  reviewCount:               { type: Number, default: 0 },
  phone:                     { type: String, required: true },
  email:                     { type: String, required: true },
  panNumber:                 { type: String },
  bankDetails:               { type: Schema.Types.Mixed },
  notificationPreferences:   { type: Schema.Types.Mixed },
}, { timestamps: true });
export const Seller = mongoose.model<ISeller>('Seller', SellerSchema);

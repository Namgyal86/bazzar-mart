import mongoose, { Document, Schema } from 'mongoose';

export interface IReferral extends Document {
  referrerId:   string;
  referredId:   string;
  referralCode: string;
  status:       'PENDING' | 'COMPLETED' | 'PAID' | 'REVOKED';
  bonusAmount:  number;
  completedAt?: Date;
  createdAt:    Date;
}

const ReferralSchema = new Schema<IReferral>({
  referrerId:   { type: String, required: true },
  referredId:   { type: String, required: true, unique: true },
  referralCode: { type: String, required: true },
  status:       { type: String, enum: ['PENDING', 'COMPLETED', 'PAID', 'REVOKED'], default: 'PENDING' },
  bonusAmount:  { type: Number, default: 200 },
  completedAt:  { type: Date },
}, { timestamps: true });

ReferralSchema.index({ referrerId: 1 });

export const Referral = mongoose.models.Referral as mongoose.Model<IReferral>
  ?? mongoose.model<IReferral>('Referral', ReferralSchema);

// ── Wallet ────────────────────────────────────────────────────────────────────

interface WalletTransaction {
  type:        'CREDIT' | 'DEBIT';
  amount:      number;
  description: string;
  referralId?: string;
  createdAt:   Date;
}

export interface IWallet extends Document {
  userId:       string;
  balance:      number;
  transactions: WalletTransaction[];
  updatedAt:    Date;
}

const WalletSchema = new Schema<IWallet>({
  userId:  { type: String, required: true, unique: true },
  balance: { type: Number, default: 0 },
  transactions: [{
    type:        { type: String, enum: ['CREDIT', 'DEBIT'] },
    amount:      Number,
    description: String,
    referralId:  String,
    createdAt:   { type: Date, default: Date.now },
  }],
  updatedAt: { type: Date, default: Date.now },
});

export const Wallet = mongoose.models.Wallet as mongoose.Model<IWallet>
  ?? mongoose.model<IWallet>('Wallet', WalletSchema);

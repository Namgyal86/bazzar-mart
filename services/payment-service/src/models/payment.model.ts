import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  gateway: 'KHALTI' | 'ESEWA' | 'FONEPAY' | 'STRIPE' | 'COD';
  status: 'PENDING' | 'INITIATED' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  transactionId?: string;
  gatewayResponse?: any;
  refundReason?: string;
  pidx?: string;
}

const PaymentSchema = new Schema<IPayment>({
  orderId:         { type: String, required: true, index: true },
  userId:          { type: String, required: true },
  amount:          { type: Number, required: true },
  currency:        { type: String, default: 'NPR' },
  gateway:         { type: String, enum: ['KHALTI','ESEWA','FONEPAY','STRIPE','COD'], required: true },
  status:          { type: String, enum: ['PENDING','INITIATED','SUCCESS','FAILED','REFUNDED'], default: 'PENDING' },
  transactionId:   { type: String },
  gatewayResponse: { type: Schema.Types.Mixed },
  refundReason:    { type: String },
  pidx:            { type: String },
}, { timestamps: true });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

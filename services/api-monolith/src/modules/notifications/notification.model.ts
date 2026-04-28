import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  userId:    string;
  title:     string;
  message:   string;
  type:      'ORDER' | 'ORDER_STATUS' | 'PAYMENT' | 'PROMO' | 'PROMOTION' | 'SYSTEM' | 'DELIVERY';
  isRead:    boolean;
  data?:     any;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId:  { type: String, required: true, index: true },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  type:    { type: String, enum: ['ORDER','ORDER_STATUS','PAYMENT','PROMO','PROMOTION','SYSTEM','DELIVERY'], default: 'SYSTEM' },
  isRead:  { type: Boolean, default: false },
  data:    { type: Schema.Types.Mixed },
}, { timestamps: true });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

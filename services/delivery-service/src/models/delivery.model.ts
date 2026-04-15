import mongoose, { Document, Schema } from 'mongoose';

export interface IDelivery extends Document {
  orderId:      string;
  customer:     string;
  address:      string;
  phone:        string;
  status:       'PENDING' | 'IN_TRANSIT' | 'DELIVERED';
  driver:       string | null;
  driverId:     string | null;
  total:        number;
  buyerId:      string;
  completedAt?: Date;
  agentEarning?: number;
  createdAt:    Date;
  updatedAt:    Date;
}

const DeliverySchema = new Schema<IDelivery>({
  orderId:      { type: String, required: true, unique: true },
  customer:     { type: String, default: 'Customer' },
  address:      { type: String, default: '' },
  phone:        { type: String, default: '' },
  status:       { type: String, enum: ['PENDING', 'IN_TRANSIT', 'DELIVERED'], default: 'PENDING' },
  driver:       { type: String, default: null },
  driverId:     { type: String, default: null },
  total:        { type: Number, default: 0 },
  buyerId:      { type: String, default: '' },
  completedAt:  { type: Date },
  agentEarning: { type: Number },
}, { timestamps: true });

DeliverySchema.index({ status: 1 });
DeliverySchema.index({ driverId: 1 });

/**
 * Build the Delivery model against the provided Mongoose connection.
 * Called from index.ts after mongoose.connect() resolves.
 */
export function createDeliveryModel(conn: mongoose.Connection): mongoose.Model<IDelivery> {
  return conn.models.Delivery as mongoose.Model<IDelivery>
    ?? conn.model<IDelivery>('Delivery', DeliverySchema);
}

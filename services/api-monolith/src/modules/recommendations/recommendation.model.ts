/**
 * Recommendation module models.
 *
 * View — tracks which products a user has viewed (for personalisation).
 * Mongoose guard pattern prevents duplicate registration on hot-reload.
 */
import mongoose, { Document, Schema } from 'mongoose';

export interface IView extends Document {
  userId:       string;
  productId:    string;
  categorySlug?: string;
  viewedAt:     Date;
}

const ViewSchema = new Schema<IView>({
  userId:       { type: String, required: true },
  productId:    { type: String, required: true },
  categorySlug: { type: String },
  viewedAt:     { type: Date, default: () => new Date() },
});
ViewSchema.index({ userId: 1, viewedAt: -1 });
ViewSchema.index({ productId: 1 });
ViewSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const View = (mongoose.models.View as mongoose.Model<IView>) ?? mongoose.model<IView>('View', ViewSchema);

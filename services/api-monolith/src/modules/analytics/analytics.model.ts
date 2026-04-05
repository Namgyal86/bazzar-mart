/**
 * Analytics module models.
 *
 * Event   — platform-level event log (PAGE_VIEW, PRODUCT_VIEW, ADD_TO_CART, PURCHASE, SEARCH).
 * Settings — key-value admin configuration store, keyed by `section`.
 *
 * Mongoose guard pattern prevents duplicate registration on hot-reload.
 */
import mongoose, { Document, Schema } from 'mongoose';

// ── Event ─────────────────────────────────────────────────────────────────────

export interface IEvent extends Document {
  type:         string;
  userId?:      string;
  sessionId?:   string;
  productId?:   string;
  categorySlug?: string;
  searchQuery?:  string;
  metadata?:    Record<string, unknown>;
  createdAt:    Date;
}

const EventSchema = new Schema<IEvent>({
  type:         { type: String, required: true },
  userId:       { type: String },
  sessionId:    { type: String },
  productId:    { type: String },
  categorySlug: { type: String },
  searchQuery:  { type: String },
  metadata:     { type: Schema.Types.Mixed },
  createdAt:    { type: Date, default: () => new Date() },
});
EventSchema.index({ type: 1, createdAt: -1 });
EventSchema.index({ userId: 1, createdAt: -1 });

export const AnalyticsEvent = (mongoose.models.AnalyticsEvent as mongoose.Model<IEvent>) ??
  mongoose.model<IEvent>('AnalyticsEvent', EventSchema);

// ── Settings ──────────────────────────────────────────────────────────────────

export interface ISettings extends Document {
  section:   string;
  data:      Record<string, unknown>;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>({
  section:   { type: String, required: true, unique: true },
  data:      { type: Schema.Types.Mixed, default: {} },
  updatedAt: { type: Date, default: () => new Date() },
});

export const Settings = (mongoose.models.PlatformSettings as mongoose.Model<ISettings>) ??
  mongoose.model<ISettings>('PlatformSettings', SettingsSchema);

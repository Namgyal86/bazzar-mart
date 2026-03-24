import mongoose, { Document, Schema } from 'mongoose';

interface IVariant {
  name: string;
  options: Array<{ value: string; stock: number; priceModifier: number }>;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  price: number;
  salePrice?: number;
  images: string[];
  category: string;
  subCategory?: string;
  sellerId: string;
  sellerName: string;
  brand?: string;
  sku: string;
  stock: number;
  variants: IVariant[];
  rating: number;
  reviewCount: number;
  soldCount: number;
  isActive: boolean;
  isFeatured: boolean;
  tags: string[];
  specifications: Record<string, string>;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
}

const ProductSchema = new Schema<IProduct>({
  name:             { type: String, required: true, trim: true },
  slug:             { type: String, unique: true },
  description:      { type: String, required: true },
  shortDescription: { type: String },
  price:            { type: Number, required: true, min: 0 },
  salePrice:        { type: Number, min: 0 },
  images:           { type: [String], default: [] },
  category:         { type: String, required: true },
  subCategory:      { type: String },
  sellerId:         { type: String, required: true, index: true },
  sellerName:       { type: String, required: true },
  brand:            { type: String },
  sku:              { type: String, unique: true },
  stock:            { type: Number, default: 0, min: 0 },
  variants:         { type: Schema.Types.Mixed, default: [] },
  rating:           { type: Number, default: 0, min: 0, max: 5 },
  reviewCount:      { type: Number, default: 0 },
  soldCount:        { type: Number, default: 0 },
  isActive:         { type: Boolean, default: true },
  isFeatured:       { type: Boolean, default: false },
  tags:             { type: [String], default: [] },
  specifications:   { type: Map, of: String, default: {} },
  weight:           { type: Number },
  dimensions:       { type: Object },
}, { timestamps: true });

ProductSchema.pre('save', function (next) {
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  if (!this.sku) {
    this.sku = 'SKU-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }
  next();
});

ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ sellerId: 1, isActive: 1 });
ProductSchema.index({ isFeatured: 1, isActive: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);

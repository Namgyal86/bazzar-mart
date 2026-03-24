import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentCategory?: string;
  isActive: boolean;
  sortOrder: number;
}

const CategorySchema = new Schema<ICategory>({
  name:           { type: String, required: true, trim: true },
  slug:           { type: String, required: true, unique: true, lowercase: true },
  description:    { type: String },
  image:          { type: String },
  parentCategory: { type: String },
  isActive:       { type: Boolean, default: true },
  sortOrder:      { type: Number, default: 0 },
}, { timestamps: true });

CategorySchema.index({ slug: 1 });

export const Category = mongoose.model<ICategory>('Category', CategorySchema);

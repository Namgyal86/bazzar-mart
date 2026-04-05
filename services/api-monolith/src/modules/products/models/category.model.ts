import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentCategory?: string;
  isActive: boolean;
  showInNav: boolean;
  sortOrder: number;
}

const CategorySchema = new Schema<ICategory>({
  name:           { type: String, required: true, trim: true },
  slug:           { type: String, required: true, unique: true, lowercase: true },
  description:    { type: String },
  image:          { type: String },
  parentCategory: { type: String },
  isActive:       { type: Boolean, default: true },
  showInNav:      { type: Boolean, default: true },
  sortOrder:      { type: Number, default: 0 },
}, { timestamps: true });

export const Category = mongoose.models.Category as mongoose.Model<ICategory>
  ?? mongoose.model<ICategory>('Category', CategorySchema);

export async function seedCategories(): Promise<void> {
  const count = await Category.countDocuments();
  if (count > 0) return;
  const defaults = [
    { name: 'Electronics', slug: 'electronics', image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=700&q=80', sortOrder: 1 },
    { name: 'Fashion',     slug: 'fashion',     image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=500&q=80', sortOrder: 2 },
    { name: 'Sports',      slug: 'sports',      image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=500&q=80', sortOrder: 3 },
    { name: 'Home Living', slug: 'home-living', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&q=80', sortOrder: 4 },
    { name: 'Beauty',      slug: 'beauty',      image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&q=80', sortOrder: 5 },
    { name: 'Grocery',     slug: 'grocery',     image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',        sortOrder: 6 },
    { name: 'Books',       slug: 'books',       image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400',     sortOrder: 7 },
  ];
  await Category.insertMany(defaults);
  console.log('✅ Default categories seeded');
}

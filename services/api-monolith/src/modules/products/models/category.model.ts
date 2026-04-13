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

const GROCERY_CATEGORIES = [
  { name: 'Fruits & Vegetables', slug: 'fruits-vegetables', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=700&q=80',  sortOrder: 1 },
  { name: 'Dairy & Eggs',        slug: 'dairy-eggs',        image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=700&q=80',  sortOrder: 2 },
  { name: 'Grains & Pulses',     slug: 'grains-pulses',     image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=700&q=80', sortOrder: 3 },
  { name: 'Meat & Seafood',      slug: 'meat-seafood',      image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=700&q=80', sortOrder: 4 },
  { name: 'Snacks & Beverages',  slug: 'snacks-beverages',  image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=700&q=80',  sortOrder: 5 },
  { name: 'Spices & Condiments', slug: 'spices-condiments', image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=700&q=80', sortOrder: 6 },
  { name: 'Personal Care',       slug: 'personal-care',     image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=700&q=80', sortOrder: 7 },
  { name: 'Household Items',     slug: 'household-items',   image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80',  sortOrder: 8 },
  { name: 'Frozen Foods',        slug: 'frozen-foods',      image: 'https://images.unsplash.com/photo-1634120052-d28c60d24c02?w=700&q=80',  sortOrder: 9 },
  { name: 'Bakery & Bread',      slug: 'bakery-bread',      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=700&q=80', sortOrder: 10 },
];

const NON_GROCERY_SLUGS = ['electronics', 'fashion', 'sports', 'home-living', 'beauty', 'books', 'grocery'];

export async function seedCategories(): Promise<void> {
  // Remove legacy non-grocery categories if they exist
  await Category.deleteMany({ slug: { $in: NON_GROCERY_SLUGS } });

  // Upsert grocery categories so re-runs are idempotent
  for (const cat of GROCERY_CATEGORIES) {
    await Category.updateOne({ slug: cat.slug }, { $setOnInsert: cat }, { upsert: true });
  }
  console.log('✅ Grocery categories seeded');
}

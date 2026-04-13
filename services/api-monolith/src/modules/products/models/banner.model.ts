import mongoose, { Schema, Document } from 'mongoose';

export interface IBanner extends Document {
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  ctaLink: string;
  image: string;
  accentColor: string;
  eyebrow: string;
  badge: string;
  order: number;
  isActive: boolean;
}

const BannerSchema = new Schema<IBanner>({
  title:       { type: String, required: true },
  subtitle:    { type: String, default: '' },
  description: { type: String, default: '' },
  cta:         { type: String, default: 'Shop Now' },
  ctaLink:     { type: String, default: '/products' },
  image:       { type: String, default: '' },
  accentColor: { type: String, default: '#f97316' },
  eyebrow:     { type: String, default: "Nepal's #1 Marketplace" },
  badge:       { type: String, default: '' },
  order:       { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

export const Banner = mongoose.models.Banner as mongoose.Model<IBanner>
  ?? mongoose.model<IBanner>('Banner', BannerSchema);

const GROCERY_BANNERS = [
  {
    title: 'Fresh Produce', subtitle: 'Delivered Daily',
    description: 'Farm-fresh fruits and vegetables sourced directly from local farmers. Free delivery above Rs. 1000.',
    cta: 'Shop Fresh', ctaLink: '/categories/fruits-vegetables',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&q=80',
    accentColor: '#22c55e', eyebrow: "Nepal's Fresh Grocery Store", badge: '🥦 Fresh Every Morning', order: 1,
  },
  {
    title: 'Dairy, Grains', subtitle: '& Pantry Staples',
    description: 'Stock up on milk, eggs, rice, lentils and everyday kitchen essentials at the best prices.',
    cta: 'Shop Essentials', ctaLink: '/categories/dairy-eggs',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=1400&q=80',
    accentColor: '#eab308', eyebrow: 'Daily Essentials', badge: '🛒 Best Value Packs', order: 2,
  },
  {
    title: 'Beverages &', subtitle: 'Snack Time',
    description: 'Chips, biscuits, juices, tea, coffee and your favourite beverages — all in one place.',
    cta: 'Shop Snacks', ctaLink: '/categories/snacks-beverages',
    image: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=1400&q=80',
    accentColor: '#f97316', eyebrow: 'Snacks & More', badge: '🍿 Top Sellers', order: 3,
  },
];

export async function seedBanners(): Promise<void> {
  // Remove legacy non-grocery banners
  await Banner.deleteMany({ ctaLink: { $in: ['/products', '/categories/fashion', '/categories/home-living'] } });

  // Upsert grocery banners by order so re-runs are idempotent
  for (const banner of GROCERY_BANNERS) {
    await Banner.updateOne({ order: banner.order }, { $setOnInsert: banner }, { upsert: true });
  }
  console.log('✅ Grocery banners seeded');
}

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
  createdAt: Date;
  updatedAt: Date;
}

const BannerSchema = new Schema({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' },
  cta: { type: String, default: 'Shop Now' },
  ctaLink: { type: String, default: '/products' },
  image: { type: String, default: '' },
  accentColor: { type: String, default: '#f97316' },
  eyebrow: { type: String, default: "Nepal's #1 Marketplace" },
  badge: { type: String, default: '' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const seedBanners = async () => {
  const Banner = mongoose.model<IBanner>('Banner', BannerSchema);
  const count = await Banner.countDocuments();
  if (count > 0) return;
  const defaults = [
    {
      title: 'Discover Nepal\'s Best Deals',
      subtitle: 'Shop the Latest Electronics',
      description: 'Explore thousands of products at unbeatable prices, delivered right to your doorstep.',
      cta: 'Shop Now',
      ctaLink: '/products',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1400&q=80',
      accentColor: '#f97316',
      eyebrow: "Nepal's #1 Marketplace",
      badge: 'New Arrivals',
      order: 1,
      isActive: true,
    },
    {
      title: 'Fashion Forward',
      subtitle: 'Style That Speaks For You',
      description: 'Curated collections from top brands and local designers for every occasion.',
      cta: 'Explore Fashion',
      ctaLink: '/categories/fashion',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1400&q=80',
      accentColor: '#ec4899',
      eyebrow: 'Trending Now',
      badge: 'Up to 50% Off',
      order: 2,
      isActive: true,
    },
    {
      title: 'Home & Living',
      subtitle: 'Transform Your Space',
      description: 'Everything you need to make your house a home, from furniture to décor.',
      cta: 'Shop Home',
      ctaLink: '/categories/home-living',
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1400&q=80',
      accentColor: '#10b981',
      eyebrow: 'Featured Collection',
      badge: 'Free Delivery',
      order: 3,
      isActive: true,
    },
  ];
  await Banner.insertMany(defaults);
  console.log('✅ Default banners seeded');
};

export default mongoose.model<IBanner>('Banner', BannerSchema);

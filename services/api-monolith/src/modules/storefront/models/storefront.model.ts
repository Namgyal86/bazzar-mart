import mongoose, { Document, Schema } from 'mongoose';

interface StorefrontTheme {
  primaryColor:   string;
  accentColor:    string;
  fontFamily:     string;
  layout:         'grid' | 'masonry' | 'list';
  showBanner:     boolean;
  showCategories: boolean;
}

interface StorefrontBanner {
  imageUrl?:  string;
  title?:     string;
  subtitle?:  string;
  ctaText:    string;
  ctaLink?:   string;
}

interface StorefrontSection {
  type:       'FEATURED' | 'SALE' | 'NEW_ARRIVALS' | 'CUSTOM';
  title?:     string;
  productIds: string[];
  isVisible:  boolean;
  order:      number;
}

export interface IStorefront extends Document {
  sellerId:       string;
  theme:          StorefrontTheme;
  banner:         StorefrontBanner;
  sections:       StorefrontSection[];
  seoTitle?:      string;
  seoDescription?: string;
  isPublished:    boolean;
  updatedAt:      Date;
}

const StorefrontSchema = new Schema<IStorefront>({
  sellerId: { type: String, required: true, unique: true },
  theme: {
    primaryColor:   { type: String, default: '#f97316' },
    accentColor:    { type: String, default: '#ef4444' },
    fontFamily:     { type: String, default: 'Inter' },
    layout:         { type: String, enum: ['grid', 'masonry', 'list'], default: 'grid' },
    showBanner:     { type: Boolean, default: true },
    showCategories: { type: Boolean, default: true },
  },
  banner: {
    imageUrl:  String,
    title:     String,
    subtitle:  String,
    ctaText:   { type: String, default: 'Shop Now' },
    ctaLink:   String,
  },
  sections: [{
    type:       { type: String, enum: ['FEATURED', 'SALE', 'NEW_ARRIVALS', 'CUSTOM'] },
    title:      String,
    productIds: [String],
    isVisible:  { type: Boolean, default: true },
    order:      Number,
  }],
  seoTitle:       String,
  seoDescription: String,
  isPublished:    { type: Boolean, default: false },
  updatedAt:      { type: Date, default: Date.now },
});

export const Storefront = mongoose.models.Storefront as mongoose.Model<IStorefront>
  ?? mongoose.model<IStorefront>('Storefront', StorefrontSchema);

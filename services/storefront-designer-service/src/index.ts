import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose, { Schema, model } from 'mongoose';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 8011;
const MONGO_URI = process.env.MONGO_URI_STOREFRONT || 'mongodb://localhost:27017/storefront_db';
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'access_secret_dev';

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

function authenticate(req: any, res: any, next: any) {
  const userId = req.headers['x-user-id'];
  if (userId) { req.user = { id: userId, role: req.headers['x-user-role'] || 'BUYER' }; return next(); }
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try { req.user = jwt.verify(auth.slice(7), JWT_SECRET); next(); }
  catch { res.status(401).json({ success: false, error: 'Invalid token' }); }
}

function requireSeller(req: any, res: any, next: any) {
  if (!['SELLER', 'ADMIN'].includes(req.user?.role)) return res.status(403).json({ success: false, error: 'Seller only' });
  next();
}

// Storefront config schema
const StorefrontSchema = new Schema({
  sellerId: { type: String, required: true, unique: true },
  theme: {
    primaryColor: { type: String, default: '#f97316' },
    accentColor: { type: String, default: '#ef4444' },
    fontFamily: { type: String, default: 'Inter' },
    layout: { type: String, enum: ['grid', 'masonry', 'list'], default: 'grid' },
    showBanner: { type: Boolean, default: true },
    showCategories: { type: Boolean, default: true },
  },
  banner: {
    imageUrl: String,
    title: String,
    subtitle: String,
    ctaText: { type: String, default: 'Shop Now' },
    ctaLink: String,
  },
  sections: [{
    type: { type: String, enum: ['FEATURED', 'SALE', 'NEW_ARRIVALS', 'CUSTOM'] },
    title: String,
    productIds: [String],
    isVisible: { type: Boolean, default: true },
    order: Number,
  }],
  seoTitle: String,
  seoDescription: String,
  isPublished: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
});

const Storefront = model('Storefront', StorefrontSchema);

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'storefront-designer-service' }));

// Seller-specific routes MUST be defined before /:sellerId — otherwise 'my' is matched as :sellerId

// Get my storefront (seller)
app.get('/api/v1/storefront/my/config', authenticate, requireSeller, async (req: any, res) => {
  try {
    let storefront = await Storefront.findOne({ sellerId: req.user.id });
    if (!storefront) {
      storefront = await Storefront.create({ sellerId: req.user.id });
    }
    res.json({ success: true, data: storefront });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update storefront config
app.put('/api/v1/storefront/my/config', authenticate, requireSeller, async (req: any, res) => {
  try {
    const storefront = await Storefront.findOneAndUpdate(
      { sellerId: req.user.id },
      { ...req.body, updatedAt: new Date() },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: storefront });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Publish storefront
app.post('/api/v1/storefront/my/publish', authenticate, requireSeller, async (req: any, res) => {
  try {
    const storefront = await Storefront.findOneAndUpdate(
      { sellerId: req.user.id },
      { isPublished: true, updatedAt: new Date() },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: storefront });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get storefront by seller ID (public) — must come AFTER /my/* routes
app.get('/api/v1/storefront/:sellerId', async (req, res) => {
  try {
    const storefront = await Storefront.findOne({ sellerId: req.params.sellerId, isPublished: true });
    if (!storefront) return res.status(404).json({ success: false, error: 'Storefront not found' });
    res.json({ success: true, data: storefront });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

mongoose.connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Storefront Designer Service running on port ${PORT}`));
  })
  .catch((err) => { console.error('❌ DB connection failed:', err.message); process.exit(1); });

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose, { Schema, model } from 'mongoose';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 8010;
const MONGO_URI = process.env.MONGO_URI_RECOMMENDATION || 'mongodb://localhost:27017/recommendation_db';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:8002';

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Track user product views for recommendations
const ViewSchema = new Schema({
  userId: { type: String, required: true },
  productId: { type: String, required: true },
  categorySlug: String,
  viewedAt: { type: Date, default: Date.now },
});
ViewSchema.index({ userId: 1, viewedAt: -1 });
ViewSchema.index({ productId: 1 });

const View = model('View', ViewSchema);

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'recommendation-service' }));

// Record a product view
app.post('/api/v1/recommendations/track', async (req, res) => {
  try {
    const { userId, productId, categorySlug } = req.body;
    if (!productId) return res.status(400).json({ success: false, error: 'productId required' });
    if (userId) {
      await View.findOneAndUpdate(
        { userId, productId },
        { viewedAt: new Date(), categorySlug },
        { upsert: true }
      );
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get personalized recommendations for a user
app.get('/api/v1/recommendations/for/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // Get the categories the user has viewed most
    const topCategories = await View.aggregate([
      { $match: { userId, categorySlug: { $exists: true } } },
      { $group: { _id: '$categorySlug', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ]);

    const categorySlug = topCategories[0]?._id || 'electronics';

    // Fetch products from that category
    const { data } = await axios.get(`${PRODUCT_SERVICE_URL}/api/v1/products`, {
      params: { category: categorySlug, limit: 8, sort: 'rating' },
      timeout: 5000,
    });

    res.json({ success: true, data: data.data || [] });
  } catch {
    // Fallback: just return featured products
    try {
      const { data } = await axios.get(`${PRODUCT_SERVICE_URL}/api/v1/products/featured`, { timeout: 5000 });
      res.json({ success: true, data: data.data || [] });
    } catch {
      res.json({ success: true, data: [] });
    }
  }
});

// Get similar products (by category)
app.get('/api/v1/recommendations/similar/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    // Get the product's category
    const { data: productData } = await axios.get(`${PRODUCT_SERVICE_URL}/api/v1/products/${productId}`, { timeout: 5000 });
    const categorySlug = productData.data?.category?.slug;

    const { data } = await axios.get(`${PRODUCT_SERVICE_URL}/api/v1/products`, {
      params: { category: categorySlug, limit: 6, sort: 'rating', exclude: productId },
      timeout: 5000,
    });

    res.json({ success: true, data: data.data || [] });
  } catch {
    res.json({ success: true, data: [] });
  }
});

// Trending products (most viewed in last 7 days)
app.get('/api/v1/recommendations/trending', async (req, res) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trending = await View.aggregate([
      { $match: { viewedAt: { $gte: since } } },
      { $group: { _id: '$productId', views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: 10 },
    ]);

    if (trending.length === 0) {
      // Fallback to featured
      const { data } = await axios.get(`${PRODUCT_SERVICE_URL}/api/v1/products`, {
        params: { limit: 10, sort: 'rating' },
        timeout: 5000,
      });
      return res.json({ success: true, data: data.data || [] });
    }

    const productIds = trending.map(t => t._id);
    const products = await Promise.allSettled(
      productIds.map(id => axios.get(`${PRODUCT_SERVICE_URL}/api/v1/products/${id}`, { timeout: 5000 }))
    );

    const result = products
      .filter(p => p.status === 'fulfilled')
      .map((p: any) => p.value.data.data)
      .filter(Boolean);

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.json({ success: true, data: [] });
  }
});

mongoose.connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Recommendation Service running on port ${PORT}`));
  })
  .catch((err) => { console.error('❌ DB connection failed:', err.message); process.exit(1); });

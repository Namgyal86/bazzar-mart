import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose, { Schema, model } from 'mongoose';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 8014;
const MONGO_URI = process.env.MONGO_URI_ANALYTICS || 'mongodb://localhost:27017/analytics_db';
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'access_secret_dev';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:8004';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:8001';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:8002';

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

function requireAdmin(req: any, res: any, next: any) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ success: false, error: 'Admin only' });
  next();
}

// Event schema for tracking
const EventSchema = new Schema({
  type: { type: String, required: true }, // PAGE_VIEW, PRODUCT_VIEW, ADD_TO_CART, PURCHASE, SEARCH
  userId: String,
  sessionId: String,
  productId: String,
  categorySlug: String,
  searchQuery: String,
  metadata: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});
EventSchema.index({ type: 1, createdAt: -1 });
EventSchema.index({ userId: 1, createdAt: -1 });

const Event = model('Event', EventSchema);

// Platform settings schema
const SettingsSchema = new Schema({
  section: { type: String, required: true, unique: true },
  data:    { type: Schema.Types.Mixed, default: {} },
  updatedAt: { type: Date, default: Date.now },
});
const Settings = model('Settings', SettingsSchema);

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'analytics-service' }));

// Admin: get all settings
app.get('/api/v1/analytics/admin/settings', authenticate, requireAdmin, async (req, res) => {
  try {
    const docs = await Settings.find();
    const result: any = {};
    docs.forEach((d: any) => { result[d.section] = d.data; });
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: save a settings section
app.post('/api/v1/analytics/admin/settings', authenticate, requireAdmin, async (req: any, res) => {
  try {
    const { section, data } = req.body;
    if (!section) return res.status(400).json({ success: false, error: 'section required' });
    await Settings.findOneAndUpdate(
      { section },
      { data, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: { section, data } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Track an event
app.post('/api/v1/analytics/event', async (req, res) => {
  try {
    const { type, userId, sessionId, productId, categorySlug, searchQuery, metadata } = req.body;
    await Event.create({ type, userId, sessionId, productId, categorySlug, searchQuery, metadata });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin dashboard overview — returns data in the shape expected by admin/dashboard/page.tsx
app.get('/api/v1/analytics/admin/overview', authenticate, requireAdmin, async (req: any, res) => {
  const headers = { 'x-user-id': req.user.id, 'x-user-role': 'ADMIN' };

  let orderStats   = { totalOrders: 0, totalRevenue: 0, pendingOrders: 0, todayOrders: 0 };
  let userStats    = { totalUsers: 0, newToday: 0 };
  let productStats = { totalProducts: 0, totalSellers: 0, pendingSellers: 0 };

  try {
    const [ordersRes, usersRes, productsRes] = await Promise.allSettled([
      axios.get(`${ORDER_SERVICE_URL}/api/v1/orders/admin/stats`, { headers, timeout: 4000 }),
      axios.get(`${USER_SERVICE_URL}/api/v1/users/admin/stats`, { headers, timeout: 4000 }),
      axios.get(`${PRODUCT_SERVICE_URL}/api/v1/products/admin/stats`, { headers, timeout: 4000 }),
    ]);
    if (ordersRes.status === 'fulfilled' && ordersRes.value.data.data) orderStats = { ...orderStats, ...ordersRes.value.data.data };
    if (usersRes.status === 'fulfilled' && usersRes.value.data.data) userStats = { ...userStats, ...usersRes.value.data.data };
    if (productsRes.status === 'fulfilled' && productsRes.value.data.data) productStats = { ...productStats, ...productsRes.value.data.data };
  } catch {}

  // Build last-7-days revenue trend from real order data
  let revenueByDay: { day: string; gmv: number; orders: number }[] = [];
  try {
    const resp = await axios.get(`${ORDER_SERVICE_URL}/api/v1/orders/admin/revenue-by-day?days=7`, { headers, timeout: 4000 });
    if (resp.data.data?.length) revenueByDay = resp.data.data;
  } catch {}
  // Fallback: show 7 days with 0 revenue (real zeros, not fake data)
  if (!revenueByDay.length) {
    revenueByDay = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { day: d.toLocaleDateString('en', { weekday: 'short' }), gmv: 0, orders: 0 };
    });
  }

  // Category breakdown from real order data
  let categoryData: { name: string; value: number; color: string }[] = [];
  try {
    const resp = await axios.get(`${ORDER_SERVICE_URL}/api/v1/orders/admin/category-breakdown`, { headers, timeout: 4000 });
    if (resp.data.data?.length) categoryData = resp.data.data;
  } catch {}
  // Fallback: empty — frontend shows "No category data yet"
  if (!categoryData.length) {
    categoryData = [];
  }

  const recentActions = [
    { message: `${productStats.pendingSellers ?? 0} seller applications pending review`, urgent: (productStats.pendingSellers ?? 0) > 5, time: 'Now' },
    { message: `${orderStats.pendingOrders} orders awaiting fulfillment`, urgent: orderStats.pendingOrders > 20, time: 'Today' },
    { message: `${userStats.newToday} new users registered today`, urgent: false, time: 'Today' },
  ].filter(a => a.message);

  res.json({
    success: true,
    data: {
      gmv:           orderStats.totalRevenue,
      gmvChange:     null,
      totalUsers:    userStats.totalUsers,
      newUsersToday: userStats.newToday,
      totalSellers:  productStats.totalSellers,
      pendingSellers: productStats.pendingSellers,
      ordersToday:   orderStats.todayOrders,
      ordersChange:  null,
      revenueByDay,
      categoryData,
      recentActions,
    },
  });
});

// Platform health — pings each microservice /health endpoint
app.get('/api/v1/analytics/platform-health', async (req, res) => {
  const services = [
    { name: 'User Service',     url: process.env.USER_SERVICE_URL    || 'http://localhost:8001' },
    { name: 'Product Service',  url: process.env.PRODUCT_SERVICE_URL || 'http://localhost:8002' },
    { name: 'Order Service',    url: process.env.ORDER_SERVICE_URL   || 'http://localhost:8004' },
    { name: 'Payment Service',  url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:8005' },
    { name: 'Search Service',   url: process.env.SEARCH_SERVICE_URL  || 'http://localhost:8009' },
  ];

  const results = await Promise.allSettled(
    services.map(s => axios.get(`${s.url}/health`, { timeout: 3000 }))
  );

  const metrics = services.map((s, i) => {
    const ok = results[i].status === 'fulfilled';
    return {
      label:     s.name,
      value:     ok ? 'Operational' : 'Unavailable',
      available: ok,
      status:    ok ? 'good' : 'degraded',
      pct:       ok ? 100 : 0,
      target:    '99.9% uptime',
    };
  });

  const allOk = metrics.every(m => m.available);
  res.json({
    success: true,
    data: {
      systemStatus: allOk ? 'operational' : 'degraded',
      metrics,
    },
  });
});

// Revenue chart data (last 30 days) — proxied from order service
app.get('/api/v1/analytics/admin/revenue', authenticate, requireAdmin, async (req: any, res) => {
  const headers = { 'x-user-id': req.user.id, 'x-user-role': 'ADMIN' };
  try {
    const resp = await axios.get(`${ORDER_SERVICE_URL}/api/v1/orders/admin/revenue-by-day?days=30`, { headers, timeout: 4000 });
    if (resp.data.data?.length) return res.json({ success: true, data: resp.data.data });
  } catch {}
  // Fallback: real zeros for last 30 days
  const days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return { date: date.toISOString().split('T')[0], revenue: 0, orders: 0 };
  });
  res.json({ success: true, data: days });
});

// Top search queries
app.get('/api/v1/analytics/admin/searches', authenticate, requireAdmin, async (req: any, res) => {
  try {
    const topSearches = await Event.aggregate([
      { $match: { type: 'SEARCH', searchQuery: { $exists: true, $ne: null } } },
      { $group: { _id: '$searchQuery', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { query: '$_id', count: 1, _id: 0 } },
    ]);
    res.json({ success: true, data: topSearches });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

mongoose.connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Analytics Service running on port ${PORT}`));
  })
  .catch((err) => { console.error('❌ DB connection failed:', err.message); process.exit(1); });

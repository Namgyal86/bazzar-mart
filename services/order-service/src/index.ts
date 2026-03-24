import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose, { Schema, model } from 'mongoose';
import jwt from 'jsonwebtoken';
import orderRoutes from './routes/order.routes';

const app = express();
const PORT = process.env.PORT || 8004;
const MONGO_URI = process.env.MONGO_URI_ORDER || 'mongodb://localhost:27019/order_db';
const JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'access_secret_dev';

app.use(helmet()); app.use(cors({ origin: '*', credentials: true })); app.use(express.json());
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'order-service' }));

// ─── Coupon Schema ─────────────────────────────────────────────────────────────
const CouponSchema = new Schema({
  code:         { type: String, required: true, unique: true, uppercase: true },
  type:         { type: String, enum: ['PERCENTAGE', 'FIXED'], default: 'PERCENTAGE' },
  value:        { type: Number, required: true },
  minOrder:     { type: Number, default: 0 },
  maxDiscount:  { type: Number, default: 0 },  // 0 = unlimited
  usageLimit:   { type: Number, default: 100 },
  usageCount:   { type: Number, default: 0 },
  validUntil:   { type: Date },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

const Coupon = model('Coupon', CouponSchema);

function authMiddleware(req: any, res: any, next: any) {
  const userId = req.headers['x-user-id'];
  if (userId) { req.user = { id: userId, role: req.headers['x-user-role'] || 'BUYER' }; return next(); }
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Unauthorized' });
  try { req.user = jwt.verify(auth.slice(7), JWT_SECRET); next(); }
  catch { res.status(401).json({ success: false, error: 'Invalid token' }); }
}

// Admin: list all coupons
app.get('/api/v1/coupons/admin/list', authMiddleware, async (req: any, res) => {
  try {
    const coupons = await Coupon.find().sort('-createdAt');
    res.json({ success: true, data: coupons });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: create coupon
app.post('/api/v1/coupons', authMiddleware, async (req: any, res) => {
  try {
    const { code, type, value, minOrder, maxDiscount, usageLimit, validUntil } = req.body;
    if (!code || !value) return res.status(400).json({ success: false, error: 'code and value required' });
    const coupon = await Coupon.create({ code: code.toUpperCase(), type, value, minOrder, maxDiscount, usageLimit, validUntil });
    res.status(201).json({ success: true, data: coupon });
  } catch (err: any) {
    if (err.code === 11000) return res.status(409).json({ success: false, error: 'Coupon code already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

// Validate / apply coupon at checkout (buyer)
app.post('/api/v1/coupons/validate', authMiddleware, async (req: any, res) => {
  try {
    const { code, orderTotal } = req.body;
    const coupon = await Coupon.findOne({ code: code?.toUpperCase(), isActive: true });
    if (!coupon) return res.status(404).json({ success: false, error: 'Invalid coupon code' });
    if (coupon.validUntil && new Date() > coupon.validUntil) return res.status(400).json({ success: false, error: 'Coupon has expired' });
    if (coupon.usageCount >= coupon.usageLimit) return res.status(400).json({ success: false, error: 'Coupon usage limit reached' });
    if (orderTotal < coupon.minOrder) return res.status(400).json({ success: false, error: `Minimum order Rs. ${coupon.minOrder} required` });

    let discount = coupon.type === 'PERCENTAGE'
      ? Math.round((orderTotal * coupon.value) / 100)
      : coupon.value;
    if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);

    res.json({ success: true, data: { code: coupon.code, type: coupon.type, discount, description: `${coupon.value}${coupon.type === 'PERCENTAGE' ? '%' : ' Rs.'} off` } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: delete coupon
app.delete('/api/v1/coupons/:id', authMiddleware, async (req: any, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true, data: null });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

app.use('/api/v1/orders', orderRoutes);
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.statusCode || 500).json({ success: false, error: err.message });
});
mongoose.connect(MONGO_URI)
  .then(() => { console.log('✅ Connected to order_db'); app.listen(PORT, () => console.log(`🚀 Order Service on port ${PORT}`)); })
  .catch((err) => { console.error('❌ DB error:', err); process.exit(1); });

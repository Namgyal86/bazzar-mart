import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose, { Document, Schema } from 'mongoose';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = process.env.PORT || 8015;
const MONGO_URI = process.env.MONGO_URI_SUPPORT || 'mongodb://localhost:27017/support_db';
const SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_dev';

app.use(helmet()); app.use(cors({ origin: '*', credentials: true })); app.use(express.json());

// ─── Auth middleware (optional — contact form is public) ─────────────────────
function optionalAuth(req: any, _res: express.Response, next: express.NextFunction) {
  const k = req.headers['x-user-id'];
  if (k) { req.user = { userId: k, role: req.headers['x-user-role'] || 'BUYER' }; return next(); }
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(h.slice(7), SECRET); } catch {}
  }
  next();
}

function requireAdmin(req: any, res: express.Response, next: express.NextFunction) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });
  if (req.user.role !== 'ADMIN') return res.status(403).json({ success: false, error: 'Admin only' });
  next();
}

// ─── Model ───────────────────────────────────────────────────────────────────
interface IMessage extends Document {
  name?: string;
  email?: string;
  subject: string;
  message: string;
  type?: string;
  orderId?: string;
  userId?: string;
  userEmail?: string;
  status: 'open' | 'resolved';
  source: 'contact' | 'admin-contact';
}

const MessageSchema = new Schema<IMessage>({
  name:      { type: String, trim: true },
  email:     { type: String, trim: true, lowercase: true },
  subject:   { type: String, required: true, trim: true },
  message:   { type: String, required: true },
  type:      { type: String, default: 'general' },
  orderId:   { type: String },
  userId:    { type: String },
  userEmail: { type: String },
  status:    { type: String, enum: ['open', 'resolved'], default: 'open' },
  source:    { type: String, enum: ['contact', 'admin-contact'], required: true },
}, { timestamps: true });

const Message = mongoose.model<IMessage>('Message', MessageSchema);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'support-service' }));

// Public contact form (buyer → support)
app.post('/api/v1/support/contact', optionalAuth, async (req: any, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ success: false, error: 'subject and message required' });
    const doc = await Message.create({ name, email, subject, message, source: 'contact', type: 'general' });
    res.status(201).json({ success: true, data: doc });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Authenticated admin-contact form (buyer → admin ticket)
app.post('/api/v1/support/admin-contact', optionalAuth, async (req: any, res) => {
  try {
    const { type, subject, message, orderId, userId, userEmail } = req.body;
    if (!subject || !message) return res.status(400).json({ success: false, error: 'subject and message required' });
    const doc = await Message.create({
      subject, message, type: type || 'other', orderId,
      userId: userId || req.user?.userId,
      userEmail: userEmail || req.user?.email,
      source: 'admin-contact',
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: list contact messages
app.get('/api/v1/support/messages', optionalAuth, requireAdmin, async (_req, res) => {
  try {
    const msgs = await Message.find({ source: 'contact' }).sort('-createdAt').limit(200);
    res.json({ success: true, data: msgs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: list admin-contact tickets
app.get('/api/v1/support/admin-messages', optionalAuth, requireAdmin, async (_req, res) => {
  try {
    const msgs = await Message.find({ source: 'admin-contact' }).sort('-createdAt').limit(200);
    res.json({ success: true, data: msgs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: update message status
app.patch('/api/v1/support/messages/:id', optionalAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['open', 'resolved'].includes(status)) return res.status(400).json({ success: false, error: 'status must be open or resolved' });
    const msg = await Message.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });
    res.json({ success: true, data: msg });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to support_db');
    app.listen(PORT, () => console.log(`🚀 Support Service running on port ${PORT}`));
  })
  .catch((err) => { console.error('❌ DB error:', err); process.exit(1); });

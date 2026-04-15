import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Notification } from './models/notification.model';
import { startNotificationConsumers } from './kafka/consumers';

const app = express();
const PORT = process.env.PORT || 8008;
const MONGO_URI = process.env.MONGO_URI_NOTIFICATION || 'mongodb://localhost:27023/notification_db';
const SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_dev';

const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';
const allowedOrigins = Array.from(new Set([WEB_URL, 'http://localhost:3000']));
const NODE_ENV = process.env.NODE_ENV || 'development';

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) { callback(null, true); return; }
    if (NODE_ENV === 'development' || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin "${origin}" is not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
};

app.use(helmet()); app.use(cors(corsOptions)); app.use(express.json());

function auth(req: any, res: express.Response, next: express.NextFunction) {
  const k = req.headers['x-user-id'];
  if (k) { req.user = { userId: k }; return next(); }
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'No token' });
  try { req.user = jwt.verify(h.slice(7), SECRET); next(); } catch { res.status(401).json({ success: false, error: 'Invalid' }); }
}

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'notification-service' }));

app.get('/api/v1/notifications', auth, async (req: any, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.userId }).sort('-createdAt').limit(50);
    const unread = await Notification.countDocuments({ userId: req.user.userId, isRead: false });
    // Return array directly so frontend Array.isArray() check works; unread in meta
    res.json({ success: true, data: notifications, meta: { unread } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// read-all MUST come before /:id/read
const markAllRead = async (req: any, res: any) => {
  try {
    await Notification.updateMany({ userId: req.user.userId, isRead: false }, { isRead: true });
    res.json({ success: true, data: null });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
};
const markOneRead = async (req: any, res: any) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.userId }, { isRead: true });
    res.json({ success: true, data: null });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
};

app.put('/api/v1/notifications/read-all', auth, markAllRead);
app.patch('/api/v1/notifications/read-all', auth, markAllRead);   // PATCH alias for frontend
app.put('/api/v1/notifications/:id/read', auth, markOneRead);
app.patch('/api/v1/notifications/:id/read', auth, markOneRead);   // PATCH alias for frontend

// Internal endpoint to create notification
app.post('/api/v1/notifications/internal', async (req: express.Request, res: express.Response) => {
  try {
    const notif = await Notification.create(req.body);
    res.status(201).json({ success: true, data: notif });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: get system-level notifications (broadcasts + recent activity)
app.get('/api/v1/notifications/admin', auth, async (req: any, res) => {
  try {
    const broadcasts = await Notification.find({ userId: { $regex: /^BROADCAST:/ } }).sort('-createdAt').limit(20);
    const system = await Notification.find({ type: 'SYSTEM' }).sort('-createdAt').limit(20);
    const combined = [...broadcasts, ...system]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30);
    res.json({ success: true, data: combined });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin broadcast to all users (or by role target)
app.post('/api/v1/notifications/broadcast', auth, async (req: any, res) => {
  try {
    const { title, message, type = 'SYSTEM', target = 'ALL' } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, error: 'title and message required' });

    // For demo: create a single broadcast notification record
    // In production this would fan out to all matching users
    const notif = await Notification.create({
      userId: `BROADCAST:${target}`,
      type,
      title,
      message,
      isRead: false,
    });
    res.json({ success: true, data: notif, meta: { target, sent: true } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to notification_db');
    await startNotificationConsumers().catch(err => console.warn('⚠️ Kafka consumers failed to start:', err.message));
    app.listen(PORT, () => console.log(`🚀 Notification Service on port ${PORT}`));
  })
  .catch((err) => { console.error(err); process.exit(1); });

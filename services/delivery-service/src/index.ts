import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { startDeliveryConsumers } from './kafka/consumers';
import { publishDeliveryEvent } from './kafka/producer';
import { createDeliveryModel, IDelivery } from './models/delivery.model';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 8013;
const MONGO_URI = process.env.MONGO_URI_DELIVERY || 'mongodb://localhost:27024/delivery_db';
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

const io = new Server(httpServer, { cors: { origin: allowedOrigins } });

app.use(helmet()); app.use(cors(corsOptions)); app.use(express.json());

function authenticateJWT(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token' });
    return;
  }
  try {
    (req as any).user = jwt.verify(header.slice(7), SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

// Delivery agent locations (in-memory for demo)
const agentLocations: Record<string, { lat: number; lng: number; orderId: string; agentName: string }> = {};

// Delivery model — initialized after mongoose.connect()
let Delivery: ReturnType<typeof createDeliveryModel>;

const availableDrivers = [
  { id: 'd1', name: 'Ramesh Sharma', phone: '9841000001', zone: 'Kathmandu', rating: 4.9 },
  { id: 'd2', name: 'Bikash Thapa', phone: '9841000002', zone: 'Lalitpur', rating: 4.7 },
  { id: 'd3', name: 'Sunil Gurung', phone: '9841000003', zone: 'Bhaktapur', rating: 4.8 },
  { id: 'd4', name: 'Priya Shrestha', phone: '9841000004', zone: 'Kathmandu', rating: 4.6 },
];

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'delivery-service' }));

// Admin: list all deliveries
app.get('/api/v1/delivery/admin/list', authenticateJWT, async (req, res) => {
  try {
    const data = await Delivery.find().sort('-createdAt').limit(100).lean();
    res.json({ success: true, data });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: delivery stats (used by platform-health dashboard)
app.get('/api/v1/delivery/admin/stats', authenticateJWT, async (req, res) => {
  try {
    const [total, completedCount] = await Promise.all([
      Delivery.countDocuments(),
      Delivery.countDocuments({ status: 'DELIVERED' }),
    ]);
    const onTimeRate = total > 0 ? (completedCount / total) * 100 : 0;
    res.json({ success: true, data: { total, completedCount, onTimeRate: Number(onTimeRate.toFixed(2)) } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Admin: get available drivers
app.get('/api/v1/delivery/drivers/available', authenticateJWT, (req, res) => {
  res.json({ success: true, data: availableDrivers });
});

// Admin: assign driver to delivery
app.patch('/api/v1/delivery/:id/assign', authenticateJWT, async (req, res) => {
  try {
    const { driverId } = req.body;
    const driver = availableDrivers.find(d => d.id === driverId);
    await Delivery.findOneAndUpdate(
      { orderId: req.params.id },
      { driver: driver?.name ?? driverId, driverId, status: 'IN_TRANSIT' },
      { new: true },
    );
    res.json({ success: true, data: { id: req.params.id, driver: driver?.name ?? driverId, status: 'IN_TRANSIT' } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Get tracking info for an order
app.get('/api/v1/delivery/track/:orderId', (req, res) => {
  const location = agentLocations[req.params.orderId] || {
    lat: 27.7172 + (Math.random() - 0.5) * 0.01,
    lng: 85.3240 + (Math.random() - 0.5) * 0.01,
    orderId: req.params.orderId,
    agentName: 'Ram Kumar',
  };
  res.json({
    success: true,
    data: {
      orderId: req.params.orderId,
      agentName: location.agentName,
      agentPhone: '9841234567',
      agentRating: 4.8,
      vehicle: 'Motorcycle • BA 12 PA 3456',
      currentLocation: { lat: location.lat, lng: location.lng },
      estimatedMinutes: Math.floor(Math.random() * 20) + 5,
      status: 'IN_TRANSIT',
    },
  });
});

// Agent online status (in-memory)
const agentStatus: Record<string, boolean> = {};

// Delivery agent: toggle online/offline
app.patch('/api/v1/delivery/agent/status', authenticateJWT, (req, res) => {
  const agentId = (req as any).user?.userId || 'unknown';
  const { isOnline } = req.body;
  agentStatus[agentId] = isOnline;
  res.json({ success: true, data: { agentId, isOnline } });
});

// Delivery agent: get assigned orders
app.get('/api/v1/delivery/agent/orders', authenticateJWT, async (req, res) => {
  try {
    const agentId = (req as any).user?.userId || '';
    const { status } = req.query;
    const filter: Record<string, unknown> = {};
    if (agentId) filter.driverId = agentId;
    if (status)  filter.status   = status;
    const data = await Delivery.find(filter).sort('-createdAt').lean();
    res.json({ success: true, data });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Delivery agent: get a specific order for delivery
app.get('/api/v1/delivery/orders/:orderId', authenticateJWT, async (req, res) => {
  try {
    const d = await Delivery.findOne({
      $or: [
        { orderId: req.params.orderId },
        { _id: req.params.orderId.match(/^[a-f0-9]{24}$/) ? req.params.orderId : null },
      ],
    }).lean();
    if (d) return res.json({ success: true, data: d });
    // Return a placeholder if not found
    res.json({
      success: true,
      data: {
        orderId: req.params.orderId,
        status: 'ASSIGNED',
        customer: 'Customer',
        address: 'Kathmandu, Nepal',
        phone: '',
        shippingAddress: { street: '', city: 'Kathmandu', lat: 27.7172, lng: 85.3240 },
      },
    });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Delivery agent: mark order as delivered
app.patch('/api/v1/delivery/orders/:orderId/complete', authenticateJWT, async (req, res) => {
  try {
    const agentEarning = 100;
    const d = await Delivery.findOneAndUpdate(
      { orderId: req.params.orderId },
      { status: 'DELIVERED', completedAt: new Date(), agentEarning },
      { new: true },
    );
    // Emit socket event to buyer
    io.to(`order:${req.params.orderId}`).emit('order:status_changed', { status: 'DELIVERED' });
    // Publish Kafka event so order-service and notification-service can react
    publishDeliveryEvent('delivery.completed', {
      taskId:      req.params.orderId,
      orderId:     req.params.orderId,
      buyerId:     d?.buyerId || '',
      agentId:     d?.driverId || '',
      deliveredAt: new Date().toISOString(),
      agentEarning,
    }).catch(() => {});
    res.json({ success: true, data: { orderId: req.params.orderId, status: 'DELIVERED' } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Socket.io for real-time GPS
io.on('connection', (socket) => {
  const token = socket.handshake.auth.token;
  let userId: string | null = null;
  try {
    if (token) { const p = jwt.verify(token, SECRET) as any; userId = p.userId; }
  } catch {}

  socket.on('subscribe_order', (orderId: string) => {
    socket.join(`order:${orderId}`);
  });

  socket.on('agent_location_update', (data: { orderId: string; lat: number; lng: number }) => {
    agentLocations[data.orderId] = { ...agentLocations[data.orderId], lat: data.lat, lng: data.lng, orderId: data.orderId, agentName: 'Ram Kumar' };
    io.to(`order:${data.orderId}`).emit('location_update', { lat: data.lat, lng: data.lng, timestamp: Date.now() });
  });

  socket.on('disconnect', () => {});
});

// GPS simulation — development/test only (FEAT-08, D-21)
if (process.env.NODE_ENV !== 'production') {
  setInterval(() => {
    Object.keys(agentLocations).forEach((orderId) => {
      const loc = agentLocations[orderId];
      loc.lat += (Math.random() - 0.5) * 0.001;
      loc.lng += (Math.random() - 0.5) * 0.001;
      io.to(`order:${orderId}`).emit('location_update', { lat: loc.lat, lng: loc.lng, timestamp: Date.now() });
    });
  }, 5000);
}

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to delivery_db');
    Delivery = createDeliveryModel(mongoose.connection);
    await startDeliveryConsumers().catch(e => console.warn('Kafka:', e.message));
    httpServer.listen(PORT, () => console.log(`Delivery Service on port ${PORT}`));
  })
  .catch((err) => { console.error(err); process.exit(1); });

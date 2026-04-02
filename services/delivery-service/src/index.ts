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

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
const PORT = process.env.PORT || 8013;
const MONGO_URI = process.env.MONGO_URI_DELIVERY || 'mongodb://localhost:27024/delivery_db';
const SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_dev';

app.use(helmet()); app.use(cors({ origin: '*', credentials: true })); app.use(express.json());

// Delivery agent locations (in-memory for demo)
const agentLocations: Record<string, { lat: number; lng: number; orderId: string; agentName: string }> = {};

// In-memory delivery store for demo
const deliveries: any[] = [];
const availableDrivers = [
  { id: 'd1', name: 'Ramesh Sharma', phone: '9841000001', zone: 'Kathmandu', rating: 4.9 },
  { id: 'd2', name: 'Bikash Thapa', phone: '9841000002', zone: 'Lalitpur', rating: 4.7 },
  { id: 'd3', name: 'Sunil Gurung', phone: '9841000003', zone: 'Bhaktapur', rating: 4.8 },
  { id: 'd4', name: 'Priya Shrestha', phone: '9841000004', zone: 'Kathmandu', rating: 4.6 },
];

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'delivery-service' }));

// Admin: list all deliveries
app.get('/api/v1/delivery/admin/list', (req, res) => {
  res.json({ success: true, data: deliveries });
});

// Admin: get available drivers
app.get('/api/v1/delivery/drivers/available', (req, res) => {
  res.json({ success: true, data: availableDrivers });
});

// Admin: assign driver to delivery
app.patch('/api/v1/delivery/:id/assign', (req, res) => {
  const { driverId } = req.body;
  const driver = availableDrivers.find(d => d.id === driverId);
  const delivery = deliveries.find(d => d.id === req.params.id);
  if (delivery) {
    delivery.driver = driver?.name ?? driverId;
    delivery.driverId = driverId;
    delivery.status = 'IN_TRANSIT';
  }
  res.json({ success: true, data: { id: req.params.id, driver: driver?.name ?? driverId, status: 'IN_TRANSIT' } });
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
app.patch('/api/v1/delivery/agent/status', (req, res) => {
  const agentId = req.headers['x-user-id'] as string || 'unknown';
  const { isOnline } = req.body;
  agentStatus[agentId] = isOnline;
  res.json({ success: true, data: { agentId, isOnline } });
});

// Delivery agent: get assigned orders
app.get('/api/v1/delivery/agent/orders', (req, res) => {
  const agentId = req.headers['x-user-id'] as string || '';
  const { status } = req.query;
  let result = deliveries.filter(d => !agentId || d.driverId === agentId || d.driverId === null);
  if (status) result = result.filter(d => d.status === status);
  res.json({ success: true, data: result });
});

// Delivery agent: get a specific order for delivery
app.get('/api/v1/delivery/orders/:orderId', (req, res) => {
  const d = deliveries.find(d => d.id === req.params.orderId || d.orderId === req.params.orderId);
  if (d) return res.json({ success: true, data: d });
  // Return a placeholder if not found
  res.json({
    success: true,
    data: {
      id: req.params.orderId,
      orderId: req.params.orderId,
      status: 'ASSIGNED',
      customer: 'Customer',
      address: 'Kathmandu, Nepal',
      phone: '',
      shippingAddress: { street: '', city: 'Kathmandu', lat: 27.7172, lng: 85.3240 },
    },
  });
});

// Delivery agent: mark order as delivered
app.patch('/api/v1/delivery/orders/:orderId/complete', (req, res) => {
  const d = deliveries.find(d => d.id === req.params.orderId || d.orderId === req.params.orderId);
  if (d) {
    d.status = 'DELIVERED';
    d.completedAt = new Date().toISOString();
    d.agentEarning = 100; // Rs 100 delivery fee
  }
  // Emit socket event to buyer
  io.to(`order:${req.params.orderId}`).emit('order:status_changed', { status: 'DELIVERED' });
  // Publish Kafka event so order-service and notification-service can react
  publishDeliveryEvent('delivery.completed', {
    taskId: req.params.orderId,
    orderId: req.params.orderId,
    buyerId: d?.buyerId || '',
    agentId: d?.driverId || '',
    deliveredAt: new Date().toISOString(),
    agentEarning: 100,
  }).catch(() => {});
  res.json({ success: true, data: { orderId: req.params.orderId, status: 'DELIVERED' } });
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

// Simulate agent movement every 5s for demo
setInterval(() => {
  Object.keys(agentLocations).forEach((orderId) => {
    const loc = agentLocations[orderId];
    loc.lat += (Math.random() - 0.5) * 0.001;
    loc.lng += (Math.random() - 0.5) * 0.001;
    io.to(`order:${orderId}`).emit('location_update', { lat: loc.lat, lng: loc.lng, timestamp: Date.now() });
  });
}, 5000);

// Load seeded orders into in-memory deliveries on startup
async function loadDeliveriesFromOrders() {
  let orderConn: mongoose.Connection | null = null;
  try {
    const ORDER_URI = process.env.MONGO_URI_ORDER || 'mongodb://localhost:27019/order_db';
    orderConn = await mongoose.createConnection(ORDER_URI).asPromise();

    // Get db with proper type handling
    const db = orderConn.db;
    if (!db) {
      throw new Error('Failed to get database connection');
    }

    const orders = await db.collection('orders')
      .find({ status: { $in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } })
      .sort({ createdAt: -1 }).limit(30).toArray();

    const statusMap: Record<string, string> = {
      PENDING: 'PENDING', CONFIRMED: 'PENDING', PROCESSING: 'PENDING',
      SHIPPED: 'IN_TRANSIT', DELIVERED: 'DELIVERED',
    };
    const driverPool = availableDrivers;

    // Use for...of instead of forEach for proper async handling
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i] as any;
      const status = statusMap[o.status] || 'PENDING';
      const driver = (status === 'IN_TRANSIT' || status === 'DELIVERED')
        ? driverPool[i % driverPool.length] : null;
      deliveries.push({
        id: o._id.toString(),
        orderId: o.orderNumber || o._id.toString(),
        customer: o.shippingAddress?.fullName || 'Customer',
        address: [o.shippingAddress?.addressLine1, o.shippingAddress?.city].filter(Boolean).join(', '),
        phone: o.shippingAddress?.phone || '',
        status,
        driver: driver?.name || null,
        driverId: driver?.id || null,
        total: o.total,
        createdAt: o.createdAt,
      });
    }
    console.log(`✅ Loaded ${deliveries.length} deliveries from orders`);
  } catch (err: any) {
    console.warn('⚠️  Could not load orders for delivery:', err.message);
  } finally {
    // Ensure connection is closed in finally block
    if (orderConn) {
      await orderConn.close();
    }
  }
}

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to delivery_db');
    await loadDeliveriesFromOrders();
    await startDeliveryConsumers().catch(e => console.warn('⚠️ Kafka:', e.message));
    httpServer.listen(PORT, () => console.log(`🚀 Delivery Service on port ${PORT}`));
  })
  .catch((err) => { console.error(err); process.exit(1); });

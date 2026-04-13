/**
 * Analytics module controller.
 *
 * Replaces analytics-service (port 8014).
 * Admin overview queries Order, User, Product, and Seller models directly
 * instead of proxying via HTTP — all modules are in the same process.
 *
 * internalBus event handlers (registered at startup):
 *   order:created      → platform + seller daily metrics
 *   payment:success    → payment daily metrics
 *   user:registered    → new-user daily metrics
 *   delivery:completed → delivery daily metrics
 */
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AnalyticsEvent, Settings } from './analytics.model';
import { Product } from '../products/models/product.model';
import { internalBus, EVENTS, OrderCreatedPayload, PaymentSuccessPayload, UserRegisteredPayload, DeliveryCompletedPayload } from '../../shared/events/emitter';
import { AuthRequest } from '../../shared/middleware/auth';

// ── Internal event handlers ───────────────────────────────────────────────────

export function registerAnalyticsEventHandlers(): void {
  internalBus.on(EVENTS.ORDER_CREATED, async (p: OrderCreatedPayload) => {
    try {
      const db = mongoose.connection.db;
      if (!db) return;
      const today = startOfDay();
      // Fetch order detail for totalAmount and sellerId
      const order = await db.collection('orders')
        .findOne({ _id: new mongoose.Types.ObjectId(p.orderId) }, { projection: { total: 1, items: 1 } });
      const totalAmount = Number((order as Record<string, unknown> | null)?.total ?? p.total ?? 0);

      await db.collection('platformmetrics').updateOne(
        { date: today },
        {
          $inc: { totalOrders: 1, totalRevenue: totalAmount },
          $set: { updatedAt: new Date() },
          $setOnInsert: { date: today, createdAt: new Date() },
        },
        { upsert: true },
      );

      // Per-seller metrics (all unique sellerIds from items)
      const items = ((order as Record<string, unknown> | null)?.items as { sellerId: string; totalPrice: number }[] | undefined) || [];
      const sellerRevMap = new Map<string, number>();
      for (const item of items) {
        if (item.sellerId) {
          sellerRevMap.set(item.sellerId, (sellerRevMap.get(item.sellerId) || 0) + item.totalPrice);
        }
      }
      for (const [sellerId, revenue] of sellerRevMap) {
        await db.collection('sellermetrics').updateOne(
          { sellerId, date: today },
          {
            $inc: { orders: 1, revenue },
            $set: { updatedAt: new Date() },
            $setOnInsert: { sellerId, date: today, createdAt: new Date() },
          },
          { upsert: true },
        );
      }
    } catch (err) {
      console.error('[analytics] order:created handler error:', err);
    }
  });

  internalBus.on(EVENTS.PAYMENT_SUCCESS, async (p: PaymentSuccessPayload) => {
    try {
      const db = mongoose.connection.db;
      if (!db) return;
      const today = startOfDay();
      await db.collection('platformmetrics').updateOne(
        { date: today },
        {
          $inc: { totalPayments: 1, totalPaymentValue: p.amount },
          $set: { updatedAt: new Date() },
          $setOnInsert: { date: today, createdAt: new Date() },
        },
        { upsert: true },
      );
    } catch (err) {
      console.error('[analytics] payment:success handler error:', err);
    }
  });

  internalBus.on(EVENTS.USER_REGISTERED, async (_p: UserRegisteredPayload) => {
    try {
      const db = mongoose.connection.db;
      if (!db) return;
      const today = startOfDay();
      await db.collection('platformmetrics').updateOne(
        { date: today },
        {
          $inc: { newUsers: 1 },
          $set: { updatedAt: new Date() },
          $setOnInsert: { date: today, createdAt: new Date() },
        },
        { upsert: true },
      );
    } catch (err) {
      console.error('[analytics] user:registered handler error:', err);
    }
  });

  internalBus.on(EVENTS.DELIVERY_COMPLETED, async (_p: DeliveryCompletedPayload) => {
    try {
      const db = mongoose.connection.db;
      if (!db) return;
      const today = startOfDay();
      await db.collection('platformmetrics').updateOne(
        { date: today },
        {
          $inc: { deliveriesCompleted: 1 },
          $set: { updatedAt: new Date() },
          $setOnInsert: { date: today, createdAt: new Date() },
        },
        { upsert: true },
      );
    } catch (err) {
      console.error('[analytics] delivery:completed handler error:', err);
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfDay(d = new Date()): Date {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
}

// ── Route handlers ────────────────────────────────────────────────────────────

export const trackEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, userId, sessionId, productId, categorySlug, searchQuery, metadata } = req.body as {
      type: string; userId?: string; sessionId?: string; productId?: string;
      categorySlug?: string; searchQuery?: string; metadata?: Record<string, unknown>;
    };
    await AnalyticsEvent.create({ type, userId, sessionId, productId, categorySlug, searchQuery, metadata });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};

export const getSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const docs = await Settings.find().lean();
    const result: Record<string, unknown> = {};
    for (const d of docs) result[d.section] = d.data;
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};

export const saveSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { section, data } = req.body as { section?: string; data?: unknown };
    if (!section) { res.status(400).json({ success: false, error: 'section required' }); return; }
    await Settings.findOneAndUpdate(
      { section },
      { data, updatedAt: new Date() },
      { upsert: true, new: true },
    );
    res.json({ success: true, data: { section, data } });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};

export const adminOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  const db = mongoose.connection.db!;
  const today = startOfDay();

  // ── Order stats ──────────────────────────────────────────────────────────
  let totalOrders = 0, totalRevenue = 0, pendingOrders = 0, todayOrders = 0;
  try {
    const [agg, pending, todayCount] = await Promise.all([
      db.collection('orders').aggregate([
        { $group: { _id: null, total: { $sum: 1 }, revenue: { $sum: '$total' } } },
      ]).toArray(),
      db.collection('orders').countDocuments({ status: 'PENDING' }),
      db.collection('orders').countDocuments({ createdAt: { $gte: today } }),
    ]);
    totalOrders   = (agg[0] as Record<string, number> | undefined)?.total   || 0;
    totalRevenue  = (agg[0] as Record<string, number> | undefined)?.revenue || 0;
    pendingOrders = pending;
    todayOrders   = todayCount;
  } catch { /* non-fatal */ }

  // ── User stats ───────────────────────────────────────────────────────────
  let totalUsers = 0, newToday = 0;
  try {
    [totalUsers, newToday] = await Promise.all([
      db.collection('users').countDocuments({}),
      db.collection('users').countDocuments({ createdAt: { $gte: today } }),
    ]);
  } catch { /* non-fatal */ }

  // ── Product / seller stats ───────────────────────────────────────────────
  let totalProducts = 0, totalSellers = 0, pendingSellers = 0;
  try {
    [totalProducts, totalSellers, pendingSellers] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      db.collection('sellers').countDocuments({ status: 'APPROVED' }),
      db.collection('sellers').countDocuments({ status: 'PENDING' }),
    ]);
  } catch { /* non-fatal */ }

  // ── Revenue by day (last 7) ──────────────────────────────────────────────
  let revenueByDay: { day: string; gmv: number; orders: number }[] = [];
  try {
    const since7 = startOfDay(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
    const rows = await db.collection('platformmetrics').find({ date: { $gte: since7 } }).sort({ date: 1 }).toArray();
    revenueByDay = rows.map((r: Record<string, unknown>) => ({
      day:    new Date(r.date as Date).toLocaleDateString('en', { weekday: 'short' }),
      gmv:    Number(r.totalRevenue) || 0,
      orders: Number(r.totalOrders)  || 0,
    }));
  } catch { /* non-fatal */ }

  if (!revenueByDay.length) {
    revenueByDay = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { day: d.toLocaleDateString('en', { weekday: 'short' }), gmv: 0, orders: 0 };
    });
  }

  // ── Category breakdown ───────────────────────────────────────────────────
  let categoryData: { name: string; value: number; color: string }[] = [];
  const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6'];
  try {
    const cats = await db.collection('orders').aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.category', value: { $sum: '$items.totalPrice' } } },
      { $sort: { value: -1 } },
      { $limit: 6 },
    ]).toArray();
    categoryData = cats.map((c: Record<string, unknown>, i: number) => ({
      name:  String(c._id || 'Other'),
      value: Number(c.value) || 0,
      color: COLORS[i] || '#6b7280',
    }));
  } catch { /* non-fatal */ }

  const recentActions = [
    { message: `${pendingSellers} seller applications pending review`, urgent: pendingSellers > 5,   time: 'Now' },
    { message: `${pendingOrders} orders awaiting fulfillment`,         urgent: pendingOrders > 20,   time: 'Today' },
    { message: `${newToday} new users registered today`,               urgent: false,                time: 'Today' },
  ];

  res.json({
    success: true,
    data: {
      gmv:            totalRevenue,
      gmvChange:      null,
      totalUsers,
      newUsersToday:  newToday,
      totalSellers,
      pendingSellers,
      ordersToday:    todayOrders,
      ordersChange:   null,
      revenueByDay,
      categoryData,
      recentActions,
    },
  });
};

export const platformHealth = async (_req: Request, res: Response): Promise<void> => {
  const db = mongoose.connection.db;

  // Check Mongoose connection state
  const dbOk = mongoose.connection.readyState === 1;

  // Quick collection ping to verify DB is truly responsive
  let dbPing = false;
  try {
    if (db) { await db.command({ ping: 1 }); dbPing = true; }
  } catch { /* ignore */ }

  const metrics = [
    {
      label:     'API Monolith',
      value:     'Operational',
      available: true,
      status:    'good',
      pct:       100,
      target:    '99.9% uptime',
    },
    {
      label:     'MongoDB',
      value:     dbOk && dbPing ? 'Operational' : 'Unavailable',
      available: dbOk && dbPing,
      status:    dbOk && dbPing ? 'good' : 'degraded',
      pct:       dbOk && dbPing ? 100 : 0,
      target:    '99.9% uptime',
    },
  ];

  res.json({
    success: true,
    data: {
      systemStatus: metrics.every(m => m.available) ? 'operational' : 'degraded',
      metrics,
    },
  });
};

export const adminRevenue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const days = Math.min(90, Math.max(1, Number(req.query.days ?? 30)));
    const since = startOfDay(new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000));
    const db = mongoose.connection.db!;

    const rows = await db.collection('platformmetrics').find({ date: { $gte: since } }).sort({ date: 1 }).toArray();
    const rowMap = new Map<string, { revenue: number; orders: number }>();
    for (const r of rows as Record<string, unknown>[]) {
      const key = (r.date as Date).toISOString().split('T')[0];
      rowMap.set(key, { revenue: Number(r.totalRevenue) || 0, orders: Number(r.totalOrders) || 0 });
    }

    const result = Array.from({ length: days }, (_, i) => {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      const row = rowMap.get(key) || { revenue: 0, orders: 0 };
      return { date: key, revenue: row.revenue, orders: row.orders };
    });

    res.json({ success: true, data: result });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};

export const adminSearches = async (_req: Request, res: Response): Promise<void> => {
  try {
    const topSearches = await AnalyticsEvent.aggregate([
      { $match: { type: 'SEARCH', searchQuery: { $exists: true, $ne: null } } },
      { $group: { _id: '$searchQuery', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { query: '$_id', count: 1, _id: 0 } },
    ]);
    res.json({ success: true, data: topSearches });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};

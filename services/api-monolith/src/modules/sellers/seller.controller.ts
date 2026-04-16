/**
 * Sellers module controller.
 *
 * All axios HTTP calls to product-service / order-service / review-service
 * are replaced with direct Mongoose model imports — same process, zero network.
 *
 * Inter-module imports used here:
 *   Product → src/modules/products/models/product.model.ts
 *   Order   → src/modules/orders/models/order.model.ts
 *   Review  → src/modules/reviews/models/review.model.ts
 *
 * EventEmitter:
 *   registerSellerEventHandlers() subscribes to PAYMENT_SUCCESS and credits
 *   each seller their 90% share of the order items they fulfilled.
 */
import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../shared/middleware/auth';
import { Seller } from './models/seller.model';
import { Product } from '../products/models/product.model';
import { Order } from '../orders/models/order.model';
import { Review } from '../reviews/models/review.model';
import { publishEvent } from '../../kafka/producer';
import { internalBus, EVENTS, PaymentSuccessPayload } from '../../shared/events/emitter';
import { handleError } from '../../shared/middleware/error';

const createSellerProductSchema = z.object({
  name:             z.string().min(3),
  description:      z.string().min(10),
  shortDescription: z.string().optional(),
  price:            z.number().positive(),
  salePrice:        z.number().positive().optional(),
  images:           z.array(z.string()).default([]),
  category:         z.string().min(1),
  subCategory:      z.string().optional(),
  brand:            z.string().optional(),
  stock:            z.number().int().min(0).default(0),
  tags:             z.array(z.string()).default([]),
  specifications:   z.record(z.string()).default({}),
  sellerName:       z.string().optional(),
  // isFeatured intentionally excluded — sellers cannot self-feature
  // sellerId intentionally excluded — always set from req.user!.userId
});

// ── EventEmitter subscription ─────────────────────────────────────────────────

export function registerSellerEventHandlers(): void {
  internalBus.on(EVENTS.PAYMENT_SUCCESS, async (p: PaymentSuccessPayload) => {
    try {
      // Find order items, group by sellerId, credit each seller 90%
      const order = await Order.findById(p.orderId);
      if (!order) return;

      const sellerTotals: Record<string, number> = {};
      for (const item of order.items) {
        sellerTotals[item.sellerId] = (sellerTotals[item.sellerId] ?? 0) + item.totalPrice;
      }

      const COMMISSION = 0.10;
      for (const [sellerId, itemTotal] of Object.entries(sellerTotals)) {
        const credit = Math.round(itemTotal * (1 - COMMISSION));
        await Seller.findOneAndUpdate(
          { userId: sellerId },
          { $inc: { balance: credit, totalEarnings: credit, totalOrders: 1 } },
        );
      }
    } catch (err) {
      console.error('[sellers] PAYMENT_SUCCESS handler error:', err);
    }
  });
}

// ── Self-service ──────────────────────────────────────────────────────────────

export const registerSeller = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await Seller.findOne({ userId: req.user!.userId });
    if (existing) { res.status(409).json({ success: false, error: 'Already registered' }); return; }

    const body = req.body as Record<string, unknown>;
    const seller = await Seller.create({
      userId:           req.user!.userId,
      storeName:        body.storeName,
      storeDescription: body.description ?? body.storeDescription,
      phone:            body.phone,
      email:            body.email ?? `${req.user!.userId}@bazzar.com`,
      category:         body.category ?? body.businessType ?? 'General',
      ...(body.logo        ? { logo:        body.logo as string }        : {}),
      ...(body.banner      ? { banner:      body.banner as string }      : {}),
      ...(body.panNumber   ? { panNumber:   body.panNumber as string }   : {}),
      ...(body.bankDetails ? { bankDetails: body.bankDetails as object } : {}),
    });
    res.status(201).json({ success: true, data: seller });
  } catch (err: unknown) { handleError(err, res); }
};

export const getMyStore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const seller = await Seller.findOne({ userId: req.user!.userId });
    if (!seller) { res.status(404).json({ success: false, error: 'Seller profile not found' }); return; }
    const data = { ...seller.toObject(), description: seller.storeDescription, shopName: seller.storeName };
    res.json({ success: true, data });
  } catch (err: unknown) { handleError(err, res); }
};

export const updateStore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body    = req.body as Record<string, unknown>;
    const allowed = ['storeName', 'storeDescription', 'logo', 'banner', 'bankDetails', 'panNumber', 'phone'];
    const updates: Record<string, unknown> = {};
    allowed.forEach(k => { if (body[k] !== undefined) updates[k] = body[k]; });
    if (body.description !== undefined && updates.storeDescription === undefined) updates.storeDescription = body.description;
    const seller = await Seller.findOneAndUpdate({ userId: req.user!.userId }, updates, { new: true });
    const data   = seller ? { ...seller.toObject(), description: seller.storeDescription, shopName: seller.storeName } : null;
    res.json({ success: true, data });
  } catch (err: unknown) { handleError(err, res); }
};

// ── Dashboard — direct DB queries, no HTTP ────────────────────────────────────

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sellerId = req.user!.userId;
    const seller   = await Seller.findOne({ userId: sellerId });
    if (!seller) { res.status(404).json({ success: false, error: 'Seller not found' }); return; }

    const [recentOrderDocs, productCount, topProductDocs, pendingOrderCount] = await Promise.all([
      Order.find({ 'items.sellerId': sellerId }).sort('-createdAt').limit(5),
      Product.countDocuments({ sellerId, isActive: true }),
      Product.find({ sellerId, isActive: true }).sort('-soldCount').limit(4),
      Order.countDocuments({ 'items.sellerId': sellerId, status: { $in: ['PENDING', 'CONFIRMED', 'PROCESSING'] } }),
    ]);

    // Revenue chart: last 7 days
    const revenueChart: { day: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end   = new Date(start.getTime() + 86400000);
      const dayOrders = recentOrderDocs.filter(o => o.createdAt >= start && o.createdAt < end);
      const revenue = dayOrders.reduce((s, o) => {
        return s + o.items.filter(it => it.sellerId === sellerId).reduce((a, it) => a + it.totalPrice, 0);
      }, 0);
      revenueChart.push({ day: start.toLocaleDateString('en', { weekday: 'short' }), revenue });
    }

    const recentOrders = recentOrderDocs.map(o => ({
      id:      o.id,
      product: o.items[0]?.productName ?? '—',
      buyer:   '—',
      amount:  o.total,
      status:  o.status,
      date:    o.createdAt,
    }));
    const topProducts = topProductDocs.map(p => ({ name: p.name, sales: p.soldCount, _id: p.id }));

    res.json({ success: true, data: {
      // Web frontend fields
      revenue:      seller.totalEarnings,
      orders:       seller.totalOrders,
      products:     productCount,
      customers:    0,
      rating:       seller.rating,
      recentOrders,
      topProducts,
      // Mobile app aliases
      totalRevenue:  seller.totalEarnings,
      totalOrders:   seller.totalOrders,
      totalProducts: productCount,
      pendingOrders: pendingOrderCount,
      revenueChart,
    }});
  } catch (err: unknown) { handleError(err, res); }
};

// ── Products — direct Mongoose ────────────────────────────────────────────────

export const getSellerProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50 } = req.query as { page?: string; limit?: string };
    const skip    = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find({ sellerId: req.user!.userId, isActive: true }).skip(skip).limit(Number(limit)),
      Product.countDocuments({ sellerId: req.user!.userId, isActive: true }),
    ]);
    res.json({ success: true, data: products, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err: unknown) { handleError(err, res); }
};

export const createSellerProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = createSellerProductSchema.parse({
      ...req.body,
      price: Number(req.body.price ?? req.body.basePrice),
      stock: Number(req.body.stock ?? 0),
    });
    const product = await Product.create({ ...body, sellerId: req.user!.userId });
    res.status(201).json({ success: true, data: product });
  } catch (err: unknown) { handleError(err, res); }
};

export const updateSellerProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findOneAndUpdate({ _id: req.params.id, sellerId: req.user!.userId }, req.body, { new: true });
    if (!product) { res.status(404).json({ success: false, error: 'Product not found' }); return; }
    res.json({ success: true, data: product });
  } catch (err: unknown) { handleError(err, res); }
};

export const deleteSellerProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Product.findOneAndUpdate({ _id: req.params.id, sellerId: req.user!.userId }, { isActive: false });
    res.json({ success: true, data: null });
  } catch (err: unknown) { handleError(err, res); }
};

// ── Orders — direct Mongoose ──────────────────────────────────────────────────

export const getSellerOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, status } = req.query as { page?: string; limit?: string; status?: string };
    const filter: Record<string, unknown> = { 'items.sellerId': req.user!.userId };
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter).sort('-createdAt').skip(skip).limit(Number(limit)),
      Order.countDocuments(filter),
    ]);
    res.json({ success: true, data: orders, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err: unknown) { handleError(err, res); }
};

export const getSellerOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) { res.status(404).json({ success: false, error: 'Order not found' }); return; }
    // Ensure seller actually has items in this order
    const hasSeller = order.items.some(i => i.sellerId === req.user!.userId);
    if (!hasSeller) { res.status(403).json({ success: false, error: 'Forbidden' }); return; }
    res.json({ success: true, data: order });
  } catch (err: unknown) { handleError(err, res); }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body as { status: string };
    const valid = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!valid.includes(status)) { res.status(400).json({ success: false, error: 'Invalid status' }); return; }
    const order = await Order.findById(req.params.orderId);
    if (!order) { res.status(404).json({ success: false, error: 'Order not found' }); return; }
    const hasSeller = order.items.some(i => i.sellerId === req.user!.userId);
    if (!hasSeller) { res.status(403).json({ success: false, error: 'Forbidden' }); return; }
    order.status = status as typeof order.status;
    order.statusHistory.push({ status, timestamp: new Date() });
    await order.save();
    res.json({ success: true, data: order });
  } catch (err: unknown) { handleError(err, res); }
};

// ── Analytics — direct Mongoose aggregation ───────────────────────────────────

export const getSellerAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sellerId = req.user!.userId;
    const seller   = await Seller.findOne({ userId: sellerId });
    if (!seller) { res.status(404).json({ success: false, error: 'Seller not found' }); return; }

    const since = new Date(); since.setMonth(since.getMonth() - 6);
    const orders = await Order.find({ 'items.sellerId': sellerId, createdAt: { $gte: since } });

    // Monthly revenue
    const monthMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('en', { month: 'short' });
      monthMap[key] = 0;
    }
    orders.forEach(o => {
      const key = new Date(o.createdAt).toLocaleString('en', { month: 'short' });
      if (key in monthMap) {
        const sellerItems = o.items.filter(i => i.sellerId === sellerId);
        monthMap[key] += sellerItems.reduce((s, i) => s + i.totalPrice, 0);
      }
    });

    // Top products
    const prodMap: Record<string, { name: string; sold: number; revenue: number }> = {};
    orders.forEach(o => {
      o.items.filter(i => i.sellerId === sellerId).forEach(item => {
        if (!prodMap[item.productName]) prodMap[item.productName] = { name: item.productName, sold: 0, revenue: 0 };
        prodMap[item.productName].sold    += item.quantity;
        prodMap[item.productName].revenue += item.totalPrice;
      });
    });
    const topProducts = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Prior period: same 6-month window shifted back 6 months (D-18)
    const prevEnd   = new Date(since);
    const prevSince = new Date(since);
    prevSince.setMonth(prevSince.getMonth() - 6);

    const prevOrders = await Order.find({
      'items.sellerId': sellerId,
      createdAt:        { $gte: prevSince, $lt: prevEnd },
    }).lean();

    let prevRevenue = 0;
    const prevCustomerSet = new Set<string>();
    for (const o of prevOrders) {
      const sellerItems = (o.items as Array<{ sellerId: string; totalPrice: number }>)
        .filter(i => i.sellerId === sellerId);
      prevRevenue += sellerItems.reduce((s, i) => s + i.totalPrice, 0);
      prevCustomerSet.add(o.userId as string);
    }
    const prevOrderCount = prevOrders.length;
    const prevAvgOrder   = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0;

    const totalRevenue = seller.totalEarnings;
    const totalOrders  = seller.totalOrders;
    const avgOrder     = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const currentCustomerSet = new Set<string>(orders.map(o => o.userId as unknown as string));

    function pctChange(current: number, prev: number): number {
      if (prev === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - prev) / prev) * 100);
    }

    res.json({ success: true, data: {
      revenue:        { current: totalRevenue, prev: prevRevenue,    change: pctChange(totalRevenue, prevRevenue) },
      orders:         { current: totalOrders,  prev: prevOrderCount, change: pctChange(totalOrders, prevOrderCount) },
      customers:      { current: currentCustomerSet.size, prev: prevCustomerSet.size, change: pctChange(currentCustomerSet.size, prevCustomerSet.size) },
      avgOrder:       { current: avgOrder, prev: prevAvgOrder, change: pctChange(avgOrder, prevAvgOrder) },
      topProducts,
      revenueByMonth: Object.entries(monthMap).map(([month, revenue]) => ({ month, revenue })),
    }});
  } catch (err: unknown) { handleError(err, res); }
};

// ── Reviews — direct Mongoose ─────────────────────────────────────────────────

export const getSellerReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sellerId  = req.user!.userId;
    const products  = await Product.find({ sellerId, isActive: true }).select('_id').limit(100);
    const productIds = products.map(p => String(p._id));
    if (productIds.length === 0) { res.json({ success: true, data: [] }); return; }
    const reviews = await Review.find({ productId: { $in: productIds }, isActive: true }).sort('-createdAt').limit(200);
    res.json({ success: true, data: reviews });
  } catch (err: unknown) { handleError(err, res); }
};

// ── Inventory ─────────────────────────────────────────────────────────────────

export const getSellerInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50 } = req.query as { page?: string; limit?: string };
    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find({ sellerId: req.user!.userId }).skip(skip).limit(Number(limit)),
      Product.countDocuments({ sellerId: req.user!.userId }),
    ]);
    const inventory = products.map(p => ({
      _id:               p.id,
      name:              p.name,
      sku:               p.sku,
      stock:             p.stock,
      lowStockThreshold: 10,
      images:            p.images,
      basePrice:         p.price,
      category:          p.category,
      isActive:          p.isActive,
    }));
    res.json({ success: true, data: inventory, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err: unknown) { handleError(err, res); }
};

export const updateInventoryStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { stock } = req.body as { stock?: number };
    if (stock === undefined || stock < 0) { res.status(400).json({ success: false, error: 'Valid stock required' }); return; }
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, sellerId: req.user!.userId },
      { stock },
      { new: true },
    );
    if (!product) { res.status(404).json({ success: false, error: 'Product not found' }); return; }
    res.json({ success: true, data: product });
  } catch (err: unknown) { handleError(err, res); }
};

// ── Payouts ───────────────────────────────────────────────────────────────────

export const getPayouts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const seller = await Seller.findOne({ userId: req.user!.userId });
    if (!seller) { res.status(404).json({ success: false, error: 'Seller not found' }); return; }
    res.json({ success: true, data: { balance: { available: seller.balance, pending: 0, total: seller.totalEarnings }, payouts: [] } });
  } catch (err: unknown) { handleError(err, res); }
};

export const requestPayout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, bankName, accountNumber } = req.body as { amount?: number; bankName?: string; accountNumber?: string };
    if (!amount || amount <= 0) { res.status(400).json({ success: false, error: 'Invalid amount' }); return; }
    const seller = await Seller.findOne({ userId: req.user!.userId });
    if (!seller) { res.status(404).json({ success: false, error: 'Seller not found' }); return; }
    if (seller.balance < amount) { res.status(400).json({ success: false, error: 'Insufficient balance' }); return; }
    await Seller.findOneAndUpdate({ userId: req.user!.userId }, { $inc: { balance: -amount } });
    res.json({ success: true, data: { id: `PAY-${Date.now()}`, amount, bankName, accountNumber, status: 'PENDING', createdAt: new Date().toISOString() } });
  } catch (err: unknown) { handleError(err, res); }
};

// ── Bank details ──────────────────────────────────────────────────────────────

export const getBankDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const seller = await Seller.findOne({ userId: req.user!.userId }).select('bankDetails');
    res.json({ success: true, data: seller?.bankDetails ?? {} });
  } catch (err: unknown) { handleError(err, res); }
};

export const updateBankDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bankName, accountNumber, accountHolder } = req.body as { bankName: string; accountNumber: string; accountHolder: string };
    const seller = await Seller.findOneAndUpdate({ userId: req.user!.userId }, { bankDetails: { bankName, accountNumber, accountName: accountHolder } }, { new: true });
    res.json({ success: true, data: seller?.bankDetails });
  } catch (err: unknown) { handleError(err, res); }
};

export const updateNotificationPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Seller.findOneAndUpdate({ userId: req.user!.userId }, { notificationPreferences: req.body });
    res.json({ success: true, data: req.body });
  } catch (err: unknown) { handleError(err, res); }
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const getAllSellers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, status } = req.query as { page?: string; limit?: string; status?: string };
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    const sellers = await Seller.find(filter).sort('-createdAt').skip((Number(page) - 1) * Number(limit)).limit(Number(limit));
    res.json({ success: true, data: sellers });
  } catch (err: unknown) { handleError(err, res); }
};

export const approveSeller = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const seller = await Seller.findByIdAndUpdate(req.params.id, { status: 'ACTIVE' }, { new: true });
    if (seller) publishEvent('seller.approved', { sellerId: seller.id, userId: seller.userId }).catch(() => {});
    res.json({ success: true, data: seller });
  } catch (err: unknown) { handleError(err, res); }
};

export const suspendSeller = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const seller = await Seller.findByIdAndUpdate(req.params.id, { status: 'SUSPENDED' }, { new: true });
    res.json({ success: true, data: seller });
  } catch (err: unknown) { handleError(err, res); }
};

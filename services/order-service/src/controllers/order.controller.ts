import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { Order } from '../models/order.model';
import { z } from 'zod';

const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(), productName: z.string(), productImage: z.string().optional().default(''),
    sellerId: z.string(), sellerName: z.string(), unitPrice: z.number(), quantity: z.number().int().positive(),
  })),
  shippingAddress: z.object({
    fullName: z.string(), phone: z.string(), addressLine1: z.string(),
    addressLine2: z.string().optional(), city: z.string(), district: z.string(), province: z.string(),
  }),
  paymentMethod: z.string(),
  couponCode: z.string().optional(),
  notes: z.string().optional(),
});

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const body = createOrderSchema.parse(req.body);
    const subtotal = body.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const shippingFee = subtotal >= 1000 ? 0 : 100;
    let discount = 0;
    if (body.couponCode === 'BAZZAR10') discount = Math.round(subtotal * 0.1);
    const total = Math.max(0, subtotal + shippingFee - discount);
    const items = body.items.map((i) => ({ ...i, totalPrice: i.unitPrice * i.quantity }));
    const order = await Order.create({
      userId: req.user!.userId,
      items,
      shippingAddress: body.shippingAddress,
      paymentMethod: body.paymentMethod,
      subtotal, shippingFee, discount, total,
      couponCode: body.couponCode,
      notes: body.notes,
      statusHistory: [{ status: 'PENDING', timestamp: new Date() }],
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    });
    res.status(201).json({ success: true, data: order });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter: any = { userId: req.user!.userId };
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter).sort('-createdAt').skip(skip).limit(Number(limit)),
      Order.countDocuments(filter),
    ]);
    res.json({ success: true, data: orders, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user!.userId });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Not found' });
    order.status = status;
    order.statusHistory.push({ status, timestamp: new Date(), note });
    if (status === 'SHIPPED' && !order.trackingNumber) {
      order.trackingNumber = 'TRK-' + Date.now().toString(36).toUpperCase();
    }
    await order.save();
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user!.userId });
    if (!order) return res.status(404).json({ success: false, error: 'Not found' });
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      return res.status(400).json({ success: false, error: 'Cannot cancel order at this stage' });
    }
    order.status = 'CANCELLED';
    order.statusHistory.push({ status: 'CANCELLED', timestamp: new Date(), note: req.body.reason });
    await order.save();
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const returnOrder = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user!.userId });
    if (!order) return res.status(404).json({ success: false, error: 'Not found' });
    if (order.status !== 'DELIVERED') {
      return res.status(400).json({ success: false, error: 'Only delivered orders can be returned' });
    }
    order.status = 'RETURN_REQUESTED';
    order.statusHistory.push({ status: 'RETURN_REQUESTED', timestamp: new Date(), note: req.body.reason });
    await order.save();
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getAdminStats = async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [totalOrders, todayOrders, pendingOrders, revenueAgg] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.countDocuments({ status: { $in: ['PENDING', 'CONFIRMED'] } }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]),
    ]);
    const totalRevenue = revenueAgg[0]?.total ?? 0;
    res.json({ success: true, data: { totalOrders, todayOrders, pendingOrders, totalRevenue } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getRevenueByDay = async (req: AuthRequest, res: Response) => {
  try {
    const days = Math.min(Number(req.query.days ?? 7), 90);
    const since = new Date();
    since.setDate(since.getDate() - days);
    const agg = await Order.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $nin: ['CANCELLED', 'RETURN_REQUESTED'] } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const result = agg.map((r: any) => ({
      day: new Date(r._id).toLocaleDateString('en', { weekday: 'short' }),
      date: r._id,
      gmv: r.revenue,
      revenue: r.revenue,
      orders: r.orders,
    }));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getCategoryBreakdown = async (req: AuthRequest, res: Response) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const agg = await Order.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $nin: ['CANCELLED'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.category', value: { $sum: '$items.totalPrice' } } },
      { $sort: { value: -1 } },
      { $limit: 6 },
    ]);
    const colors = ['#F97316', '#2563EB', '#7C3AED', '#059669', '#EC4899', '#F59E0B'];
    const result = agg.map((r: any, i: number) => ({
      name: r._id || 'Other',
      value: r.value,
      color: colors[i % colors.length],
    }));
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// For seller/admin
export const getAllOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status, sellerId } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    if (sellerId) filter['items.sellerId'] = sellerId;
    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter).sort('-createdAt').skip(skip).limit(Number(limit)),
      Order.countDocuments(filter),
    ]);
    res.json({ success: true, data: orders, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

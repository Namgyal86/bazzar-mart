/**
 * Orders module controller.
 *
 * Key change from microservice version:
 *  • HTTP calls to notification-service (port 8008) are REMOVED.
 *    Replaced by publishing to Kafka topic `order.status_updated` which
 *    notification-service already consumes.
 *
 *  • The orders module subscribes to internal EventEmitter events (registered
 *    in registerOrderEventHandlers() called from server.ts):
 *      - PAYMENT_SUCCESS  → status CONFIRMED + paymentStatus PAID
 *      - PAYMENT_FAILED   → status CANCELLED + paymentStatus FAILED
 *      - DELIVERY_COMPLETED → status DELIVERED
 */
import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../shared/middleware/auth';
import { Order } from './models/order.model';
import { Coupon } from './models/coupon.model';
import { Product } from '../products/models/product.model';
import { publishEvent } from '../../kafka/producer';
import { internalBus, EVENTS, PaymentSuccessPayload, PaymentFailedPayload, DeliveryCompletedPayload } from '../../shared/events/emitter';
import { handleError } from '../../shared/middleware/error';

// ── Validation ────────────────────────────────────────────────────────────────

const createOrderSchema = z.object({
  items: z.array(z.object({
    productId:    z.string(),
    productName:  z.string(),
    productImage: z.string().optional().default(''),
    sellerId:     z.string(),
    sellerName:   z.string(),
    unitPrice:    z.number(),
    quantity:     z.number().int().positive(),
  })),
  shippingAddress: z.object({
    fullName:     z.string(),
    phone:        z.string(),
    addressLine1: z.string(),
    addressLine2: z.string().optional(),
    city:         z.string(),
    district:     z.string(),
    province:     z.string(),
  }),
  paymentMethod: z.string(),
  couponCode:    z.string().optional(),
  notes:         z.string().optional(),
});

// ── Internal EventEmitter subscriptions ──────────────────────────────────────

/**
 * Register all event handlers for the orders module.
 * Called once at server startup — replaces Kafka consumers for
 * payment.success / payment.failed (now in-process events).
 */
export function registerOrderEventHandlers(): void {
  internalBus.on(EVENTS.PAYMENT_SUCCESS, async (p: PaymentSuccessPayload) => {
    try {
      const order = await Order.findById(p.orderId);
      if (!order) return;
      order.status        = 'CONFIRMED';
      order.paymentStatus = 'PAID';
      order.statusHistory.push({ status: 'CONFIRMED', timestamp: new Date(), note: `Payment via ${p.gateway}` });
      await order.save();
      // Notify buyer via Kafka → notification-service
      await publishEvent('order.status_updated', {
        orderId: p.orderId, userId: order.userId, status: 'CONFIRMED',
        message: 'Your order has been confirmed and is being prepared.',
      });
    } catch (err) {
      console.error('[orders] PAYMENT_SUCCESS handler error:', err);
    }
  });

  internalBus.on(EVENTS.PAYMENT_FAILED, async (p: PaymentFailedPayload) => {
    try {
      const order = await Order.findById(p.orderId);
      if (!order) return;
      order.status        = 'CANCELLED';
      order.paymentStatus = 'FAILED';
      order.statusHistory.push({ status: 'CANCELLED', timestamp: new Date(), note: 'Payment failed' });
      await order.save();
      await publishEvent('order.status_updated', {
        orderId: p.orderId, userId: order.userId, status: 'CANCELLED',
        message: 'Your order has been cancelled due to payment failure.',
      });
    } catch (err) {
      console.error('[orders] PAYMENT_FAILED handler error:', err);
    }
  });

  internalBus.on(EVENTS.DELIVERY_COMPLETED, async (p: DeliveryCompletedPayload) => {
    try {
      const order = await Order.findById(p.orderId);
      if (!order) return;
      order.status = 'DELIVERED';
      order.statusHistory.push({ status: 'DELIVERED', timestamp: new Date() });
      await order.save();
      await publishEvent('order.status_updated', {
        orderId: p.orderId, userId: order.userId, status: 'DELIVERED',
        message: 'Your order has been delivered. Enjoy!',
      });
    } catch (err) {
      console.error('[orders] DELIVERY_COMPLETED handler error:', err);
    }
  });
}

// ── Route handlers ────────────────────────────────────────────────────────────

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = createOrderSchema.parse(req.body);

    // ── 1. Fetch products and validate availability + prices ──────────────────
    const productIds = [...new Set(body.items.map(i => i.productId))];
    const products   = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    for (const item of body.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        res.status(400).json({ success: false, error: `"${item.productName}" is no longer available` });
        return;
      }
      const dbPrice = product.salePrice ?? product.price;
      // Reject if client price differs by more than 1 paisa (floating-point tolerance)
      if (Math.abs(item.unitPrice - dbPrice) > 1) {
        res.status(400).json({ success: false, error: `Price has changed for "${product.name}". Please refresh your cart.` });
        return;
      }
      if (product.stock < item.quantity) {
        res.status(400).json({ success: false, error: `Only ${product.stock} unit(s) of "${product.name}" left in stock.` });
        return;
      }
    }

    // ── 2. Atomic stock decrement — guards against concurrent orders ──────────
    const decrements = await Promise.all(
      body.items.map(item =>
        Product.findOneAndUpdate(
          { _id: item.productId, isActive: true, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true },
        )
      )
    );

    const failedIdx = decrements.findIndex(r => r === null);
    if (failedIdx !== -1) {
      // Rollback any items that were successfully decremented
      await Promise.all(
        decrements.map((result, i) =>
          result !== null
            ? Product.findByIdAndUpdate(body.items[i].productId, { $inc: { stock: body.items[i].quantity } })
            : null
        )
      ).catch(e => console.error('[orders] stock rollback error:', e));
      res.status(409).json({ success: false, error: `Insufficient stock for "${body.items[failedIdx].productName}". Please try again.` });
      return;
    }

    // ── 3. Build items with server-side prices + category ─────────────────────
    const items = body.items.map(i => {
      const product   = productMap.get(i.productId)!;
      const unitPrice = product.salePrice ?? product.price;
      return { ...i, unitPrice, totalPrice: unitPrice * i.quantity, category: product.category };
    });

    const subtotal    = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const shippingFee = subtotal >= 1000 ? 0 : 100;
    let discount = 0;

    if (body.couponCode) {
      if (body.couponCode.toUpperCase() === 'BAZZAR10') {
        discount = Math.round(subtotal * 0.1);
      } else {
        const coupon = await Coupon.findOne({ code: body.couponCode.toUpperCase(), isActive: true });
        if (
          coupon &&
          coupon.usageCount < coupon.usageLimit &&
          (!coupon.validUntil || new Date() <= coupon.validUntil) &&
          subtotal >= coupon.minOrder
        ) {
          discount = coupon.type === 'PERCENTAGE'
            ? Math.round((subtotal * coupon.value) / 100)
            : coupon.value;
          if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
          Coupon.findByIdAndUpdate(coupon._id, { $inc: { usageCount: 1 } }).catch(() => {});
        }
      }
    }

    const total = Math.max(0, subtotal + shippingFee - discount);

    // ── 4. Create order ───────────────────────────────────────────────────────
    const order = await Order.create({
      userId: req.user!.userId,
      items, shippingAddress: body.shippingAddress,
      paymentMethod: body.paymentMethod,
      subtotal, shippingFee, discount, total,
      couponCode: body.couponCode, notes: body.notes,
      statusHistory:     [{ status: 'PENDING', timestamp: new Date() }],
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    });

    res.status(201).json({ success: true, data: order });

    // In-process: referrals module checks for first-order reward
    internalBus.emit(EVENTS.ORDER_CREATED, {
      orderId: order.id, userId: req.user!.userId, total, couponCode: body.couponCode,
    });

    // External: notification-service via Kafka
    publishEvent('order.created', {
      orderId:    order.id,
      userId:     req.user!.userId,
      total,
      items:      items.map(i => ({ productId: i.productId, quantity: i.quantity, sellerId: i.sellerId })),
      couponCode: body.couponCode,
    }).catch(() => {});

    publishEvent('order.status_updated', {
      orderId: order.id, userId: req.user!.userId, status: 'PENDING',
      message: `Your order #${order.id.toString().slice(-8).toUpperCase()} has been placed successfully.`,
      type: 'ORDER_PLACED',
    }).catch(() => {});

  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter: Record<string, unknown> = { userId: req.user!.userId };
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter).sort('-createdAt').skip(skip).limit(Number(limit)),
      Order.countDocuments(filter),
    ]);
    res.json({ success: true, data: orders, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user!.userId });
    if (!order) { res.status(404).json({ success: false, error: 'Order not found' }); return; }
    res.json({ success: true, data: order });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, note } = req.body as { status: string; note?: string };
    const order = await Order.findById(req.params.id);
    if (!order) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    order.status = status as typeof order.status;
    order.statusHistory.push({ status, timestamp: new Date(), note });
    if (status === 'SHIPPED' && !order.trackingNumber) {
      order.trackingNumber = 'TRK-' + Date.now().toString(36).toUpperCase();
    }
    await order.save();
    res.json({ success: true, data: order });

    const statusMessages: Record<string, string> = {
      CONFIRMED:        'Your order has been confirmed and is being prepared.',
      SHIPPED:          `Your order is on the way! Tracking: ${order.trackingNumber ?? ''}`,
      OUT_FOR_DELIVERY: 'Your order is out for delivery today.',
      DELIVERED:        'Your order has been delivered. Enjoy!',
      CANCELLED:        'Your order has been cancelled.',
    };
    const message = statusMessages[status];
    if (message) {
      publishEvent('order.status_updated', { orderId: order.id, userId: order.userId, status, message }).catch(() => {});
    }
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user!.userId });
    if (!order) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      res.status(400).json({ success: false, error: 'Cannot cancel order at this stage' }); return;
    }
    order.status = 'CANCELLED';
    order.statusHistory.push({ status: 'CANCELLED', timestamp: new Date(), note: (req.body as { reason?: string }).reason });
    await order.save();
    res.json({ success: true, data: order });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const returnOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user!.userId });
    if (!order) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    if (order.status !== 'DELIVERED') {
      res.status(400).json({ success: false, error: 'Only delivered orders can be returned' }); return;
    }
    order.status = 'RETURN_REQUESTED';
    order.statusHistory.push({ status: 'RETURN_REQUESTED', timestamp: new Date(), note: (req.body as { reason?: string }).reason });
    await order.save();
    res.json({ success: true, data: order });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const getAllOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 20, status, sellerId } = req.query;
    const filter: Record<string, unknown> = {};
    if (status)   filter.status            = status;
    if (sellerId) filter['items.sellerId'] = sellerId;
    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter).sort('-createdAt').skip(skip).limit(Number(limit)),
      Order.countDocuments(filter),
    ]);
    res.json({ success: true, data: orders, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const getAdminStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [totalOrders, todayOrders, pendingOrders, revenueAgg] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.countDocuments({ status: { $in: ['PENDING', 'CONFIRMED'] } }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]),
    ]);
    res.json({ success: true, data: { totalOrders, todayOrders, pendingOrders, totalRevenue: revenueAgg[0]?.total ?? 0 } });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const getRevenueByDay = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const days  = Math.min(Number((req.query as { days?: string }).days ?? 7), 90);
    const since = new Date(); since.setDate(since.getDate() - days);
    const agg = await Order.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $nin: ['CANCELLED', 'RETURN_REQUESTED'] } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const result = agg.map((r: { _id: string; revenue: number; orders: number }) => ({
      day:     new Date(r._id).toLocaleDateString('en', { weekday: 'short' }),
      date:    r._id,
      gmv:     r.revenue,
      revenue: r.revenue,
      orders:  r.orders,
    }));
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const getCategoryBreakdown = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const since = new Date(); since.setDate(since.getDate() - 30);
    const agg = await Order.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $nin: ['CANCELLED'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.category', value: { $sum: '$items.totalPrice' } } },
      { $sort: { value: -1 } }, { $limit: 6 },
    ]);
    const colors = ['#F97316', '#2563EB', '#7C3AED', '#059669', '#EC4899', '#F59E0B'];
    res.json({ success: true, data: agg.map((r: { _id: string; value: number }, i) => ({ name: r._id || 'Other', value: r.value, color: colors[i % colors.length] })) });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

// ── Coupon handlers ───────────────────────────────────────────────────────────

export const validateCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, subtotal = 0 } = req.body as { code?: string; subtotal?: number };
    if (!code) { res.status(400).json({ success: false, error: 'Coupon code required' }); return; }
    if (code.toUpperCase() === 'BAZZAR10') {
      const discount = Math.round(Number(subtotal) * 0.1);
      res.json({ success: true, data: { valid: true, discount, type: 'PERCENTAGE', value: 10 } }); return;
    }
    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon || coupon.usageCount >= coupon.usageLimit || (coupon.validUntil && new Date() > coupon.validUntil) || Number(subtotal) < coupon.minOrder) {
      res.json({ success: true, data: { valid: false, discount: 0 } }); return;
    }
    let discount = coupon.type === 'PERCENTAGE' ? Math.round((Number(subtotal) * coupon.value) / 100) : coupon.value;
    if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
    res.json({ success: true, data: { valid: true, discount, type: coupon.type, value: coupon.value } });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const listCoupons = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({ success: true, data: await Coupon.find().sort('-createdAt') });
  } catch (err: unknown) { handleError(err, res); }
};

export const createCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json({ success: true, data: coupon });
  } catch (err: unknown) { handleError(err, res); }
};

export const deleteCoupon = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err: unknown) { handleError(err, res); }
};

/**
 * Runs a periodic job to auto-cancel PENDING orders where the user never
 * completed payment. Fires every 30 minutes; cancels orders older than 24h.
 */
import { Order } from './models/order.model';
import { Product } from '../products/models/product.model';
import { Payment } from '../payments/models/payment.model';
import { internalBus, EVENTS } from '../../shared/events/emitter';
import { publishEvent } from '../../kafka/producer';

const PENDING_TTL_MS  = 24 * 60 * 60 * 1000; // 24 hours
const INTERVAL_MS     = 30 * 60 * 1000;       // 30 minutes

async function cancelStaleOrders(): Promise<void> {
  const cutoff = new Date(Date.now() - PENDING_TTL_MS);

  const stale = await Order.find({
    status:    'PENDING',
    createdAt: { $lt: cutoff },
  }).lean();

  if (stale.length === 0) return;

  console.log(`[order-scheduler] cancelling ${stale.length} stale PENDING order(s)`);

  await Promise.all(stale.map(async (order) => {
    try {
      // Restore stock
      await Promise.all(
        order.items.map((item: { productId: string; quantity: number }) =>
          Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } }).catch(() => {}),
        ),
      );

      await Order.findByIdAndUpdate(order._id, {
        status: 'CANCELLED',
        $push:  { statusHistory: { status: 'CANCELLED', timestamp: new Date(), note: 'Auto-cancelled: payment not completed within 24 hours' } },
      });

      // Mark any INITIATED/PENDING payment as FAILED
      const payment = await Payment.findOneAndUpdate(
        { orderId: order._id.toString(), status: { $in: ['PENDING', 'INITIATED'] } },
        { status: 'FAILED' },
        { new: true },
      );

      if (payment) {
        internalBus.emit(EVENTS.PAYMENT_FAILED, {
          paymentId: (payment as unknown as { id: string }).id,
          orderId:   payment.orderId,
          userId:    payment.userId,
          amount:    payment.amount,
          gateway:   payment.gateway,
        });
      }

      publishEvent('order.status_updated', {
        orderId: order._id.toString(),
        userId:  order.userId,
        status:  'CANCELLED',
        message: 'Your order has been cancelled because payment was not completed.',
      }).catch(() => {});
    } catch (err) {
      console.error(`[order-scheduler] failed to cancel order ${order._id.toString()}:`, err);
    }
  }));
}

export function startOrderScheduler(): void {
  // Run once shortly after boot, then on the interval
  setTimeout(() => {
    cancelStaleOrders().catch(console.error);
    setInterval(() => cancelStaleOrders().catch(console.error), INTERVAL_MS);
  }, 60_000); // wait 1 min after startup before first run
}

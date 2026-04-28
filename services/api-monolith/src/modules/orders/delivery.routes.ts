import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../../shared/middleware/auth';
import { handleError } from '../../shared/middleware/error';
import { Order } from './models/order.model';

const router = Router();

const toDeliveryStatus = (orderStatus: string) => {
  if (orderStatus === 'SHIPPED')                         return 'IN_TRANSIT';
  if (orderStatus === 'DELIVERED')                       return 'DELIVERED';
  if (orderStatus === 'CANCELLED' || orderStatus === 'REFUNDED') return 'FAILED';
  return 'PENDING';
};

router.get('/delivery/admin/list', authenticate, requireRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const orders = await Order.find({
      status: { $in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] },
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const deliveries = orders.map((o: any) => ({
      id:        o._id.toString(),
      orderId:   o.orderNumber ?? o._id.toString().slice(-8).toUpperCase(),
      customer:  `${o.shippingAddress?.fullName ?? 'Customer'}`,
      address:   [o.shippingAddress?.addressLine1, o.shippingAddress?.city, o.shippingAddress?.district]
                   .filter(Boolean).join(', '),
      status:    toDeliveryStatus(o.status),
      driver:    o.driverName ?? null,
      total:     o.total,
      createdAt: o.createdAt,
    }));

    res.json({ success: true, data: deliveries });
  } catch (err) { handleError(err, res); }
});

router.get('/delivery/drivers/available', authenticate, async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: 'd1', name: 'Ramesh Sharma', phone: '9841000001', zone: 'Kathmandu' },
      { id: 'd2', name: 'Bikash Thapa',  phone: '9841000002', zone: 'Lalitpur'  },
      { id: 'd3', name: 'Sunil Gurung',  phone: '9841000003', zone: 'Bhaktapur' },
    ],
  });
});

router.patch('/delivery/:orderId/assign', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { driverId } = req.body as { driverId: string };
    const drivers: Record<string, string> = {
      d1: 'Ramesh Sharma', d2: 'Bikash Thapa', d3: 'Sunil Gurung',
    };
    const order = await Order.findById(req.params.orderId);
    if (!order) { res.status(404).json({ success: false, error: 'Order not found' }); return; }
    (order as any).driverName = drivers[driverId] ?? driverId;
    order.status = 'SHIPPED';
    order.statusHistory.push({ status: 'SHIPPED', timestamp: new Date(), note: `Assigned to driver` });
    await order.save();
    res.json({ success: true, data: { driverName: (order as any).driverName } });
  } catch (err) { handleError(err, res); }
});

export default router;

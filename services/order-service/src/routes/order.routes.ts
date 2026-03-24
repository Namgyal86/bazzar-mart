import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { createOrder, getOrders, getOrderById, updateOrderStatus, cancelOrder, returnOrder, getAllOrders, getAdminStats } from '../controllers/order.controller';

const router = Router();
router.use(authenticate);
router.post('/', createOrder);
router.get('/', getOrders);
router.get('/admin/stats', requireRole('ADMIN'), getAdminStats);
router.get('/all', requireRole('ADMIN', 'SELLER'), getAllOrders);
router.get('/:id', getOrderById);
router.put('/:id/status', requireRole('ADMIN', 'SELLER'), updateOrderStatus);
router.post('/:id/cancel', cancelOrder);
router.post('/:id/return', returnOrder);
export default router;

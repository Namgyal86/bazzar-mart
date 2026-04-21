/**
 * Orders + Coupons module routes
 * Mounted at /api/v1 in app.ts — preserves all existing frontend endpoints.
 */
import { Router } from 'express';
import { authenticate, requireRole } from '../../shared/middleware/auth';
import {
  createOrder, getOrders, getOrderById,
  updateOrderStatus, cancelOrder, returnOrder,
  getAllOrders, getAdminStats, getRevenueByDay, getCategoryBreakdown,
  validateCoupon, listCoupons, createCoupon, deleteCoupon, updateCoupon,
} from './order.controller';

const router = Router();

// All order routes require auth
router.use('/orders', authenticate);
router.use('/coupons', authenticate);

// ── Orders ────────────────────────────────────────────────────────────────────
router.post  ('/orders',                              createOrder);
router.get   ('/orders',                              getOrders);
router.get   ('/orders/my',                           getOrders);            // mobile alias
router.get   ('/orders/admin/stats',                  requireRole('ADMIN'), getAdminStats);
router.get   ('/orders/admin/revenue-by-day',         requireRole('ADMIN'), getRevenueByDay);
router.get   ('/orders/admin/category-breakdown',     requireRole('ADMIN'), getCategoryBreakdown);
router.get   ('/orders/all',                          requireRole('ADMIN', 'SELLER'), getAllOrders);
router.get   ('/orders/:id',                          getOrderById);
router.put   ('/orders/:id/status',                   requireRole('ADMIN', 'SELLER'), updateOrderStatus);
router.patch ('/orders/:id/status',                   requireRole('ADMIN', 'SELLER'), updateOrderStatus);
router.post  ('/orders/:id/cancel',                   cancelOrder);
router.post  ('/orders/:id/return',                   returnOrder);

// ── Coupons ───────────────────────────────────────────────────────────────────
router.post  ('/coupons/validate',                    validateCoupon);
router.get   ('/coupons/admin/list',                  requireRole('ADMIN'), listCoupons);
router.post  ('/coupons',                             requireRole('ADMIN'), createCoupon);
router.patch ('/coupons/:id',                         requireRole('ADMIN'), updateCoupon);
router.delete('/coupons/:id',                         requireRole('ADMIN'), deleteCoupon);

export default router;

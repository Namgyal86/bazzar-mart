import { Router } from 'express';
import { authenticate, requireRole } from '../../shared/middleware/auth';
import {
  registerSeller, getMyStore, updateStore, getDashboard,
  getAllSellers, approveSeller, suspendSeller,
  getSellerProducts, getSellerOrders, getSellerOrderById, updateOrderStatus,
  createSellerProduct, updateSellerProduct, deleteSellerProduct,
  getSellerAnalytics, getSellerReviews,
  getSellerInventory, updateInventoryStock,
  getPayouts, requestPayout,
  getBankDetails, updateBankDetails,
  updateNotificationPreferences,
} from './seller.controller';

const router = Router();
router.use('/seller', authenticate);

router.post  ('/seller/apply',           registerSeller);
router.post  ('/seller/register',        registerSeller);
router.get   ('/seller/profile',         getMyStore);
router.get   ('/seller/me',              getMyStore);
router.put   ('/seller/profile',         updateStore);
router.put   ('/seller/me',              updateStore);
router.get   ('/seller/dashboard',       getDashboard);
router.get   ('/seller/analytics',       getSellerAnalytics);
router.get   ('/seller/reviews',         getSellerReviews);

router.get   ('/seller/products',        getSellerProducts);
router.post  ('/seller/products',        createSellerProduct);
router.put   ('/seller/products/:id',    updateSellerProduct);
router.delete('/seller/products/:id',    deleteSellerProduct);

router.get   ('/seller/orders',                   getSellerOrders);
router.get   ('/seller/orders/:orderId',           getSellerOrderById);
router.patch ('/seller/orders/:orderId/status',    updateOrderStatus);

router.get   ('/seller/inventory',       getSellerInventory);
router.patch ('/seller/inventory/:id',   updateInventoryStock);

router.get   ('/seller/payouts',         getPayouts);
router.post  ('/seller/payouts/request', requestPayout);
router.get   ('/seller/bank-details',    getBankDetails);
router.put   ('/seller/bank-details',    updateBankDetails);
router.put   ('/seller/notification-preferences', updateNotificationPreferences);

// Admin
router.get   ('/seller/admin/list',          requireRole('ADMIN'), getAllSellers);
router.post  ('/seller/admin/:id/approve',   requireRole('ADMIN'), approveSeller);
router.patch ('/seller/admin/:id/approve',   requireRole('ADMIN'), approveSeller);
router.post  ('/seller/admin/:id/suspend',   requireRole('ADMIN'), suspendSeller);
router.patch ('/seller/admin/:id/suspend',   requireRole('ADMIN'), suspendSeller);
router.post  ('/seller/admin/:id/reject',    requireRole('ADMIN'), suspendSeller);
router.patch ('/seller/admin/:id/reject',    requireRole('ADMIN'), suspendSeller);
router.put   ('/seller/:id/approve',         requireRole('ADMIN'), approveSeller);

export default router;

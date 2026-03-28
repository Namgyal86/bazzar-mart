import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  registerSeller, getMyStore, updateStore, getDashboard,
  getAllSellers, approveSeller, suspendSeller,
  getSellerProducts, getSellerOrders, getSellerOrderById,
  getPayouts, requestPayout,
  getBankDetails, updateBankDetails,
  updateNotificationPreferences,
  createSellerProduct, updateSellerProduct, deleteSellerProduct,
  getSellerAnalytics, getSellerReviews,
  getSellerInventory, updateInventoryStock, updateOrderStatus,
} from '../controllers/seller.controller';

const router = Router();
router.use(authenticate);

// Seller self-service routes
router.post('/apply', registerSeller);
router.post('/register', registerSeller);        // alias
router.get('/profile', getMyStore);
router.get('/me', getMyStore);                   // alias
router.put('/profile', updateStore);
router.put('/me', updateStore);                  // alias
router.get('/dashboard', getDashboard);
router.get('/products', getSellerProducts);
router.post('/products', createSellerProduct);
router.put('/products/:id', updateSellerProduct);
router.delete('/products/:id', deleteSellerProduct);
router.get('/orders', getSellerOrders);
router.get('/orders/:orderId', getSellerOrderById);
router.get('/analytics', getSellerAnalytics);
router.get('/reviews', getSellerReviews);
router.get('/inventory', getSellerInventory);
router.patch('/inventory/:id', updateInventoryStock);
router.patch('/orders/:orderId/status', updateOrderStatus);

// Payouts
router.get('/payouts', getPayouts);
router.post('/payouts/request', requestPayout);

// Bank details
router.get('/bank-details', getBankDetails);
router.put('/bank-details', updateBankDetails);

// Notification preferences
router.put('/notification-preferences', updateNotificationPreferences);

// Admin routes
router.get('/admin/list', requireRole('ADMIN'), getAllSellers);
router.post('/admin/:id/approve', requireRole('ADMIN'), approveSeller);
router.patch('/admin/:id/approve', requireRole('ADMIN'), approveSeller);   // PATCH alias for mobile
router.post('/admin/:id/suspend', requireRole('ADMIN'), suspendSeller);
router.patch('/admin/:id/suspend', requireRole('ADMIN'), suspendSeller);   // PATCH alias for mobile
router.post('/admin/:id/reject', requireRole('ADMIN'), suspendSeller);     // reject = suspend
router.patch('/admin/:id/reject', requireRole('ADMIN'), suspendSeller);    // PATCH alias for mobile
router.put('/:id/approve', requireRole('ADMIN'), approveSeller);           // alias

export default router;

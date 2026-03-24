import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  registerSeller, getMyStore, updateStore, getDashboard,
  getAllSellers, approveSeller, suspendSeller,
  getSellerProducts, getSellerOrders,
  getPayouts, requestPayout,
  getBankDetails, updateBankDetails,
  updateNotificationPreferences,
  updateSellerProduct, deleteSellerProduct,
  getSellerAnalytics,
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
router.put('/products/:id', updateSellerProduct);
router.delete('/products/:id', deleteSellerProduct);
router.get('/orders', getSellerOrders);
router.get('/analytics', getSellerAnalytics);

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
router.post('/admin/:id/suspend', requireRole('ADMIN'), suspendSeller);
router.put('/:id/approve', requireRole('ADMIN'), approveSeller);  // alias

export default router;

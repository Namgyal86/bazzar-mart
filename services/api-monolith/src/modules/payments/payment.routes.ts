import { Router } from 'express';
import { authenticate, requireRole } from '../../shared/middleware/auth';
import {
  initiatePayment, verifyPayment,
  khaltiCallback, esewaCallback,
  getPaymentByOrder, getAdminPayments,
} from './payment.controller';

const router = Router();

// Gateway browser-redirect callbacks — no auth (gateway redirects buyer's browser)
router.get('/payments/khalti/callback', khaltiCallback);
router.get('/payments/esewa/callback',  esewaCallback);

// Authenticated routes
router.use('/payments', authenticate);
router.post('/payments/initiate',  initiatePayment);
router.post('/payments/verify',    verifyPayment);

// Gateway-specific verify aliases
router.post('/payments/khalti/verify',  (req, _res, next) => { (req.body as { gateway: string }).gateway = 'KHALTI';  next(); }, verifyPayment);
router.post('/payments/esewa/verify',   (req, _res, next) => { (req.body as { gateway: string }).gateway = 'ESEWA';   next(); }, verifyPayment);
router.post('/payments/fonepay/verify', (req, _res, next) => { (req.body as { gateway: string }).gateway = 'FONEPAY'; next(); }, verifyPayment);

router.get('/payments/order/:orderId', getPaymentByOrder);
router.get('/payments/admin/list',     requireRole('ADMIN'), getAdminPayments);

export default router;

import { Router } from 'express';
import { authenticate, requireRole } from '../../shared/middleware/auth';
import {
  initiatePayment, verifyPayment,
  khaltiCallback, khaltiWebhook,
  esewaCallback, esewaWebhook,
  refundPayment,
  getPaymentByOrder, getAdminPayments, getPaymentStats,
} from './payment.controller';

const router = Router();

// Gateway browser-redirect callbacks — no auth (gateway redirects buyer's browser)
router.get('/payments/khalti/callback', khaltiCallback);
router.get('/payments/esewa/callback',  esewaCallback);

// Server-to-server webhook callbacks — no auth (verified by signature inside handler)
router.post('/payments/khalti/webhook', khaltiWebhook);
router.post('/payments/esewa/webhook',  esewaWebhook);

// Authenticated routes
router.post('/payments/initiate',  authenticate, initiatePayment);
router.post('/payments/verify',    authenticate, verifyPayment);
router.post('/payments/refund',    authenticate, refundPayment);

// Gateway-specific verify aliases
router.post('/payments/khalti/verify',  authenticate, (req, _res, next) => { (req.body as { gateway: string }).gateway = 'KHALTI';  next(); }, verifyPayment);
router.post('/payments/esewa/verify',   authenticate, (req, _res, next) => { (req.body as { gateway: string }).gateway = 'ESEWA';   next(); }, verifyPayment);
router.post('/payments/fonepay/verify', authenticate, (req, _res, next) => { (req.body as { gateway: string }).gateway = 'FONEPAY'; next(); }, verifyPayment);

router.get('/payments/order/:orderId', authenticate, getPaymentByOrder);
router.get('/payments/admin/list',     authenticate, requireRole('ADMIN'), getAdminPayments);
router.get('/payments/admin/stats',    authenticate, requireRole('ADMIN'), getPaymentStats);

export default router;

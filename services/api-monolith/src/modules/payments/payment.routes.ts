import { Router } from 'express';
import { authenticate, requireRole } from '../../shared/middleware/auth';
import {
  initiatePayment, verifyPayment,
  khaltiCallback, esewaCallback,
  getPaymentByOrder, getAdminPayments, getPaymentStats,
} from './payment.controller';

const router = Router();

// Gateway browser-redirect callbacks — no auth (gateway redirects buyer's browser)
router.get('/payments/khalti/callback', khaltiCallback);
router.get('/payments/esewa/callback',  esewaCallback);

// Authenticated routes — explicit authenticate on every route instead of router.use()
// (router.use('/payments', fn) in a sub-router does not reliably cover all sub-paths)
router.post('/payments/initiate',  authenticate, initiatePayment);
router.post('/payments/verify',    authenticate, verifyPayment);

// Gateway-specific verify aliases
router.post('/payments/khalti/verify',  authenticate, (req, _res, next) => { (req.body as { gateway: string }).gateway = 'KHALTI';  next(); }, verifyPayment);
router.post('/payments/esewa/verify',   authenticate, (req, _res, next) => { (req.body as { gateway: string }).gateway = 'ESEWA';   next(); }, verifyPayment);
router.post('/payments/fonepay/verify', authenticate, (req, _res, next) => { (req.body as { gateway: string }).gateway = 'FONEPAY'; next(); }, verifyPayment);

router.get('/payments/order/:orderId', authenticate, getPaymentByOrder);
router.get('/payments/admin/list',     authenticate, requireRole('ADMIN'), getAdminPayments);
router.get('/payments/admin/stats',    authenticate, requireRole('ADMIN'), getPaymentStats);

export default router;

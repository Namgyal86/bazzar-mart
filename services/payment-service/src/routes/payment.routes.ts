import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  initiatePayment,
  verifyPayment,
  khaltiCallback,
  getPaymentByOrder,
  getAdminPayments,
} from '../controllers/payment.controller';

const router = Router();

// ── Khalti browser redirect callback (no auth — Khalti redirects the buyer) ───
// Khalti calls return_url with: pidx, status, transaction_id, purchase_order_id, etc.
router.get('/khalti/callback', khaltiCallback);

// ── Authenticated routes ───────────────────────────────────────────────────────
router.use(authenticate);
router.post('/initiate', initiatePayment);
router.post('/verify', verifyPayment);

// Gateway-specific verify aliases
router.post('/khalti/verify',  (req, _res, next) => { req.body.gateway = 'KHALTI';  next(); }, verifyPayment);
router.post('/esewa/verify',   (req, _res, next) => { req.body.gateway = 'ESEWA';   next(); }, verifyPayment);
router.post('/fonepay/verify', (req, _res, next) => { req.body.gateway = 'FONEPAY'; next(); }, verifyPayment);
router.get('/order/:orderId', getPaymentByOrder);

// ── Admin ──────────────────────────────────────────────────────────────────────
router.get('/admin/list', requireRole('ADMIN'), getAdminPayments);

export default router;

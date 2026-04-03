import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  initiatePayment,
  verifyPayment,
  khaltiCallback,
  esewaCallback,
  getPaymentByOrder,
  getAdminPayments,
} from '../controllers/payment.controller';

const router = Router();

// ── Gateway callbacks (no auth — gateway redirects the buyer's browser) ───────
// Khalti: GET /khalti/callback?pidx=...&purchase_order_id=...
router.get('/khalti/callback', khaltiCallback);
// eSewa:  GET /esewa/callback?data=<base64-encoded-json>
router.get('/esewa/callback', esewaCallback);

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

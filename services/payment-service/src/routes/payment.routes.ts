import { Router, raw } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import {
  initiatePayment, verifyPayment, getPaymentByOrder,
  stripeWebhook, razorpayWebhook, getAdminPayments,
} from '../controllers/payment.controller';

const router = Router();

// ── Public webhook endpoints (no auth, raw body for Stripe signature) ─────────
router.post('/webhook/stripe',   raw({ type: 'application/json' }), stripeWebhook);
router.post('/webhook/razorpay', razorpayWebhook);

// ── Authenticated routes ───────────────────────────────────────────────────────
router.use(authenticate);
router.post('/initiate', initiatePayment);
router.post('/verify', verifyPayment);
// Gateway-specific verify aliases
router.post('/khalti/verify',  (req, _res, next) => { req.body.gateway = 'KHALTI'; next(); }, verifyPayment);
router.post('/esewa/verify',   (req, _res, next) => { req.body.gateway = 'ESEWA';  next(); }, verifyPayment);
router.post('/fonepay/verify', (req, _res, next) => { req.body.gateway = 'FONEPAY'; next(); }, verifyPayment);
router.get('/order/:orderId', getPaymentByOrder);

// ── Admin ──────────────────────────────────────────────────────────────────────
router.get('/admin/list', requireRole('ADMIN'), getAdminPayments);

export default router;

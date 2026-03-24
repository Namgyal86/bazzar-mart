import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { initiatePayment, verifyPayment, getPaymentByOrder } from '../controllers/payment.controller';

const router = Router();
router.use(authenticate);
router.post('/initiate', initiatePayment);
router.post('/verify', verifyPayment);
// Gateway-specific verify aliases — inject gateway into body and delegate
router.post('/khalti/verify', (req, res, next) => { req.body.gateway = req.body.gateway || 'KHALTI'; next(); }, verifyPayment);
router.post('/esewa/verify',  (req, res, next) => { req.body.gateway = req.body.gateway || 'ESEWA';  next(); }, verifyPayment);
router.get('/order/:orderId', getPaymentByOrder);
export default router;

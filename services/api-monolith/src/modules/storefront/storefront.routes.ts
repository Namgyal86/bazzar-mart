import { Router } from 'express';
import { authenticate, requireRole } from '../../shared/middleware/auth';
import {
  getMyStorefront, updateMyStorefront, publishStorefront, getPublicStorefront,
} from './storefront.controller';

const router = Router();

// Seller-specific routes MUST be registered before /:sellerId
router.get ('/storefront/my/config',  authenticate, requireRole('SELLER', 'ADMIN'), getMyStorefront);
router.put ('/storefront/my/config',  authenticate, requireRole('SELLER', 'ADMIN'), updateMyStorefront);
router.post('/storefront/my/publish', authenticate, requireRole('SELLER', 'ADMIN'), publishStorefront);

// Public storefront by seller ID
router.get('/storefront/:sellerId', getPublicStorefront);

export default router;

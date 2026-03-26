import { Router } from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getFeaturedProducts, getAdminStats, getFlashDeals, adminSetFlashDeal, adminRemoveFlashDeal } from '../controllers/product.controller';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/admin/stats', getAdminStats);
router.get('/admin/flash-deals', authenticate, requireRole('ADMIN'), getFlashDeals);
router.put('/admin/flash-deal/:id', authenticate, requireRole('ADMIN'), adminSetFlashDeal);
router.delete('/admin/flash-deal/:id', authenticate, requireRole('ADMIN'), adminRemoveFlashDeal);
router.get('/:id', getProductById);
router.post('/', authenticate, requireRole('SELLER', 'ADMIN'), createProduct);
router.put('/:id', authenticate, requireRole('SELLER', 'ADMIN'), updateProduct);
router.delete('/:id', authenticate, requireRole('SELLER', 'ADMIN'), deleteProduct);
export default router;

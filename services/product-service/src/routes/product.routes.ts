import { Router } from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getFeaturedProducts, getAdminStats } from '../controllers/product.controller';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/admin/stats', getAdminStats);
router.get('/:id', getProductById);
router.post('/', authenticate, requireRole('SELLER', 'ADMIN'), createProduct);
router.put('/:id', authenticate, requireRole('SELLER', 'ADMIN'), updateProduct);
router.delete('/:id', authenticate, requireRole('SELLER', 'ADMIN'), deleteProduct);
export default router;

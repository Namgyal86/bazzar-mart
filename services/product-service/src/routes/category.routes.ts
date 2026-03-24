import { Router } from 'express';
import { getCategories, getCategoryBySlug, createCategory } from '../controllers/category.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);
router.post('/', authenticate, requireRole('ADMIN'), createCategory);
export default router;

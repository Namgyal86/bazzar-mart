import { Router } from 'express';
import {
  getCategories, getAllCategories, getCategoriesWithSubs,
  getCategoryBySlug, createCategory, updateCategory, deleteCategory,
} from '../controllers/category.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.get('/', getCategories);
router.get('/with-subs', getCategoriesWithSubs);
router.get('/admin/all', authenticate, requireRole('ADMIN'), getAllCategories);
router.get('/:slug', getCategoryBySlug);
router.post('/', authenticate, requireRole('ADMIN'), createCategory);
router.put('/:id', authenticate, requireRole('ADMIN'), updateCategory);
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteCategory);
export default router;

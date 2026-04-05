/**
 * Products module routes
 * Mounted at /api/v1 in app.ts — preserves all existing frontend endpoints.
 */
import { Router } from 'express';
import { authenticate, requireRole } from '../../shared/middleware/auth';
import {
  getProducts, getProductById, createProduct, updateProduct,
  deleteProduct, getFeaturedProducts, getAdminStats, updateStock,
  getFlashDeals, adminSetFlashDeal, adminRemoveFlashDeal,
  getCategories, getAllCategories, getCategoriesWithSubs, getCategoryBySlug,
  createCategory, updateCategory, deleteCategory,
  getBanners, getAllBanners, createBanner, updateBanner, deleteBanner,
} from './product.controller';

const router = Router();

// ── Products ─────────────────────────────────────────────────────────────────
router.get ('/products',                          getProducts);
router.get ('/products/featured',                 getFeaturedProducts);
router.get ('/products/admin/stats',              getAdminStats);
router.get ('/products/admin/flash-deals',        authenticate, requireRole('ADMIN'), getFlashDeals);
router.put ('/products/admin/flash-deal/:id',     authenticate, requireRole('ADMIN'), adminSetFlashDeal);
router.delete('/products/admin/flash-deal/:id',   authenticate, requireRole('ADMIN'), adminRemoveFlashDeal);
router.get ('/products/:id',                      getProductById);
router.post('/products',                          authenticate, requireRole('SELLER', 'ADMIN'), createProduct);
router.put ('/products/:id',                      authenticate, requireRole('SELLER', 'ADMIN'), updateProduct);
router.patch('/products/:id/stock',               authenticate, requireRole('SELLER', 'ADMIN'), updateStock);
router.delete('/products/:id',                    authenticate, requireRole('SELLER', 'ADMIN'), deleteProduct);

// ── Categories ────────────────────────────────────────────────────────────────
router.get ('/categories',                        getCategories);
router.get ('/categories/with-subs',              getCategoriesWithSubs);
router.get ('/categories/admin/all',              authenticate, requireRole('ADMIN'), getAllCategories);
router.get ('/categories/:slug',                  getCategoryBySlug);
router.post('/categories',                        authenticate, requireRole('ADMIN'), createCategory);
router.put ('/categories/:id',                    authenticate, requireRole('ADMIN'), updateCategory);
router.delete('/categories/:id',                  authenticate, requireRole('ADMIN'), deleteCategory);

// ── Banners ───────────────────────────────────────────────────────────────────
router.get   ('/banners',     getBanners);
router.get   ('/banners/all', getAllBanners);
router.post  ('/banners',     createBanner);
router.put   ('/banners/:id', updateBanner);
router.delete('/banners/:id', deleteBanner);

export default router;

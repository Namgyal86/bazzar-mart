import { Router } from 'express';
import { authenticate, optionalAuth, requireRole } from '../../shared/middleware/auth';
import {
  getProductReviews, createReview, deleteReview, markHelpful,
  adminListReviews, adminApproveReview, adminRejectReview, adminDeleteReview,
} from './review.controller';

const router = Router();

// Product-scoped review endpoints (two URL patterns for compatibility)
router.get   ('/products/:productId/reviews',       optionalAuth, getProductReviews);
router.post  ('/products/:productId/reviews',       authenticate, createReview);
router.delete('/products/:productId/reviews/:id',   authenticate, deleteReview);
router.get   ('/reviews/:productId',                optionalAuth, getProductReviews);
router.post  ('/reviews/:productId',                authenticate, createReview);

// Helpful vote
router.post('/reviews/:reviewId/helpful', authenticate, markHelpful);

// Admin
router.get   ('/reviews/admin/list',       authenticate, requireRole('ADMIN'), adminListReviews);
router.patch ('/reviews/admin/:id/approve', authenticate, adminApproveReview);
router.patch ('/reviews/admin/:id/reject',  authenticate, adminRejectReview);
router.delete('/reviews/admin/:id',         authenticate, adminDeleteReview);

export default router;

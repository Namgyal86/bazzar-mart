import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { getProductReviews, createReview, deleteReview, markHelpful, adminListReviews, adminUpdateReviewStatus, adminDeleteReview } from '../controllers/review.controller';

const router = Router({ mergeParams: true });
router.get('/', optionalAuth, getProductReviews);
router.post('/', authenticate, createReview);
router.delete('/:id', authenticate, deleteReview);
export default router;

// Standalone helpful route (mounted at /api/v1/reviews/:reviewId/helpful)
export const helpfulRouter = Router({ mergeParams: true });
helpfulRouter.post('/:reviewId/helpful', authenticate, markHelpful);

// Admin review management
export const adminReviewRouter = Router();
adminReviewRouter.get('/admin/list', adminListReviews);
adminReviewRouter.patch('/admin/:id/approve', authenticate, (req: any, res) => { req.params.status = 'approve'; adminUpdateReviewStatus(req, res); });
adminReviewRouter.patch('/admin/:id/reject', authenticate, (req: any, res) => { req.params.status = 'reject'; adminUpdateReviewStatus(req, res); });
adminReviewRouter.delete('/admin/:id', authenticate, adminDeleteReview);

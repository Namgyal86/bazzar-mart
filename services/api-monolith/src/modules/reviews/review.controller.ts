/**
 * Reviews module controller.
 *
 * After a review is posted:
 *   1. emit internalBus REVIEW_POSTED → products module recalculates rating in-process.
 *   2. publish Kafka review.posted → recommendation-service (kept separate).
 */
import { Request, Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth';
import { Review } from './models/review.model';
import { Product } from '../products/models/product.model';
import { publishEvent } from '../../kafka/producer';
import { internalBus, EVENTS, ReviewPostedPayload } from '../../shared/events/emitter';

// ── EventEmitter subscription ─────────────────────────────────────────────────

export function registerReviewEventHandlers(): void {
  internalBus.on(EVENTS.REVIEW_POSTED, async (p: ReviewPostedPayload) => {
    try {
      const agg = await Review.aggregate([
        { $match: { productId: p.productId, isActive: true } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]);
      if (agg.length > 0) {
        await Product.findByIdAndUpdate(p.productId, {
          rating:      Number(agg[0].avg.toFixed(1)),
          reviewCount: agg[0].count,
        });
      }
    } catch (err) {
      console.error('[reviews] REVIEW_POSTED handler error:', err);
    }
  });
}

// ── Route handlers ────────────────────────────────────────────────────────────

export const getProductReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query as { page?: string; limit?: string };
    const skip = (Number(page) - 1) * Number(limit);
    const [reviews, total] = await Promise.all([
      Review.find({ productId: req.params.productId, isActive: true }).sort('-createdAt').skip(skip).limit(Number(limit)),
      Review.countDocuments({ productId: req.params.productId, isActive: true }),
    ]);
    const avgRating = reviews.length
      ? Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1))
      : 0;
    res.json({ success: true, data: { reviews, avgRating, total, page: Number(page), limit: Number(limit) } });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as {
      rating: number; title: string; body: string;
      images?: string[]; productName?: string;
      userName?: string; userAvatar?: string;
    };

    const existing = await Review.findOne({ productId: req.params.productId, userId: req.user!.userId });
    if (existing) { res.status(409).json({ success: false, error: 'You already reviewed this product' }); return; }

    const review = await Review.create({
      productId:   req.params.productId,
      userId:      req.user!.userId,
      userName:    body.userName ?? 'User',
      userAvatar:  body.userAvatar,
      rating:      body.rating,
      title:       body.title,
      body:        body.body,
      images:      body.images ?? [],
      productName: body.productName,
    });

    // Find sellerId from the product (best-effort)
    const product  = await Product.findById(req.params.productId).select('sellerId');
    const sellerId = product?.sellerId ?? '';

    const payload: ReviewPostedPayload = {
      reviewId:  review.id as string,
      productId: review.productId,
      userId:    review.userId,
      sellerId,
      rating:    review.rating,
    };

    // In-process: update product rating immediately
    internalBus.emit(EVENTS.REVIEW_POSTED, payload);
    // External: recommendation-service via Kafka
    publishEvent('review.posted', payload).catch(() => {});

    res.status(201).json({ success: true, data: review });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const deleteReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Review.findOneAndDelete({ _id: req.params.id, userId: req.user!.userId });
    res.json({ success: true, data: null });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const markHelpful = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.reviewId, { $inc: { helpfulCount: 1 } }, { new: true });
    if (!review) { res.status(404).json({ success: false, error: 'Review not found' }); return; }
    res.json({ success: true, data: { helpfulCount: review.helpfulCount } });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const adminListReviews = async (_req: Request, res: Response): Promise<void> => {
  try {
    const reviews = await Review.find().sort('-createdAt').limit(200);
    res.json({ success: true, data: reviews.map(r => ({
      id:        r.id,
      user:      r.userName,
      product:   r.productName ?? r.productId,
      rating:    r.rating,
      comment:   r.body,
      status:    r.status,
      helpful:   r.helpfulCount,
      createdAt: r.createdAt,
    }))});
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const adminApproveReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { status: 'APPROVED' }, { new: true });
    if (!review) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: review });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const adminRejectReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const review = await Review.findByIdAndUpdate(req.params.id, { status: 'REJECTED' }, { new: true });
    if (!review) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: review });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const adminDeleteReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ success: true, data: null });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

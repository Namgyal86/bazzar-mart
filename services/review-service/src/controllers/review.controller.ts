import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { Review } from '../models/review.model';

export const getProductReviews = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [reviews, total] = await Promise.all([
      Review.find({ productId: req.params.productId, isActive: true }).sort('-createdAt').skip(skip).limit(Number(limit)),
      Review.countDocuments({ productId: req.params.productId, isActive: true }),
    ]);
    const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;
    res.json({ success: true, data: { reviews, avgRating: Number(avgRating.toFixed(1)), total, page: Number(page), limit: Number(limit) } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
};

export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const { rating, title, body, images, productName } = req.body;
    const existing = await Review.findOne({ productId: req.params.productId, userId: req.user!.userId });
    if (existing) return res.status(409).json({ success: false, error: 'You already reviewed this product' });
    const review = await Review.create({
      productId: req.params.productId, userId: req.user!.userId,
      userName: req.body.userName || 'User', userAvatar: req.body.userAvatar,
      rating, title, body, images: images || [], productName,
    });
    res.status(201).json({ success: true, data: review });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
};

export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    await Review.findOneAndDelete({ _id: req.params.id, userId: req.user!.userId });
    res.json({ success: true, data: null });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
};

export const adminListReviews = async (req: Request, res: Response) => {
  try {
    const reviews = await Review.find().sort('-createdAt').limit(200);
    const mapped = reviews.map(r => ({
      id: r._id,
      user: r.userName,
      product: r.productName || r.productId,
      rating: r.rating,
      comment: r.body,
      status: r.status || 'APPROVED',
      helpful: r.helpfulCount,
      createdAt: r.createdAt,
    }));
    res.json({ success: true, data: mapped });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
};

export const adminUpdateReviewStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.params;
    const newStatus = status === 'approve' ? 'APPROVED' : 'REJECTED';
    const review = await Review.findByIdAndUpdate(req.params.id, { status: newStatus }, { new: true });
    if (!review) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: review });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
};

export const adminDeleteReview = async (req: AuthRequest, res: Response) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ success: true, data: null });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
};

export const markHelpful = async (req: AuthRequest, res: Response) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.reviewId,
      { $inc: { helpfulCount: 1 } },
      { new: true }
    );
    if (!review) return res.status(404).json({ success: false, error: 'Review not found' });
    res.json({ success: true, data: { helpfulCount: review.helpfulCount } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
};

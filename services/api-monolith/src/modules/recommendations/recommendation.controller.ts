/**
 * Recommendation module controller.
 *
 * Replaces recommendation-service (port 8010).
 * All product lookups are direct Mongoose queries; interaction tracking uses
 * MongoDB collections via the shared Mongoose connection.
 *
 * internalBus event handlers (registered at startup):
 *   review:posted   → record REVIEW interaction
 *   order:created   → record PURCHASE interactions
 *   product:created → seed trendingproducts entry
 */
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { View } from './recommendation.model';
import { Product, IProduct } from '../products/models/product.model';
import { internalBus, EVENTS, ReviewPostedPayload, OrderCreatedPayload, ProductCreatedPayload } from '../../shared/events/emitter';

// ── Internal event handlers ───────────────────────────────────────────────────

export function registerRecommendationEventHandlers(): void {
  internalBus.on(EVENTS.REVIEW_POSTED, async (p: ReviewPostedPayload) => {
    try {
      const db = mongoose.connection.db;
      if (!db) return;
      await db.collection('userproductinteractions').updateOne(
        { userId: p.userId, productId: p.productId },
        {
          $set: { rating: p.rating, interactionType: 'REVIEW', updatedAt: new Date() },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
      );
    } catch (err) {
      console.error('[recommendations] review:posted handler error:', err);
    }
  });

  internalBus.on(EVENTS.ORDER_CREATED, async (p: OrderCreatedPayload) => {
    try {
      const db = mongoose.connection.db;
      if (!db) return;
      const order = await mongoose.connection.db!
        .collection('orders')
        .findOne({ _id: new mongoose.Types.ObjectId(p.orderId) }, { projection: { items: 1, userId: 1 } });
      if (!order) return;
      for (const item of ((order as Record<string, unknown>).items as { productId: string }[] || [])) {
        await db.collection('userproductinteractions').updateOne(
          { userId: p.userId, productId: item.productId },
          {
            $set: { interactionType: 'PURCHASE', updatedAt: new Date() },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true },
        );
      }
    } catch (err) {
      console.error('[recommendations] order:created handler error:', err);
    }
  });

  internalBus.on(EVENTS.PRODUCT_CREATED, async (p: ProductCreatedPayload) => {
    try {
      const db = mongoose.connection.db;
      if (!db) return;
      await db.collection('trendingproducts').updateOne(
        { productId: p.productId },
        { $setOnInsert: { productId: p.productId, sellerId: p.sellerId, score: 0, createdAt: new Date() } },
        { upsert: true },
      );
    } catch (err) {
      console.error('[recommendations] product:created handler error:', err);
    }
  });
}

// ── Helper ────────────────────────────────────────────────────────────────────

function toSearchHit(p: IProduct) {
  return {
    productId:     String((p as unknown as Record<string, unknown>)._id),
    name:          p.name,
    slug:          p.slug,
    brand:         p.brand || '',
    basePrice:     p.price,
    salePrice:     p.salePrice,
    currency:      'NPR',
    averageRating: p.rating,
    reviewCount:   p.reviewCount,
    stock:         p.stock,
    imageUrl:      p.images?.[0] || '',
    categoryId:    p.category || '',
    sellerId:      p.sellerId || '',
    isFeatured:    p.isFeatured,
  };
}

// ── Route handlers ────────────────────────────────────────────────────────────

export const trackView = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, productId, categorySlug } = req.body as { userId?: string; productId?: string; categorySlug?: string };
    if (!productId) { res.status(400).json({ success: false, error: 'productId required' }); return; }
    if (userId) {
      await View.findOneAndUpdate(
        { userId, productId },
        { viewedAt: new Date(), categorySlug },
        { upsert: true },
      );
    }
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};

export const forUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const topCategories = await View.aggregate([
      { $match: { userId, categorySlug: { $exists: true } } },
      { $group: { _id: '$categorySlug', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ]);

    const category = topCategories[0]?._id as string | undefined;
    const filter = category ? { isActive: true, category } : { isActive: true, isFeatured: true };
    const products = await Product.find(filter).sort({ rating: -1 }).limit(8).lean();

    res.json({ success: true, data: products.map(p => toSearchHit(p as unknown as IProduct)) });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};

export const similarProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const source = await Product.findById(productId).select('category').lean();
    const category = source?.category;

    const filter = category
      ? { isActive: true, category, _id: { $ne: productId } }
      : { isActive: true, _id: { $ne: productId } };

    const products = await Product.find(filter).sort({ rating: -1 }).limit(6).lean();
    res.json({ success: true, data: products.map(p => toSearchHit(p as unknown as IProduct)) });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};

export const trending = async (req: Request, res: Response): Promise<void> => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trendingViews = await View.aggregate([
      { $match: { viewedAt: { $gte: since } } },
      { $group: { _id: '$productId', views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: 10 },
    ]);

    if (trendingViews.length === 0) {
      const products = await Product.find({ isActive: true }).sort({ soldCount: -1, rating: -1 }).limit(10).lean();
      res.json({ success: true, data: products.map(p => toSearchHit(p as unknown as IProduct)) });
      return;
    }

    const productIds = trendingViews.map((t: { _id: string }) => t._id);
    const products   = await Product.find({ _id: { $in: productIds }, isActive: true }).lean();
    res.json({ success: true, data: products.map(p => toSearchHit(p as unknown as IProduct)) });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};

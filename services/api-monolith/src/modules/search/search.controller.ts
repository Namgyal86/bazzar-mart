/**
 * Search module controller.
 *
 * Replaces search-service (port 8009).
 * All product queries are direct Mongoose calls — no HTTP proxy needed.
 */
import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { Product, IProduct } from '../products/models/product.model';

// Build a shared Mongoose filter from common search query params
function buildProductFilter(query: Request['query']): FilterQuery<IProduct> {
  const { q, category, brand, minPrice, maxPrice, sort: _sort, featured, inStock, seller: sellerId, rating } = query;

  const filter: FilterQuery<IProduct> = { isActive: true };

  if (q) {
    const re = new RegExp(String(q), 'i');
    filter.$or = [{ name: re }, { description: re }, { brand: re }, { tags: re }];
  }
  if (category)  filter.category  = String(category);
  if (brand)     filter.brand     = new RegExp(String(brand), 'i');
  if (sellerId)  filter.sellerId  = String(sellerId);
  if (featured === 'true')  filter.isFeatured = true;
  if (inStock  === 'true')  filter.stock = { $gt: 0 };
  if (rating)    filter.rating   = { $gte: Number(rating) };
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  return filter;
}

function buildSortObj(sort?: string): Record<string, 1 | -1> {
  switch (sort) {
    case 'price_asc':   return { price: 1 };
    case 'price_desc':  return { price: -1 };
    case 'rating':      return { rating: -1 };
    case 'newest':      return { createdAt: -1 };
    case 'popular':     return { soldCount: -1 };
    default:            return { isFeatured: -1, soldCount: -1 };
  }
}

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

export const search = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.query.q) {
      res.json({ success: true, data: { hits: [], total: 0, page: 1, limit: 20, facets: { categories: [], brands: [], priceRange: { min: 0, max: 100000 }, ratings: [] } } });
      return;
    }
    await searchProducts(req, res);
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};

export const searchProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page  = Math.max(1, Number(req.query.page  ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
    const skip  = (page - 1) * limit;

    const filter  = buildProductFilter(req.query);
    const sortObj = buildSortObj(req.query.sort as string | undefined);

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    const hits = products.map(p => toSearchHit(p as unknown as IProduct));

    res.json({
      success: true,
      data: {
        hits,
        facets: { categories: [], brands: [], priceRange: { min: 0, max: 100000 }, ratings: [] },
        total,
        page,
        limit,
      },
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};

export const suggestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, limit = '8' } = req.query;
    if (!q) { res.json({ success: true, data: [] }); return; }

    const re = new RegExp(String(q), 'i');
    const products = await Product.find({ isActive: true, $or: [{ name: re }, { brand: re }] })
      .limit(Number(limit))
      .select('name images _id')
      .lean();

    const data = products.map(p => ({
      name:      p.name,
      imageUrl:  p.images?.[0] || '',
      productId: String(p._id),
    }));

    res.json({ success: true, data });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};

export const similarProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const source = await Product.findById(productId).select('category').lean();
    const category = source?.category || '';

    const products = await Product.find({ isActive: true, category, _id: { $ne: productId } })
      .sort({ rating: -1 })
      .limit(8)
      .lean();

    res.json({ success: true, data: products.map(p => toSearchHit(p as unknown as IProduct)) });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};

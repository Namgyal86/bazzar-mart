import { Request, Response } from 'express';
import { z } from 'zod';
import { Product } from './models/product.model';
import { Category } from './models/category.model';
import { Banner } from './models/banner.model';
import { AuthRequest } from '../../shared/middleware/auth';
import { internalBus, EVENTS } from '../../shared/events/emitter';
import { handleError } from '../../shared/middleware/error';

// ── Validation schemas ───────────────────────────────────────────────────────

const createProductSchema = z.object({
  name:             z.string().min(3),
  description:      z.string().min(10),
  shortDescription: z.string().optional(),
  price:            z.number().positive(),
  salePrice:        z.number().positive().optional(),
  images:           z.array(z.string()).default([]),
  category:         z.string().min(1),
  subCategory:      z.string().optional(),
  brand:            z.string().optional(),
  stock:            z.number().int().min(0).default(0),
  tags:             z.array(z.string()).default([]),
  specifications:   z.record(z.string()).default({}),
  isFeatured:       z.boolean().default(false),
  sellerName:       z.string().optional(),
});

// ── Product handlers ─────────────────────────────────────────────────────────

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1, limit = 20, category, subCategory, search, q,
      sort = 'createdAt', order = 'desc',
      minPrice, maxPrice, sellerId, featured, onSale,
      minRating, inStock,
    } = req.query;

    const filter: Record<string, unknown> = { isActive: true };
    if (category)            filter.category    = category;
    if (subCategory)         filter.subCategory = subCategory;
    if (sellerId)            filter.sellerId    = sellerId;
    if (featured === 'true') filter.isFeatured  = true;
    if (onSale === 'true')   filter.salePrice   = { $exists: true, $gt: 0 };
    if (minPrice || maxPrice) {
      const range: Record<string, number> = {};
      if (minPrice) range.$gte = Number(minPrice);
      if (maxPrice) range.$lte = Number(maxPrice);
      filter.$or = [
        { salePrice: range },
        { salePrice: { $exists: false }, price: range },
        { salePrice: null, price: range },
      ];
    }
    const searchTerm = (q || search) ? String(q || search) : null;
    if (searchTerm) filter.name = { $regex: searchTerm, $options: 'i' };
    if (minRating) filter.rating = { $gte: Number(minRating) };
    if (inStock === '1' || inStock === 'true') filter.stock = { $gt: 0 };

    const sortObj: Record<string, 1 | -1> = { [String(sort)]: order === 'asc' ? 1 : -1 };
    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortObj).skip(skip).limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    res.json({ success: true, data: products, meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      res.status(404).json({ success: false, error: 'Product not found' }); return;
    }
    const product = await Product.findOne({ _id: req.params.id, isActive: true });
    if (!product) { res.status(404).json({ success: false, error: 'Product not found' }); return; }
    res.json({ success: true, data: product });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = createProductSchema.parse({ ...req.body, price: Number(req.body.price ?? req.body.basePrice), stock: Number(req.body.stock ?? 0) });
    const product = await Product.create({
      ...body,
      sellerId:   req.user!.userId,
      sellerName: body.sellerName ?? 'Seller',
    });
    internalBus.emit(EVENTS.PRODUCT_CREATED, {
      productId: String(product._id),
      sellerId:  req.user!.userId,
      name:      product.name as string,
      category:  (product as unknown as Record<string, unknown>).category as string | undefined,
    });
    res.status(201).json({ success: true, data: product });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.user!.userId });
    if (!product) { res.status(404).json({ success: false, error: 'Product not found' }); return; }
    const allowed = ['name', 'description', 'price', 'salePrice', 'images', 'stock', 'isActive', 'isFeatured', 'tags', 'specifications', 'shortDescription', 'brand'];
    allowed.forEach((k) => { if (req.body[k] !== undefined) (product as unknown as Record<string, unknown>)[k] = req.body[k]; });
    await product.save();
    res.json({ success: true, data: product });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const updateStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { stock } = req.body as { stock?: number };
    if (stock === undefined || stock < 0) { res.status(400).json({ success: false, error: 'Valid stock required' }); return; }
    const productFilter: Record<string, unknown> = { _id: req.params.id };
    if (req.user!.role !== 'ADMIN') productFilter.sellerId = req.user!.userId;
    const product = await Product.findOneAndUpdate(productFilter, { stock }, { new: true });
    if (!product) { res.status(404).json({ success: false, error: 'Product not found' }); return; }
    res.json({ success: true, data: product });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Product.findOneAndUpdate({ _id: req.params.id, sellerId: req.user!.userId }, { isActive: false });
    res.json({ success: true, data: null });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const getFeaturedProducts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find({ isActive: true, isFeatured: true }).limit(12).sort('-createdAt');
    res.json({ success: true, data: products });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const getAdminStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totalProducts, sellerIds, outOfStock] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      Product.distinct('sellerId'),
      Product.countDocuments({ isActive: true, stock: 0 }),
    ]);
    res.json({ success: true, data: { totalProducts, totalSellers: sellerIds.length, outOfStock } });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const getFlashDeals = async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const deals = await Product.find({
      isActive: true, salePrice: { $exists: true, $gt: 0 },
      $or: [{ dealEndsAt: { $exists: false } }, { dealEndsAt: null }, { dealEndsAt: { $gt: now } }],
    }).sort('-createdAt');
    res.json({ success: true, data: deals });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const adminSetFlashDeal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { salePrice, dealEndsAt } = req.body as { salePrice?: number; dealEndsAt?: string };
    if (!salePrice || salePrice <= 0) { res.status(400).json({ success: false, error: 'salePrice must be > 0' }); return; }
    const product = await Product.findById(req.params.id);
    if (!product) { res.status(404).json({ success: false, error: 'Product not found' }); return; }
    if (salePrice >= product.price) { res.status(400).json({ success: false, error: 'Sale price must be less than regular price' }); return; }
    product.salePrice = salePrice;
    product.dealEndsAt = dealEndsAt ? new Date(dealEndsAt) : undefined;
    await product.save();
    res.json({ success: true, data: product });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const adminRemoveFlashDeal = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { $unset: { salePrice: '', dealEndsAt: '' } }, { new: true });
    if (!product) { res.status(404).json({ success: false, error: 'Product not found' }); return; }
    res.json({ success: true, data: product });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

// ── Category handlers ────────────────────────────────────────────────────────

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = { isActive: true };
    if (req.query.navOnly === 'true') filter.showInNav = true;
    res.json({ success: true, data: await Category.find(filter).sort('sortOrder') });
  } catch (err: unknown) { handleError(err, res); }
};

export const getAllCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({ success: true, data: await Category.find().sort('sortOrder') });
  } catch (err: unknown) { handleError(err, res); }
};

export const getCategoriesWithSubs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const all = await Category.find({ isActive: true }).sort('sortOrder');
    const parents = all.filter(c => !c.parentCategory);
    const result = parents.map(p => ({ ...p.toObject(), subcategories: all.filter(c => c.parentCategory === p.slug) }));
    res.json({ success: true, data: result });
  } catch (err: unknown) { handleError(err, res); }
};

export const getCategoryBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const cat = await Category.findOne({ slug: req.params.slug, isActive: true });
    if (!cat) { res.status(404).json({ success: false, error: 'Category not found' }); return; }
    res.json({ success: true, data: cat });
  } catch (err: unknown) { handleError(err, res); }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const cat = await Category.create({
      name:           req.body.name,
      slug:           req.body.slug ?? req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description:    req.body.description,
      image:          req.body.image,
      parentCategory: req.body.parentCategory,
      sortOrder:      req.body.sortOrder ?? 0,
      showInNav:      req.body.showInNav !== false,
      isActive:       req.body.isActive !== false,
    });
    res.status(201).json({ success: true, data: cat });
  } catch (err: unknown) { handleError(err, res); }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const updates: Record<string, unknown> = {};
    if (req.body.name !== undefined)   { updates.name = req.body.name; updates.slug = req.body.slug ?? req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'); }
    if (req.body.slug !== undefined)        updates.slug           = req.body.slug;
    if (req.body.description !== undefined) updates.description    = req.body.description;
    if (req.body.image !== undefined)       updates.image          = req.body.image;
    if (req.body.sortOrder !== undefined)   updates.sortOrder      = req.body.sortOrder;
    if (req.body.showInNav !== undefined)   updates.showInNav      = req.body.showInNav;
    if (req.body.isActive !== undefined)    updates.isActive       = req.body.isActive;
    if ('parentCategory' in req.body)       updates.parentCategory = req.body.parentCategory || undefined;
    const cat = await Category.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!cat) { res.status(404).json({ success: false, error: 'Category not found' }); return; }
    res.json({ success: true, data: cat });
  } catch (err: unknown) { handleError(err, res); }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const cat = await Category.findByIdAndDelete(req.params.id);
    if (!cat) { res.status(404).json({ success: false, error: 'Category not found' }); return; }
    res.json({ success: true, message: 'Category deleted' });
  } catch (err: unknown) { handleError(err, res); }
};

// ── Banner handlers ──────────────────────────────────────────────────────────

export const getBanners = async (_req: Request, res: Response): Promise<void> => {
  try { res.json({ success: true, data: await Banner.find({ isActive: true }).sort({ order: 1 }) }); }
  catch (err: unknown) { handleError(err, res); }
};

export const getAllBanners = async (_req: Request, res: Response): Promise<void> => {
  try { res.json({ success: true, data: await Banner.find().sort({ order: 1 }) }); }
  catch (err: unknown) { handleError(err, res); }
};

export const createBanner = async (req: Request, res: Response): Promise<void> => {
  try { res.status(201).json({ success: true, data: await Banner.create(req.body) }); }
  catch (err: unknown) { handleError(err, res); }
};

export const updateBanner = async (req: Request, res: Response): Promise<void> => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!banner) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: banner });
  } catch (err: unknown) { handleError(err, res); }
};

export const deleteBanner = async (req: Request, res: Response): Promise<void> => {
  try { await Banner.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err: unknown) { handleError(err, res); }
};

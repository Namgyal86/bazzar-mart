import { Request, Response } from 'express';
import { Product } from '../models/product.model';
import { AuthRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  shortDescription: z.string().optional(),
  price: z.number().positive(),
  salePrice: z.number().positive().optional(),
  images: z.array(z.string()).default([]),
  category: z.string().min(1),
  brand: z.string().optional(),
  stock: z.number().int().min(0).default(0),
  tags: z.array(z.string()).default([]),
  specifications: z.record(z.string()).default({}),
  isFeatured: z.boolean().default(false),
});

export const getProducts = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, category, subCategory, search, sort = 'createdAt', order = 'desc', minPrice, maxPrice, sellerId, featured, onSale } = req.query;

    const filter: any = { isActive: true };
    if (category) filter.category = category;
    if (subCategory) filter.subCategory = subCategory;
    if (sellerId) filter.sellerId = sellerId;
    if (featured === 'true') filter.isFeatured = true;
    if (onSale === 'true') filter.salePrice = { $exists: true, $gt: 0 };
    if (minPrice || maxPrice) {
      const priceRange: any = {};
      if (minPrice) priceRange.$gte = Number(minPrice);
      if (maxPrice) priceRange.$lte = Number(maxPrice);
      // Match products where salePrice is in range, OR no salePrice but base price is in range
      filter.$or = [
        { salePrice: priceRange },
        { salePrice: { $exists: false }, price: priceRange },
        { salePrice: null, price: priceRange },
      ];
    }
    if (search) filter.$text = { $search: String(search) };

    const sortObj: any = {};
    sortObj[String(sort)] = order === 'asc' ? 1 : -1;

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).sort(sortObj).skip(skip).limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: products,
      meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isActive: true });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const body = createSchema.parse(req.body);
    const product = await Product.create({
      ...body,
      sellerId: req.user!.userId,
      sellerName: req.body.sellerName || 'Seller',
    });
    res.status(201).json({ success: true, data: product });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateStock = async (req: AuthRequest, res: Response) => {
  try {
    const { stock } = req.body;
    if (stock === undefined || stock < 0) return res.status(400).json({ success: false, error: 'Valid stock required' });
    const filter: any = { _id: req.params.id };
    if (req.user!.role !== 'ADMIN') filter.sellerId = req.user!.userId;
    const product = await Product.findOneAndUpdate(filter, { stock }, { new: true });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, sellerId: req.user!.userId });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    const allowed = ['name', 'description', 'price', 'salePrice', 'images', 'stock', 'isActive', 'isFeatured', 'tags', 'specifications', 'shortDescription', 'brand'];
    allowed.forEach((k) => { if (req.body[k] !== undefined) (product as any)[k] = req.body[k]; });
    await product.save();
    res.json({ success: true, data: product });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    await Product.findOneAndUpdate({ _id: req.params.id, sellerId: req.user!.userId }, { isActive: false });
    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getFeaturedProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.find({ isActive: true, isFeatured: true }).limit(12).sort('-createdAt');
    res.json({ success: true, data: products });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const [totalProducts, totalSellers, pendingSellers, outOfStock] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      Product.distinct('sellerId').then((arr: string[]) => arr.length),
      Promise.resolve(0), // Seller approval tracked in seller-service
      Product.countDocuments({ isActive: true, stock: 0 }),
    ]);
    res.json({ success: true, data: { totalProducts, totalSellers, pendingSellers, outOfStock } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateProductRating = async (productId: string, rating: number, reviewCount: number) => {
  await Product.findByIdAndUpdate(productId, { rating, reviewCount });
};

// Admin: get all active flash deals
export const getFlashDeals = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const deals = await Product.find({
      isActive: true,
      salePrice: { $exists: true, $gt: 0 },
      $or: [{ dealEndsAt: { $exists: false } }, { dealEndsAt: null }, { dealEndsAt: { $gt: now } }],
    }).sort('-createdAt');
    res.json({ success: true, data: deals });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Admin: set flash deal on a product (bypasses sellerId check)
export const adminSetFlashDeal = async (req: AuthRequest, res: Response) => {
  try {
    const { salePrice, dealEndsAt } = req.body;
    if (!salePrice || salePrice <= 0) return res.status(400).json({ success: false, error: 'salePrice must be > 0' });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    if (salePrice >= product.price) return res.status(400).json({ success: false, error: 'Sale price must be less than regular price' });
    product.salePrice = salePrice;
    product.dealEndsAt = dealEndsAt ? new Date(dealEndsAt) : undefined;
    await product.save();
    res.json({ success: true, data: product });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Admin: remove flash deal from a product
export const adminRemoveFlashDeal = async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $unset: { salePrice: '', dealEndsAt: '' } },
      { new: true }
    );
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

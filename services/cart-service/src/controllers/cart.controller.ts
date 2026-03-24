import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { redis } from '../index';

const CART_TTL = 60 * 60 * 24 * 30; // 30 days

function cartKey(userId: string) { return `cart:${userId}`; }

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  sellerId: string;
  sellerName: string;
  unitPrice: number;
  quantity: number;
  stock: number;
}

export const getCart = async (req: AuthRequest, res: Response) => {
  try {
    const raw = await redis.get(cartKey(req.user!.userId));
    const items: CartItem[] = raw ? JSON.parse(raw) : [];
    const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    res.json({ success: true, data: { items, total, itemCount: items.reduce((s, i) => s + i.quantity, 0) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const addItem = async (req: AuthRequest, res: Response) => {
  try {
    const { productId, productName, productImage, sellerId, sellerName, unitPrice, quantity = 1, stock } = req.body;
    const raw = await redis.get(cartKey(req.user!.userId));
    const items: CartItem[] = raw ? JSON.parse(raw) : [];
    const idx = items.findIndex((i) => i.productId === productId);
    if (idx >= 0) {
      items[idx].quantity = Math.min(items[idx].quantity + quantity, stock);
    } else {
      items.push({ id: productId, productId, productName, productImage, sellerId, sellerName, unitPrice, quantity, stock });
    }
    await redis.setex(cartKey(req.user!.userId), CART_TTL, JSON.stringify(items));
    res.json({ success: true, data: { items } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateItem = async (req: AuthRequest, res: Response) => {
  try {
    const { quantity } = req.body;
    const raw = await redis.get(cartKey(req.user!.userId));
    let items: CartItem[] = raw ? JSON.parse(raw) : [];
    items = items.map((i) => i.productId === req.params.productId ? { ...i, quantity: Math.min(Math.max(1, quantity), i.stock) } : i);
    await redis.setex(cartKey(req.user!.userId), CART_TTL, JSON.stringify(items));
    res.json({ success: true, data: { items } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const removeItem = async (req: AuthRequest, res: Response) => {
  try {
    const raw = await redis.get(cartKey(req.user!.userId));
    let items: CartItem[] = raw ? JSON.parse(raw) : [];
    items = items.filter((i) => i.productId !== req.params.productId);
    await redis.setex(cartKey(req.user!.userId), CART_TTL, JSON.stringify(items));
    res.json({ success: true, data: { items } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const clearCart = async (req: AuthRequest, res: Response) => {
  try {
    await redis.del(cartKey(req.user!.userId));
    res.json({ success: true, data: { items: [] } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

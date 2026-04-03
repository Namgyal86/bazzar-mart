import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as cartService from '../services/cart.service';

export const getCart = async (req: AuthRequest, res: Response) => {
  try {
    const data = await cartService.getCart(req.user!.userId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const addItem = async (req: AuthRequest, res: Response) => {
  try {
    const items = await cartService.addItem(req.user!.userId, req.body);
    res.json({ success: true, data: { items } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateItem = async (req: AuthRequest, res: Response) => {
  try {
    const items = await cartService.updateItem(req.user!.userId, req.params.productId, req.body.quantity);
    res.json({ success: true, data: { items } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const removeItem = async (req: AuthRequest, res: Response) => {
  try {
    const items = await cartService.removeItem(req.user!.userId, req.params.productId);
    res.json({ success: true, data: { items } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const clearCart = async (req: AuthRequest, res: Response) => {
  try {
    await cartService.clearCart(req.user!.userId);
    res.json({ success: true, data: { items: [] } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

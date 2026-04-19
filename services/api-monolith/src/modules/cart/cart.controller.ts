import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../shared/middleware/auth';
import * as cartService from './cart.service';
import { handleError } from '../../shared/middleware/error';

const addItemSchema = z.object({
  productId:    z.string().min(1),
  productName:  z.string().min(1),
  productImage: z.string().default(''),
  sellerId:     z.string().default(''),
  sellerName:   z.string().default(''),
  unitPrice:    z.number().nonnegative(),
  quantity:     z.number().int().positive().default(1),
  stock:        z.number().int().nonnegative().optional().default(0),
});

const updateItemSchema = z.object({ quantity: z.number().int().positive() });

function validationMiddleware<T>(schema: z.ZodSchema<T>) {
  return (body: unknown): T => {
    const result = schema.safeParse(body);
    if (!result.success) throw Object.assign(new Error('Validation failed'), { _zod: result.error.flatten(), _status: 400 });
    return result.data;
  };
}

export const getCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({ success: true, data: await cartService.getCart(req.user!.userId) });
  } catch (err: unknown) { handleError(err, res); }
};

export const addItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = addItemSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ success: false, error: parsed.error.flatten() }); return; }
    const items = await cartService.addItem(req.user!.userId, parsed.data);
    res.json({ success: true, data: { items } });
  } catch (err: unknown) { handleError(err, res); }
};

export const updateItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsed = updateItemSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ success: false, error: parsed.error.flatten() }); return; }
    const items = await cartService.updateItem(req.user!.userId, req.params.productId, parsed.data.quantity);
    res.json({ success: true, data: { items } });
  } catch (err: unknown) { handleError(err, res); }
};

export const removeItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const items = await cartService.removeItem(req.user!.userId, req.params.productId);
    res.json({ success: true, data: { items } });
  } catch (err: unknown) { handleError(err, res); }
};

export const clearCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await cartService.clearCart(req.user!.userId);
    res.json({ success: true, data: { items: [] } });
  } catch (err: unknown) { handleError(err, res); }
};

// Suppress unused warning
void validationMiddleware;

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const addItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  productImage: z.string().min(1),
  sellerId: z.string().min(1),
  sellerName: z.string().min(1),
  unitPrice: z.number().positive(),
  quantity: z.number().int().positive().default(1),
  stock: z.number().int().nonnegative(),
});

export const updateItemSchema = z.object({
  quantity: z.number().int().positive(),
});

export function validate(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.flatten() });
    }
    req.body = result.data;
    next();
  };
}

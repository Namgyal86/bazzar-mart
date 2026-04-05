import { Request, Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth';
import { Storefront } from './models/storefront.model';

export const getMyStorefront = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let storefront = await Storefront.findOne({ sellerId: req.user!.userId });
    if (!storefront) {
      storefront = await Storefront.create({ sellerId: req.user!.userId });
    }
    res.json({ success: true, data: storefront });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const updateMyStorefront = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storefront = await Storefront.findOneAndUpdate(
      { sellerId: req.user!.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true, upsert: true },
    );
    res.json({ success: true, data: storefront });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const publishStorefront = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const storefront = await Storefront.findOneAndUpdate(
      { sellerId: req.user!.userId },
      { isPublished: true, updatedAt: new Date() },
      { new: true, upsert: true },
    );
    res.json({ success: true, data: storefront });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

export const getPublicStorefront = async (req: Request, res: Response): Promise<void> => {
  try {
    const storefront = await Storefront.findOne({ sellerId: req.params.sellerId, isPublished: true });
    if (!storefront) { res.status(404).json({ success: false, error: 'Storefront not found' }); return; }
    res.json({ success: true, data: storefront });
  } catch (err: unknown) { res.status(500).json({ success: false, error: (err as Error).message }); }
};

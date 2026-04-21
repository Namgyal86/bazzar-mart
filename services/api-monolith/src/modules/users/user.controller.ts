import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../../shared/middleware/auth';
import { User } from './models/user.model';
import { Address } from './models/address.model';
import { handleError } from '../../shared/middleware/error';

// ── Profile ───────────────────────────────────────────────────────────────────

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
    res.json({ success: true, data: {
      id:           user.id,
      firstName:    user.firstName,
      lastName:     user.lastName,
      email:        user.email,
      phone:        user.phone,
      role:         user.role,
      avatar:       user.avatar,
      referralCode: user.referralCode,
    }});
  } catch (err: unknown) { handleError(err, res); }
};

export const updateMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const allowed  = ['firstName', 'lastName', 'phone', 'avatar'];
    const updates: Record<string, unknown> = {};
    const body = req.body as Record<string, unknown>;
    allowed.forEach(k => { if (body[k] !== undefined) updates[k] = body[k]; });
    const user = await User.findByIdAndUpdate(req.user!.userId, updates, { new: true });
    res.json({ success: true, data: user });
  } catch (err: unknown) { handleError(err, res); }
};

// ── Password change ───────────────────────────────────────────────────────────

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: 'currentPassword and newPassword required' }); return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters' }); return;
    }
    const user = await User.findById(req.user!.userId).select('+password');
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }
    if (user.password) {
      const valid = await user.comparePassword(currentPassword);
      if (!valid) { res.status(401).json({ success: false, error: 'Current password is incorrect' }); return; }
    }
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: 'Password updated' });
  } catch (err: unknown) { handleError(err, res); }
};

// ── Wishlist ──────────────────────────────────────────────────────────────────

export const getWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.userId).select('wishlist');
    res.json({ success: true, data: user?.wishlist ?? [] });
  } catch (err: unknown) { handleError(err, res); }
};

export const syncWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productIds } = req.body as { productIds?: unknown };
    if (!Array.isArray(productIds)) { res.status(400).json({ success: false, error: 'productIds must be array' }); return; }
    const user = await User.findByIdAndUpdate(req.user!.userId, { wishlist: productIds }, { new: true }).select('wishlist');
    res.json({ success: true, data: user?.wishlist ?? [] });
  } catch (err: unknown) { handleError(err, res); }
};

export const addToWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user!.userId,
      { $addToSet: { wishlist: req.params.productId } },
      { new: true },
    ).select('wishlist');
    res.json({ success: true, data: user?.wishlist ?? [] });
  } catch (err: unknown) { handleError(err, res); }
};

export const removeFromWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user!.userId,
      { $pull: { wishlist: req.params.productId } },
      { new: true },
    ).select('wishlist');
    res.json({ success: true, data: user?.wishlist ?? [] });
  } catch (err: unknown) { handleError(err, res); }
};

// ── Addresses ─────────────────────────────────────────────────────────────────

const addressSchema = z.object({
  label:        z.string().default('Home'),
  fullName:     z.string().min(2),
  phone:        z.string().min(10),
  addressLine1: z.string().min(5),
  addressLine2: z.string().optional(),
  city:         z.string().min(2),
  district:     z.string().min(2),
  province:     z.string().min(2),
  isDefault:    z.boolean().default(false),
});

export const getAddresses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const addresses = await Address.find({ userId: req.user!.userId });
    res.json({ success: true, data: addresses });
  } catch (err: unknown) { handleError(err, res); }
};

export const addAddress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = addressSchema.parse(req.body);
    if (body.isDefault) await Address.updateMany({ userId: req.user!.userId }, { isDefault: false });
    const address = await Address.create({ ...body, userId: req.user!.userId });
    res.status(201).json({ success: true, data: address });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const updateAddress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const allowed  = ['label', 'fullName', 'phone', 'addressLine1', 'addressLine2', 'city', 'district', 'province', 'isDefault'];
    const updates: Record<string, unknown> = {};
    const body = req.body as Record<string, unknown>;
    allowed.forEach(k => { if (body[k] !== undefined) updates[k] = body[k]; });
    if (updates.isDefault) {
      await Address.updateMany({ userId: req.user!.userId, _id: { $ne: req.params.id } }, { isDefault: false });
    }
    const address = await Address.findOneAndUpdate({ _id: req.params.id, userId: req.user!.userId }, updates, { new: true });
    if (!address) { res.status(404).json({ success: false, error: 'Address not found' }); return; }
    res.json({ success: true, data: address });
  } catch (err: unknown) { handleError(err, res); }
};

export const deleteAddress = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Address.findOneAndDelete({ _id: req.params.id, userId: req.user!.userId });
    res.json({ success: true, data: null });
  } catch (err: unknown) { handleError(err, res); }
};

// ── Public / lookup ───────────────────────────────────────────────────────────

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (err: unknown) { handleError(err, res); }
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const adminListUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt((req.query as { limit?: string }).limit ?? '100');
    const page  = parseInt((req.query as { page?: string }).page  ?? '1');
    const role  = (req.query as { role?: string }).role;
    const query: Record<string, unknown> = {};
    if (role && role !== 'ALL') query.role = role;
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit).select('-password'),
      User.countDocuments(query),
    ]);
    res.json({ success: true, data: users, total });
  } catch (err: unknown) { handleError(err, res); }
};

export const adminGetStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [totalUsers, newToday, buyers, sellers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ role: 'BUYER' }),
      User.countDocuments({ role: 'SELLER' }),
    ]);
    res.json({ success: true, data: { totalUsers, newToday, buyers, sellers } });
  } catch (err: unknown) { handleError(err, res); }
};

export const adminUpdateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const allowed  = ['isActive', 'role', 'isEmailVerified'];
    const updates: Record<string, unknown> = {};
    const body = req.body as Record<string, unknown>;
    allowed.forEach(k => { if (body[k] !== undefined) updates[k] = body[k]; });
    // Mobile: isBanned maps to isActive inverse
    if (body.isBanned !== undefined) updates.isActive = !body.isBanned;
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!user) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: user });
  } catch (err: unknown) { handleError(err, res); }
};

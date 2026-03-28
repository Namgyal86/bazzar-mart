import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { User } from '../models/user.model';
import { Address } from '../models/address.model';
import { z } from 'zod';

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone, role: user.role, avatar: user.avatar, referralCode: user.referralCode } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    const allowed = ['firstName', 'lastName', 'phone', 'avatar'];
    const updates: any = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.user!.userId, updates, { new: true });
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getAddresses = async (req: AuthRequest, res: Response) => {
  try {
    const addresses = await Address.find({ userId: req.user!.userId });
    res.json({ success: true, data: addresses });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const addAddress = async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      label: z.string().default('Home'),
      fullName: z.string().min(2),
      phone: z.string().min(10),
      addressLine1: z.string().min(5),
      addressLine2: z.string().optional(),
      city: z.string().min(2),
      district: z.string().min(2),
      province: z.string().min(2),
      isDefault: z.boolean().default(false),
    });
    const body = schema.parse(req.body);
    if (body.isDefault) await Address.updateMany({ userId: req.user!.userId }, { isDefault: false });
    const address = await Address.create({ ...body, userId: req.user!.userId });
    res.status(201).json({ success: true, data: address });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateAddress = async (req: AuthRequest, res: Response) => {
  try {
    const allowed = ['label', 'fullName', 'phone', 'addressLine1', 'addressLine2', 'city', 'district', 'province', 'postalCode', 'isDefault'];
    const updates: any = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    if (updates.isDefault) await Address.updateMany({ userId: req.user!.userId, _id: { $ne: req.params.id } }, { isDefault: false });
    const address = await Address.findOneAndUpdate({ _id: req.params.id, userId: req.user!.userId }, updates, { new: true });
    if (!address) return res.status(404).json({ success: false, error: 'Address not found' });
    res.json({ success: true, data: address });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteAddress = async (req: AuthRequest, res: Response) => {
  try {
    await Address.findOneAndDelete({ _id: req.params.id, userId: req.user!.userId });
    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const adminListUsers = async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const page  = parseInt(req.query.page  as string) || 1;
    const role  = req.query.role as string | undefined;
    const query: any = {};
    if (role && role !== 'ALL') query.role = role;
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .select('-password');
    const total = await User.countDocuments(query);
    res.json({ success: true, data: users, total });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.userId).select('wishlist');
    res.json({ success: true, data: user?.wishlist ?? [] });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
};

export const syncWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds)) return res.status(400).json({ success: false, error: 'productIds must be array' });
    const user = await User.findByIdAndUpdate(req.user!.userId, { wishlist: productIds }, { new: true }).select('wishlist');
    res.json({ success: true, data: user?.wishlist ?? [] });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
};

export const addToWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const user = await User.findByIdAndUpdate(
      req.user!.userId,
      { $addToSet: { wishlist: productId } },
      { new: true }
    ).select('wishlist');
    res.json({ success: true, data: user?.wishlist ?? [] });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
};

export const removeFromWishlist = async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const user = await User.findByIdAndUpdate(
      req.user!.userId,
      { $pull: { wishlist: productId } },
      { new: true }
    ).select('wishlist');
    res.json({ success: true, data: user?.wishlist ?? [] });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
};

export const adminGetStats = async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [totalUsers, newToday, buyers, sellers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ role: 'BUYER' }),
      User.countDocuments({ role: 'SELLER' }),
    ]);
    res.json({ success: true, data: { totalUsers, newToday, buyers, sellers } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const adminUpdateUser = async (req: AuthRequest, res: Response) => {
  try {
    const allowed = ['isActive', 'role', 'isVerified'];
    const updates: any = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    // Mobile clients send isBanned — map to isActive inverse
    if (req.body.isBanned !== undefined) updates.isActive = !req.body.isBanned;
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

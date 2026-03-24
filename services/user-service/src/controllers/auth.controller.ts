import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { z } from 'zod';
import axios from 'axios';

const REFERRAL_SERVICE_URL = process.env.REFERRAL_SERVICE_URL || 'http://localhost:8012';

const registerSchema = z.object({
  firstName:    z.string().min(2),
  lastName:     z.string().min(2),
  email:        z.string().email(),
  password:     z.string().min(6),
  phone:        z.string().optional(),
  referralCode: z.string().optional(),
  role:         z.enum(['BUYER', 'SELLER', 'ADMIN', 'DELIVERY']).optional(),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export const register = async (req: Request, res: Response) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await User.findOne({ email: body.email });
    if (existing) return res.status(409).json({ success: false, error: 'Email already registered' });

    const user = await User.create({
      firstName: body.firstName,
      lastName:  body.lastName,
      email:     body.email,
      password:  body.password,
      phone:     body.phone,
      referredBy: body.referralCode,
      ...(body.role ? { role: body.role } : {}),
    });

    const accessToken  = signAccessToken({ userId: user.id, role: user.role, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id });

    await User.findByIdAndUpdate(user.id, { $push: { refreshTokens: refreshToken } });

    // Fire-and-forget: apply referral if code provided
    if (body.referralCode) {
      User.findOne({ referralCode: body.referralCode })
        .then((referrer) => {
          if (referrer && referrer.id !== user.id) {
            axios.post(`${REFERRAL_SERVICE_URL}/api/v1/referrals/apply`, {
              referralCode: body.referralCode,
              newUserId: user.id,
              referrerId: referrer.id,
            }).catch(() => {}); // non-blocking — don't fail registration if referral-service is down
          }
        })
        .catch(() => {});
    }

    res.status(201).json({
      success: true,
      data: {
        accessToken, refreshToken,
        user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, referralCode: user.referralCode },
      },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    res.status(500).json({ success: false, error: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email }).select('+password +refreshTokens');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    if (!user.isActive) return res.status(403).json({ success: false, error: 'Account suspended' });

    const accessToken  = signAccessToken({ userId: user.id, role: user.role, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id });

    // Keep only last 5 refresh tokens
    const tokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
    await User.findByIdAndUpdate(user.id, { refreshTokens: tokens });

    res.json({
      success: true,
      data: {
        accessToken, refreshToken,
        user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, referralCode: user.referralCode, avatar: user.avatar, phone: user.phone },
      },
    });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    res.status(500).json({ success: false, error: err.message });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, error: 'Refresh token required' });

    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.userId).select('+refreshTokens');
    if (!user || !user.refreshTokens?.includes(refreshToken)) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    const newAccess  = signAccessToken({ userId: user.id, role: user.role, email: user.email });
    const newRefresh = signRefreshToken({ userId: user.id });

    const tokens = user.refreshTokens.filter((t) => t !== refreshToken);
    tokens.push(newRefresh);
    await User.findByIdAndUpdate(user.id, { refreshTokens: tokens });

    res.json({ success: true, data: { accessToken: newAccess, refreshToken: newRefresh } });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const payload = verifyRefreshToken(refreshToken);
      await User.findByIdAndUpdate(payload.userId, { $pull: { refreshTokens: refreshToken } });
    }
    res.json({ success: true, data: null });
  } catch {
    res.json({ success: true, data: null });
  }
};

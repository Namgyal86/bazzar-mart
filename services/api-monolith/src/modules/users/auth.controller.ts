/**
 * Auth controller — register, login, token refresh, logout.
 *
 * Key change from user-service:
 *   Referral application after registration was an axios HTTP call to
 *   referral-service (port 8012). Now referral-service is in the monolith,
 *   so we call handleUserRegistered() directly — same process, zero network.
 *
 *   After registration we also:
 *     • emit internalBus USER_REGISTERED (other in-process modules can react)
 *     • publish Kafka user.registered (analytics-service still consumes this)
 */
import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from './models/user.model';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './utils/jwt';
import { handleUserRegistered } from '../referrals/referral.controller';
import { internalBus, EVENTS } from '../../shared/events/emitter';
import { publishEvent } from '../../kafka/producer';
import { handleError } from '../../shared/middleware/error';

// ── Validation ────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  firstName:    z.string().min(2),
  lastName:     z.string().min(2),
  email:        z.string().email(),
  password:     z.string().min(6),
  phone:        z.string().optional(),
  referralCode: z.string().optional(),
  role:         z.enum(['BUYER', 'SELLER']).optional(),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function publicUser(user: InstanceType<typeof User>) {
  return {
    id:           user.id as string,
    firstName:    user.firstName,
    lastName:     user.lastName,
    email:        user.email,
    role:         user.role,
    referralCode: user.referralCode,
    avatar:       user.avatar,
    phone:        user.phone,
  };
}

// ── Handlers ──────────────────────────────────────────────────────────────────

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = registerSchema.parse(req.body);

    const existing = await User.findOne({ email: body.email });
    if (existing) { res.status(409).json({ success: false, error: 'Email already registered' }); return; }

    const user = await User.create({
      firstName:  body.firstName,
      lastName:   body.lastName,
      email:      body.email,
      password:   body.password,
      phone:      body.phone,
      referredBy: body.referralCode,
      ...(body.role ? { role: body.role } : {}),
    });

    const accessToken  = signAccessToken({ userId: user.id as string, role: user.role, email: user.email, referralCode: user.referralCode });
    const refreshToken = signRefreshToken({ userId: user.id as string });
    await User.findByIdAndUpdate(user.id, { $push: { refreshTokens: refreshToken } });

    res.status(201).json({ success: true, data: { accessToken, refreshToken, user: publicUser(user) } });

    // Apply referral — direct function call (no HTTP) since referrals module is internal
    if (body.referralCode) {
      User.findOne({ referralCode: body.referralCode })
        .then(async (referrer) => {
          if (referrer && (referrer.id as string) !== (user.id as string)) {
            await handleUserRegistered({
              userId:       user.id as string,
              referredBy:   referrer.id as string,
              referralCode: body.referralCode,
            });
          }
        })
        .catch(() => {});
    }

    // Notify other in-process modules (analytics counts new users via this event)
    internalBus.emit(EVENTS.USER_REGISTERED, {
      userId:       user.id as string,
      referralCode: body.referralCode,
    });

    // Kafka: analytics-service consumes user.registered
    publishEvent('user.registered', {
      userId:    user.id,
      role:      user.role,
      email:     user.email,
      createdAt: new Date().toISOString(),
    }).catch(() => {});

  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email }).select('+password +refreshTokens');
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ success: false, error: 'Invalid email or password' }); return;
    }
    if (!user.isActive) { res.status(403).json({ success: false, error: 'Account suspended' }); return; }

    const accessToken  = signAccessToken({ userId: user.id as string, role: user.role, email: user.email, referralCode: user.referralCode });
    const refreshToken = signRefreshToken({ userId: user.id as string });

    // Keep only last 5 refresh tokens
    const tokens = [...(user.refreshTokens ?? []).slice(-4), refreshToken];
    await User.findByIdAndUpdate(user.id, { refreshTokens: tokens });

    res.json({ success: true, data: { accessToken, refreshToken, user: publicUser(user) } });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) { res.status(400).json({ success: false, error: 'Refresh token required' }); return; }

    const payload = verifyRefreshToken(refreshToken);
    const user    = await User.findById(payload.userId).select('+refreshTokens');
    if (!user || !user.refreshTokens?.includes(refreshToken)) {
      res.status(401).json({ success: false, error: 'Invalid refresh token' }); return;
    }

    const newAccess  = signAccessToken({ userId: user.id as string, role: user.role, email: user.email, referralCode: user.referralCode });
    const newRefresh = signRefreshToken({ userId: user.id as string });

    const tokens = user.refreshTokens.filter(t => t !== refreshToken);
    tokens.push(newRefresh);
    await User.findByIdAndUpdate(user.id, { refreshTokens: tokens });

    res.json({ success: true, data: { accessToken: newAccess, refreshToken: newRefresh } });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await User.findByIdAndUpdate(payload.userId, { $pull: { refreshTokens: refreshToken } });
      } catch { /* token already invalid — still succeed */ }
    }
    res.json({ success: true, data: null });
  } catch {
    res.json({ success: true, data: null });
  }
};

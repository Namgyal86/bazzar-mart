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
import crypto from 'crypto';
import { User } from './models/user.model';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './utils/jwt';
import { handleUserRegistered } from '../referrals/referral.controller';
import { internalBus, EVENTS } from '../../shared/events/emitter';
import { publishEvent } from '../../kafka/producer';
import { handleError } from '../../shared/middleware/error';
import { sendEmail } from '../../shared/services/email';

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

    // Send verification email (fire-and-forget — FEAT-02)
    {
      const rawToken  = crypto.randomBytes(32).toString('hex');
      const hashToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      User.findByIdAndUpdate(user.id, {
        emailVerificationToken:  hashToken,
        emailVerificationExpiry: Date.now() + 24 * 60 * 60 * 1000,
      }).catch(() => {});
      const verifyUrl = `${process.env.API_BASE_URL || 'http://localhost:8100'}/api/v1/auth/verify-email?token=${rawToken}`;
      sendEmail(
        user.email,
        'Bazzar Mart — Verify your email',
        `Hello ${user.firstName},\n\nVerify your email:\n\n${verifyUrl}`
      ).catch((err: unknown) => console.error('[auth] register verification email error:', err));
    }

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

// ── Password reset ────────────────────────────────────────────────────────────

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email?: string };
    // Always respond the same — no user enumeration
    res.json({ success: true, data: { message: 'If that email is registered, a reset link has been sent.' } });

    if (!email) return;
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordResetToken +passwordResetExpiry');
    if (!user) return;

    const rawToken  = crypto.randomBytes(32).toString('hex');
    const hashToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.passwordResetToken  = hashToken;
    user.passwordResetExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/auth/reset-password?token=${rawToken}`;
    sendEmail(
      user.email,
      'Bazzar Mart — Reset your password',
      `Hello ${user.firstName},\n\nClick the link below to reset your password (expires in 15 minutes):\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`
    ).catch((err: unknown) => console.error('[auth] forgot-password email error:', err));
  } catch (err: unknown) {
    // Already responded — just log
    console.error('[auth] forgotPassword error:', err);
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };
    if (!token || !newPassword) {
      res.status(400).json({ success: false, error: 'token and newPassword are required' }); return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'newPassword must be at least 6 characters' }); return;
    }
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken:  hash,
      passwordResetExpiry: { $gt: Date.now() },
    }).select('+password +passwordResetToken +passwordResetExpiry');

    if (!user) {
      res.status(400).json({ success: false, error: 'Reset token is invalid or has expired' }); return;
    }

    user.password            = newPassword; // pre-save hook bcrypt-hashes this
    user.passwordResetToken  = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    res.json({ success: true, data: { message: 'Password updated. You can now log in.' } });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

// ── Email verification ────────────────────────────────────────────────────────

export const sendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) { res.status(400).json({ success: false, error: 'email required' }); return; }
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+emailVerificationToken +emailVerificationExpiry');
    if (!user) { res.json({ success: true, data: { message: 'If that email is registered, a verification link has been sent.' } }); return; }
    if (user.isEmailVerified) { res.status(400).json({ success: false, error: 'Email already verified' }); return; }

    const rawToken  = crypto.randomBytes(32).toString('hex');
    const hashToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.emailVerificationToken  = hashToken;
    user.emailVerificationExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save({ validateBeforeSave: false });

    const verifyUrl = `${process.env.API_BASE_URL || 'http://localhost:8100'}/api/v1/auth/verify-email?token=${rawToken}`;
    sendEmail(
      user.email,
      'Bazzar Mart — Verify your email',
      `Hello ${user.firstName},\n\nClick the link to verify your email (expires in 24 hours):\n\n${verifyUrl}\n\nIf you did not create an account, ignore this email.`
    ).catch((err: unknown) => console.error('[auth] verification email error:', err));

    res.json({ success: true, data: { message: 'Verification email sent.' } });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query as { token?: string };
    if (!token) { res.status(400).json({ success: false, error: 'token required' }); return; }

    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      emailVerificationToken:  hash,
      emailVerificationExpiry: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpiry');

    if (!user) {
      res.status(400).json({ success: false, error: 'Verification token is invalid or has expired' }); return;
    }

    user.isEmailVerified         = true;
    user.emailVerificationToken  = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, data: { message: 'Email verified successfully.' } });
  } catch (err: unknown) {
    handleError(err, res);
  }
};

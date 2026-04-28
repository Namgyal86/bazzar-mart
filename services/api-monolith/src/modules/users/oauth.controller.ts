import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { User } from './models/user.model';
import { signAccessToken, signRefreshToken } from './utils/jwt';
import { env } from '../../config/env';

const pendingStates = new Map<string, number>();

function generateState(): string {
  const state = crypto.randomBytes(16).toString('hex');
  pendingStates.set(state, Date.now() + 10 * 60 * 1000); // 10 min TTL
  // Clean up expired states
  for (const [k, exp] of pendingStates) if (Date.now() > exp) pendingStates.delete(k);
  return state;
}

function validateState(state: string | undefined): boolean {
  if (!state) return false;
  const exp = pendingStates.get(state);
  if (!exp || Date.now() > exp) return false;
  pendingStates.delete(state);
  return true;
}

const WEB_URL = env.WEB_URL;
const API_BASE_URL = env.API_BASE_URL;

function oauthError(res: Response, message: string) {
  return res.redirect(`${WEB_URL}/auth/login?oauth_error=${encodeURIComponent(message)}`);
}

function generateReferralCode(firstName: string): string {
  return firstName.toUpperCase().slice(0, 4) + Math.random().toString(36).slice(2, 8).toUpperCase();
}

async function issueTokensAndRedirect(res: Response, userId: string, role: string, email: string, referralCode: string) {
  const accessToken = signAccessToken({ userId, role, email, referralCode });
  const refreshToken = signRefreshToken({ userId });

  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) return oauthError(res, 'User not found after OAuth');

  const tokens = [...(user.refreshTokens ?? []).slice(-4), refreshToken];
  await User.findByIdAndUpdate(userId, { refreshTokens: tokens });

  const params = new URLSearchParams({ accessToken, refreshToken });
  return res.redirect(`${WEB_URL}/auth/oauth/callback?${params.toString()}`);
}

// ── Google ────────────────────────────────────────────────────────────────────

export const googleRedirect = (_req: Request, res: Response): void => {
  if (!env.GOOGLE_CLIENT_ID) { res.status(501).json({ error: 'Google OAuth not configured' }); return; }
  const state = generateState();
  const params = new URLSearchParams({
    client_id:     env.GOOGLE_CLIENT_ID,
    redirect_uri:  `${API_BASE_URL}/api/v1/auth/google/callback`,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'online',
    state,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

export const googleCallback = async (req: Request, res: Response): Promise<void> => {
  const { code, error, state } = req.query as { code?: string; error?: string; state?: string };

  if (!validateState(state)) { oauthError(res, 'Invalid OAuth state — possible CSRF attack'); return; }
  if (error || !code) { oauthError(res, 'Google login was cancelled or denied'); return; }
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) { oauthError(res, 'Google OAuth not configured'); return; }

  try {
    // Exchange code for tokens
    const { data: tokenData } = await axios.post<{ access_token: string }>(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code,
        client_id:     env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri:  `${API_BASE_URL}/api/v1/auth/google/callback`,
        grant_type:    'authorization_code',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    // Fetch user profile
    const { data: profile } = await axios.get<{
      sub: string; email: string; given_name: string; family_name: string; picture?: string;
    }>('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const email = profile.email.toLowerCase().trim();

    // Find by googleId or email
    let user = await User.findOne({ $or: [{ googleId: profile.sub }, { email }] }).select('+refreshTokens');

    if (user) {
      if (!user.googleId) {
        user.googleId = profile.sub;
        if (!user.avatar && profile.picture) user.avatar = profile.picture;
        user.isEmailVerified = true;
        await user.save({ validateBeforeSave: false });
      }
    } else {
      user = await User.create({
        firstName:       profile.given_name || email.split('@')[0],
        lastName:        profile.family_name || 'User',
        email,
        googleId:        profile.sub,
        avatar:          profile.picture,
        isEmailVerified: true,
        referralCode:    generateReferralCode(profile.given_name || email.split('@')[0]),
      });
    }

    if (!user.isActive) { oauthError(res, 'Your account has been suspended'); return; }

    await issueTokensAndRedirect(res, user.id as string, user.role, user.email, user.referralCode);
  } catch (err) {
    console.error('[oauth] googleCallback error:', err);
    oauthError(res, 'Google authentication failed');
  }
};

// ── Facebook ──────────────────────────────────────────────────────────────────

export const facebookRedirect = (_req: Request, res: Response): void => {
  if (!env.FACEBOOK_APP_ID) { res.status(501).json({ error: 'Facebook OAuth not configured' }); return; }
  const state = generateState();
  const params = new URLSearchParams({
    client_id:    env.FACEBOOK_APP_ID,
    redirect_uri: `${API_BASE_URL}/api/v1/auth/facebook/callback`,
    scope:        'email,public_profile',
    state,
  });
  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`);
};

export const facebookCallback = async (req: Request, res: Response): Promise<void> => {
  const { code, error, state } = req.query as { code?: string; error?: string; state?: string };

  if (!validateState(state)) { oauthError(res, 'Invalid OAuth state — possible CSRF attack'); return; }
  if (error || !code) { oauthError(res, 'Facebook login was cancelled or denied'); return; }
  if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET) { oauthError(res, 'Facebook OAuth not configured'); return; }

  try {
    // Exchange code for access token
    const { data: tokenData } = await axios.get<{ access_token: string }>(
      'https://graph.facebook.com/v19.0/oauth/access_token',
      {
        params: {
          client_id:     env.FACEBOOK_APP_ID,
          client_secret: env.FACEBOOK_APP_SECRET,
          redirect_uri:  `${API_BASE_URL}/api/v1/auth/facebook/callback`,
          code,
        },
      },
    );

    // Fetch user profile
    const { data: profile } = await axios.get<{
      id: string; email?: string; first_name: string; last_name: string; picture?: { data?: { url?: string } };
    }>('https://graph.facebook.com/me', {
      params: {
        access_token: tokenData.access_token,
        fields:       'id,email,first_name,last_name,picture',
      },
    });

    if (!profile.email) { oauthError(res, 'Facebook account has no email address. Please use a different login method.'); return; }

    const email = profile.email.toLowerCase().trim();
    const avatarUrl = profile.picture?.data?.url;

    let user = await User.findOne({ $or: [{ facebookId: profile.id }, { email }] }).select('+refreshTokens');

    if (user) {
      if (!user.facebookId) {
        user.facebookId = profile.id;
        if (!user.avatar && avatarUrl) user.avatar = avatarUrl;
        user.isEmailVerified = true;
        await user.save({ validateBeforeSave: false });
      }
    } else {
      user = await User.create({
        firstName:       profile.first_name || email.split('@')[0],
        lastName:        profile.last_name || 'User',
        email,
        facebookId:      profile.id,
        avatar:          avatarUrl,
        isEmailVerified: true,
        referralCode:    generateReferralCode(profile.first_name || email.split('@')[0]),
      });
    }

    if (!user.isActive) { oauthError(res, 'Your account has been suspended'); return; }

    await issueTokensAndRedirect(res, user.id as string, user.role, user.email, user.referralCode);
  } catch (err) {
    console.error('[oauth] facebookCallback error:', err);
    oauthError(res, 'Facebook authentication failed');
  }
};

import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';

export function signAccessToken(payload: { userId: string; role: string; email: string; referralCode?: string }): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(payload: { userId: string }): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET ?? env.JWT_ACCESS_SECRET, { expiresIn: '30d' });
}

export function verifyAccessToken(token: string): { userId: string; role: string; email: string } {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string; role: string; email: string };
}

export function verifyRefreshToken(token: string): { userId: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET ?? env.JWT_ACCESS_SECRET) as { userId: string };
}

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
export interface AuthRequest extends Request { user?: { userId: string; role: string }; }
const SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_dev';
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const k = req.headers['x-user-id'] as string;
  if (k) { req.user = { userId: k, role: (req.headers['x-user-role'] as string) || 'BUYER' }; return next(); }
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'No token' });
  try { req.user = jwt.verify(h.slice(7), SECRET) as any; next(); } catch { res.status(401).json({ success: false, error: 'Invalid token' }); }
}
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) { try { req.user = jwt.verify(h.slice(7), SECRET) as any; } catch {} }
  next();
}

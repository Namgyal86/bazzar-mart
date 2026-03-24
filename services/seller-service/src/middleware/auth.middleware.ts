import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
export interface AuthRequest extends Request { user?: { userId: string; role: string; email?: string }; }
const SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_dev';
const JWT_SECRET = process.env.JWT_SECRET || 'bazzar-super-secret-jwt-key-2024';
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const k = req.headers['x-user-id'] as string;
  if (k) { req.user = { userId: k, role: (req.headers['x-user-role'] as string) || 'BUYER', email: req.headers['x-user-email'] as string }; return next(); }
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'No token' });
  try {
    const decoded = (jwt.verify(h.slice(7), SECRET) as any) || (jwt.verify(h.slice(7), JWT_SECRET) as any);
    req.user = decoded; next();
  } catch {
    try { req.user = jwt.verify(h.slice(7), JWT_SECRET) as any; next(); } catch { res.status(401).json({ success: false, error: 'Invalid token' }); }
  }
}
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ success: false, error: 'Forbidden' });
    next();
  };
}

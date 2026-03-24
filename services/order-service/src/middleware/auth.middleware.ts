import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
export interface AuthRequest extends Request { user?: { userId: string; role: string }; }
const SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_dev';
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const kongId = req.headers['x-user-id'] as string;
  if (kongId) { req.user = { userId: kongId, role: (req.headers['x-user-role'] as string) || 'BUYER' }; return next(); }
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'No token' });
  try { req.user = jwt.verify(h.slice(7), SECRET) as any; next(); } catch { res.status(401).json({ success: false, error: 'Invalid token' }); }
}
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ success: false, error: 'Forbidden' });
    next();
  };
}

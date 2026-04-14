/**
 * Consolidated auth middleware — replaces 9 identical copies across services.
 *
 * Priority order:
 *  1. Kong gateway headers (x-user-id + x-user-role)
 *  2. Authorization: Bearer <JWT>
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string; email: string };
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const kongUserId = req.headers['x-user-id'] as string | undefined;
  const kongUserRole = req.headers['x-user-role'] as string | undefined;

  if (kongUserId && kongUserRole) {
    req.user = { userId: kongUserId, role: kongUserRole, email: '' };
    next();
    return;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'No token' });
    return;
  }
  try {
    req.user = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as AuthRequest['user'];
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as AuthRequest['user']; } catch { /* ignore */ }
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }
    next();
  };
}

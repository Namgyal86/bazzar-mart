import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { userId: string; role: string; email: string };
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access_secret_dev';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  // Kong passes these headers
  const kongUserId = req.headers['x-user-id'] as string;
  const kongUserRole = req.headers['x-user-role'] as string;

  if (kongUserId && kongUserRole) {
    req.user = { userId: kongUserId, role: kongUserRole, email: '' };
    return next();
  }

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token' });
  }
  try {
    req.user = jwt.verify(header.slice(7), ACCESS_SECRET) as any;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.slice(7), ACCESS_SECRET) as any; } catch {}
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    next();
  };
}

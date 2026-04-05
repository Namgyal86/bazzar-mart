import { Request, Response, NextFunction } from 'express';

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[error]', err.message, err.stack);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
}

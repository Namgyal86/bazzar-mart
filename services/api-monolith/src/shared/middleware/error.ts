import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[error]', err.message, err.stack);
  const message = env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';
  res.status(500).json({ success: false, error: message });
}

export function handleError(err: unknown, res: Response): void {
  const error = err instanceof Error ? err : new Error(String(err));
  console.error('[error]', error.message, error.stack);

  if ((err as { name?: string })?.name === 'ZodError') {
    res.status(400).json({ success: false, error: (err as { errors: unknown }).errors });
    return;
  }

  const message = env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error.message || 'Internal server error';

  res.status(500).json({ success: false, error: message });
}

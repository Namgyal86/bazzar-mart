import { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[error]', err.message, err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
}

export function handleError(err: unknown, res: Response): void {
  if ((err as { name?: string })?.name === 'ZodError') {
    const zodErr = err as { errors: Array<{ path: (string | number)[]; message: string }> };
    const message = zodErr.errors.map(e => `${e.path.join('.') || 'field'}: ${e.message}`).join('; ');
    res.status(400).json({ success: false, error: message });
    return;
  }

  // Mongoose ValidationError
  if ((err as any)?.name === 'ValidationError') {
    const messages = Object.values((err as any).errors ?? {})
      .map((e: any) => e.message)
      .join('; ');
    res.status(400).json({ success: false, error: messages || 'Validation failed' });
    return;
  }

  // MongoDB duplicate key — expected client error, no server log needed
  if ((err as any)?.code === 11000) {
    const field = Object.keys((err as any).keyPattern ?? {})[0] ?? 'field';
    const value = (err as any).keyValue?.[field] ?? '';
    res.status(409).json({ success: false, error: `"${value}" already exists. Choose a different ${field}.` });
    return;
  }

  // Unexpected server error — log it, never expose internals
  const error = err instanceof Error ? err : new Error(String(err));
  console.error('[error]', error.message, error.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
}

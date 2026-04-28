/**
 * Analytics module routes — mirrors analytics-service (port 8014) endpoints.
 */
import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../../shared/middleware/auth';
import {
  trackEvent,
  getSettings, saveSettings,
  adminOverview,
  platformHealth,
  adminRevenue,
  adminSearches,
  publicStats,
} from './analytics.controller';

const VALID_EVENT_TYPES = new Set([
  'view', 'search', 'click', 'add_to_cart', 'remove_from_cart',
  'purchase', 'page_view', 'product_view', 'category_view',
]);

const eventLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

function validateEventType(req: Request, res: Response, next: NextFunction): void {
  const { type } = req.body as { type?: string };
  if (!type || !VALID_EVENT_TYPES.has(type)) {
    res.status(400).json({ success: false, error: `Invalid event type. Allowed: ${[...VALID_EVENT_TYPES].join(', ')}` });
    return;
  }
  next();
}

const router = Router();

// Public
router.post('/analytics/event', eventLimiter, validateEventType, trackEvent);
router.get ('/analytics/platform-health',  platformHealth);
router.get ('/stats',                       publicStats);
router.get ('/settings/public',            async (_req, res) => {
  try {
    const { Settings } = await import('./analytics.model');
    const doc = await Settings.findOne({ section: 'site_settings' }).lean();
    res.json({ success: true, data: doc?.data ?? {} });
  } catch { res.json({ success: true, data: {} }); }
});

// Admin
router.get ('/analytics/admin/settings',  authenticate, requireRole('ADMIN'), getSettings);
router.post('/analytics/admin/settings',  authenticate, requireRole('ADMIN'), saveSettings);
router.get ('/analytics/admin/overview',  authenticate, requireRole('ADMIN'), adminOverview);
router.get ('/analytics/admin/revenue',   authenticate, requireRole('ADMIN'), adminRevenue);
router.get ('/analytics/admin/searches',  authenticate, requireRole('ADMIN'), adminSearches);

export default router;

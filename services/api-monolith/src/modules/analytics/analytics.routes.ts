/**
 * Analytics module routes — mirrors analytics-service (port 8014) endpoints.
 */
import { Router } from 'express';
import { authenticate, requireRole } from '../../shared/middleware/auth';
import {
  trackEvent,
  getSettings, saveSettings,
  adminOverview,
  platformHealth,
  adminRevenue,
  adminSearches,
} from './analytics.controller';

const router = Router();

// Public
router.post('/analytics/event',            trackEvent);
router.get ('/analytics/platform-health',  platformHealth);

// Admin
router.get ('/analytics/admin/settings',  authenticate, requireRole('ADMIN'), getSettings);
router.post('/analytics/admin/settings',  authenticate, requireRole('ADMIN'), saveSettings);
router.get ('/analytics/admin/overview',  authenticate, requireRole('ADMIN'), adminOverview);
router.get ('/analytics/admin/revenue',   authenticate, requireRole('ADMIN'), adminRevenue);
router.get ('/analytics/admin/searches',  authenticate, requireRole('ADMIN'), adminSearches);

export default router;

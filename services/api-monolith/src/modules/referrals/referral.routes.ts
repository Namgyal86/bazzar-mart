import { Router } from 'express';
import { authenticate, requireRole } from '../../shared/middleware/auth';
import {
  applyWalletCredits,
  getWallet, getMyReferrals, getMyDashboard, getMyCode,
  getReferralDashboard, getReferralHistory, validateCode,
  adminListReferrals, adminRevokeReferral, adminGetConfig, adminUpdateConfig,
} from './referral.controller';

const router = Router();

// Public
router.get('/referrals/validate/:code', validateCode);

// Authenticated buyer routes
router.post('/referrals/apply',    authenticate, applyWalletCredits); // apply wallet credits at checkout
router.get ('/referrals/wallet',   authenticate, getWallet);
router.get ('/referrals/mine',     authenticate, getMyReferrals);
router.get ('/referrals/my',       authenticate, getMyDashboard);   // combined wallet + referrals
router.get ('/referrals/my-code',  authenticate, getMyCode);
router.get ('/referrals/dashboard', authenticate, getReferralDashboard);
router.get ('/referrals/history',  authenticate, getReferralHistory);

// Admin
router.get  ('/admin/referrals',              authenticate, requireRole('ADMIN'), adminListReferrals);
router.patch('/admin/referrals/:id/revoke',   authenticate, requireRole('ADMIN'), adminRevokeReferral);
router.get  ('/admin/referral-config',        authenticate, requireRole('ADMIN'), adminGetConfig);
router.patch('/admin/referral-config/:key',   authenticate, requireRole('ADMIN'), adminUpdateConfig);

export default router;

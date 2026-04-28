import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { optionalAuth, authenticate, requireRole } from '../../shared/middleware/auth';
import {
  submitContact, submitAdminContact,
  listMessages, listAdminMessages, updateMessageStatus,
} from './support.controller';

const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });

const router = Router();

router.post('/support/contact',        contactLimiter, optionalAuth, submitContact);
router.post('/support/admin-contact',  contactLimiter, optionalAuth, submitAdminContact);
router.get ('/support/messages',       authenticate, requireRole('ADMIN'), listMessages);
router.get ('/support/admin-messages', authenticate, requireRole('ADMIN'), listAdminMessages);
router.patch('/support/messages/:id',  authenticate, requireRole('ADMIN'), updateMessageStatus);

export default router;

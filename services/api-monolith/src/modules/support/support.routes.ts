import { Router } from 'express';
import { optionalAuth, authenticate, requireRole } from '../../shared/middleware/auth';
import {
  submitContact, submitAdminContact,
  listMessages, listAdminMessages, updateMessageStatus,
} from './support.controller';

const router = Router();

router.post('/support/contact',        optionalAuth, submitContact);
router.post('/support/admin-contact',  optionalAuth, submitAdminContact);
router.get ('/support/messages',       authenticate, requireRole('ADMIN'), listMessages);
router.get ('/support/admin-messages', authenticate, requireRole('ADMIN'), listAdminMessages);
router.patch('/support/messages/:id',  authenticate, requireRole('ADMIN'), updateMessageStatus);

export default router;

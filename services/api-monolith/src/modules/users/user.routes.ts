/**
 * Users module routes.
 * Preserves all original endpoints from user-service (port 8001):
 *   /api/v1/auth/*   — register, login, refresh, logout
 *   /api/v1/users/*  — profile, addresses, wishlist, admin
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from '../../shared/middleware/auth';
import { register, login, refresh, logout, forgotPassword, resetPassword, sendVerificationEmail, verifyEmail } from './auth.controller';
import {
  getMe, updateMe,
  getWishlist, syncWishlist, addToWishlist, removeFromWishlist,
  getAddresses, addAddress, updateAddress, deleteAddress,
  getUserById, adminListUsers, adminGetStats, adminUpdateUser,
} from './user.controller';

// Tight rate-limit only on auth mutation endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

const router = Router();

// ── Auth (/api/v1/auth) ───────────────────────────────────────────────────────
router.post('/auth/register',      authLimiter, register);
router.post('/auth/login',         authLimiter, login);
router.post('/auth/token/refresh', refresh);
router.post('/auth/refresh',       refresh);     // mobile alias
router.post('/auth/logout',        logout);
router.post('/auth/password/forgot',     authLimiter, forgotPassword);
router.post('/auth/password/reset',      authLimiter, resetPassword);
router.get ('/auth/verify-email',        verifyEmail);
router.post('/auth/resend-verification', authLimiter, sendVerificationEmail);

// ── Users (/api/v1/users) ─────────────────────────────────────────────────────
router.use('/users', authenticate);

// Profile
router.get ('/users/me',   getMe);
router.put ('/users/me',   updateMe);

// Wishlist — /me/wishlist and /wishlist (mobile alias)
router.get   ('/users/me/wishlist',          getWishlist);
router.put   ('/users/me/wishlist',          syncWishlist);
router.post  ('/users/me/wishlist/:productId', addToWishlist);
router.delete('/users/me/wishlist/:productId', removeFromWishlist);
router.get   ('/users/wishlist',             getWishlist);
router.post  ('/users/wishlist/:productId',  addToWishlist);
router.delete('/users/wishlist/:productId',  removeFromWishlist);

// Addresses — /me/addresses and /addresses (mobile alias)
router.get   ('/users/me/addresses',    getAddresses);
router.post  ('/users/me/addresses',    addAddress);
router.put   ('/users/me/addresses/:id', updateAddress);
router.delete('/users/me/addresses/:id', deleteAddress);
router.get   ('/users/addresses',       getAddresses);
router.post  ('/users/addresses',       addAddress);
router.delete('/users/addresses/:id',   deleteAddress);

// Admin — must be before /:id
router.get  ('/users/admin/list',        requireRole('ADMIN'), adminListUsers);
router.get  ('/users/admin/stats',       requireRole('ADMIN'), adminGetStats);
router.put  ('/users/admin/:id',         requireRole('ADMIN'), adminUpdateUser);
router.patch('/users/admin/:id',         requireRole('ADMIN'), adminUpdateUser);
router.put  ('/users/admin/:id/status',  requireRole('ADMIN'), adminUpdateUser);
router.patch('/users/admin/:id/status',  requireRole('ADMIN'), adminUpdateUser);

// Dynamic param last
router.get('/users/:id', getUserById);

export default router;

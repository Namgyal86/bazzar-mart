import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getMe, updateMe, getAddresses, addAddress, updateAddress, deleteAddress, getUserById, adminListUsers, adminUpdateUser, adminGetStats, getWishlist, syncWishlist, addToWishlist, removeFromWishlist } from '../controllers/user.controller';

const router = Router();
router.use(authenticate);
router.get('/me', getMe);
router.put('/me', updateMe);
router.get('/me/wishlist', getWishlist);
router.put('/me/wishlist', syncWishlist);
router.post('/me/wishlist/:productId', addToWishlist);
router.delete('/me/wishlist/:productId', removeFromWishlist);
router.get('/me/addresses', getAddresses);
router.post('/me/addresses', addAddress);
router.put('/me/addresses/:id', updateAddress);
router.delete('/me/addresses/:id', deleteAddress);
// Aliases without /me/ for mobile clients
router.get('/wishlist', getWishlist);
router.post('/wishlist/:productId', addToWishlist);
router.delete('/wishlist/:productId', removeFromWishlist);
router.get('/addresses', getAddresses);
router.post('/addresses', addAddress);
router.delete('/addresses/:id', deleteAddress);
// Admin routes (must be before /:id)
router.get('/admin/list', adminListUsers);
router.get('/admin/stats', adminGetStats);
router.put('/admin/:id', adminUpdateUser);
router.patch('/admin/:id', adminUpdateUser);       // PATCH alias for mobile clients
router.put('/admin/:id/status', adminUpdateUser);  // alias — same handler accepts isActive
router.patch('/admin/:id/status', adminUpdateUser); // PATCH alias
// Dynamic param route last
router.get('/:id', getUserById);

export default router;

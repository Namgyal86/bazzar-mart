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
// Admin routes (must be before /:id)
router.get('/admin/list', adminListUsers);
router.get('/admin/stats', adminGetStats);
router.put('/admin/:id', adminUpdateUser);
router.put('/admin/:id/status', adminUpdateUser);  // alias — same handler accepts isActive
// Dynamic param route last
router.get('/:id', getUserById);

export default router;

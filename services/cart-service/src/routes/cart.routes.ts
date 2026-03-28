import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getCart, addItem, updateItem, removeItem, clearCart } from '../controllers/cart.controller';

const router = Router();
router.use(authenticate);
router.get('/', getCart);
router.post('/items', addItem);
router.put('/items/:productId', updateItem);
router.patch('/items/:productId', updateItem);  // PATCH alias for web/mobile clients
router.delete('/items/:productId', removeItem);
router.delete('/', clearCart);
export default router;

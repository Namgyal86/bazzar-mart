import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth';
import { getCart, addItem, updateItem, removeItem, clearCart } from './cart.controller';

const router = Router();
router.use('/cart', authenticate);

router.get   ('/cart',                 getCart);
router.post  ('/cart/items',           addItem);
router.put   ('/cart/items/:productId', updateItem);
router.patch ('/cart/items/:productId', updateItem);
router.delete('/cart/items/:productId', removeItem);
router.delete('/cart',                 clearCart);

export default router;

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate, addItemSchema, updateItemSchema } from '../middleware/validation';
import { getCart, addItem, updateItem, removeItem, clearCart } from '../controllers/cart.controller';

const router = Router();
router.use(authenticate);
router.get('/', getCart);
router.post('/items', validate(addItemSchema), addItem);
router.put('/items/:productId', validate(updateItemSchema), updateItem);
router.patch('/items/:productId', validate(updateItemSchema), updateItem);
router.delete('/items/:productId', removeItem);
router.delete('/', clearCart);
export default router;

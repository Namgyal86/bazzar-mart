/**
 * Search module routes — mirrors search-service (port 8009) endpoints.
 */
import { Router } from 'express';
import { search, searchProducts, suggestions, similarProducts } from './search.controller';

const router = Router();

router.get('/search',                   search);
router.get('/search/products',          searchProducts);
router.get('/search/suggestions',       suggestions);
router.get('/search/similar/:productId', similarProducts);

export default router;

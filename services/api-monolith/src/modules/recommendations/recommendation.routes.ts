/**
 * Recommendation module routes — mirrors recommendation-service (port 8010) endpoints.
 */
import { Router } from 'express';
import { trackView, forUser, similarProducts, trending } from './recommendation.controller';

const router = Router();

router.post('/recommendations/track',              trackView);
router.get ('/recommendations/for/:userId',        forUser);
router.get ('/recommendations/similar/:productId', similarProducts);
router.get ('/recommendations/trending',           trending);

export default router;

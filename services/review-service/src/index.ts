import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import reviewRoutes, { helpfulRouter, adminReviewRouter } from './routes/review.routes';

const app = express();
const PORT = process.env.PORT || 8006;
const MONGO_URI = process.env.MONGO_URI_REVIEW || 'mongodb://localhost:27021/review_db';

app.use(helmet()); app.use(cors({ origin: '*', credentials: true })); app.use(express.json());
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'review-service' }));
app.use('/api/v1/products/:productId/reviews', reviewRoutes);
// Alias for frontend compatibility: /api/v1/reviews/:productId
app.use('/api/v1/reviews/:productId', reviewRoutes);
// Admin review management
app.use('/api/v1/reviews', adminReviewRouter);
// Standalone review actions: /api/v1/reviews/:reviewId/helpful
app.use('/api/v1/reviews', helpfulRouter);
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.statusCode || 500).json({ success: false, error: err.message });
});
mongoose.connect(MONGO_URI)
  .then(() => { console.log('✅ Connected to review_db'); app.listen(PORT, () => console.log(`🚀 Review Service on port ${PORT}`)); })
  .catch((err) => { console.error(err); process.exit(1); });

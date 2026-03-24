import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import productRoutes from './routes/product.routes';
import categoryRoutes from './routes/category.routes';
import bannerRoutes from './routes/banner.routes';
import { seedCategories } from './controllers/category.controller';
import { seedBanners } from './models/banner.model';

const app = express();
const PORT = process.env.PORT || 8002;
const MONGO_URI = process.env.MONGO_URI_PRODUCT || 'mongodb://localhost:27017/product_db';

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'product-service' }));
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/banners', bannerRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Server error' });
});

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to product_db');
    await seedCategories();
    await seedBanners();
    app.listen(PORT, () => console.log(`🚀 Product Service running on port ${PORT}`));
  })
  .catch((err) => { console.error('❌ DB error:', err); process.exit(1); });

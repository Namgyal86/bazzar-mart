import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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

// File upload endpoint
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
app.use('/uploads', express.static(uploadDir));
app.post('/api/v1/upload/image', upload.single('file'), (req: any, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const baseUrl = process.env.PRODUCT_SERVICE_URL || `http://localhost:${process.env.PORT || 8002}`;
  res.json({ success: true, data: { url: `${baseUrl}/uploads/${req.file.filename}`, filename: req.file.filename } });
});

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

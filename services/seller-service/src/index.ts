import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import sellerRoutes from './routes/seller.routes';

const app = express();
const PORT = process.env.PORT || 8007;
const MONGO_URI = process.env.MONGO_URI_SELLER || 'mongodb://localhost:27017/seller_db';

app.use(helmet()); app.use(cors({ origin: '*', credentials: true })); app.use(express.json());
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'seller-service' }));
app.use('/api/v1/seller', sellerRoutes);
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.statusCode || 500).json({ success: false, error: err.message });
});
mongoose.connect(MONGO_URI)
  .then(() => { console.log('✅ Connected to seller_db'); app.listen(PORT, () => console.log(`🚀 Seller Service on port ${PORT}`)); })
  .catch((err) => { console.error(err); process.exit(1); });

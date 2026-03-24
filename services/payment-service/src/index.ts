import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import paymentRoutes from './routes/payment.routes';

const app = express();
const PORT = process.env.PORT || 8005;
const MONGO_URI = process.env.MONGO_URI_PAYMENT || 'mongodb://localhost:27017/payment_db';

app.use(helmet()); app.use(cors({ origin: '*', credentials: true })); app.use(express.json());
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'payment-service' }));
app.use('/api/v1/payments', paymentRoutes);
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(err.statusCode || 500).json({ success: false, error: err.message });
});
mongoose.connect(MONGO_URI)
  .then(() => { console.log('✅ Connected to payment_db'); app.listen(PORT, () => console.log(`🚀 Payment Service on port ${PORT}`)); })
  .catch((err) => { console.error('❌ DB error:', err); process.exit(1); });

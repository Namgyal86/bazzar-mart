import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cartRoutes from './routes/cart.routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'cart-service' }));
app.get('/metrics', (_, res) => res.json({ status: 'ok', service: 'cart-service', uptime: process.uptime() }));
app.use('/api/v1/cart', cartRoutes);

app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.statusCode || 500).json({ success: false, error: err.message });
});

export default app;

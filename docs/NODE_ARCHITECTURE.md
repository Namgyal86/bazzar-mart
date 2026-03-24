# Node.js Service Architecture

> Stack: **Node.js 20 + Express.js + TypeScript + Mongoose (MongoDB)**
> Every microservice follows this exact pattern. No exceptions.

---

## 1. Service Folder Structure

```
{service-name}/
├── src/
│   ├── config/
│   │   ├── db.ts              # Mongoose connect — fail fast if DB unreachable
│   │   ├── redis.ts           # ioredis client — BullMQ + cache + sessions
│   │   ├── kafka.ts           # KafkaJS producer/consumer setup
│   │   └── env.ts             # Zod-validated env vars — crash on missing keys
│   │
│   ├── models/                # Mongoose schemas + TypeScript interfaces
│   │   └── {entity}.model.ts
│   │
│   ├── repositories/          # ALL DB queries — no business logic
│   │   └── {entity}.repository.ts
│   │
│   ├── services/              # ALL business logic — no req/res here
│   │   └── {entity}.service.ts
│   │
│   ├── controllers/           # Thin: validate → service → respond
│   │   └── {entity}.controller.ts
│   │
│   ├── routes/
│   │   └── {entity}.routes.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts      # Verify JWT, attach req.user
│   │   ├── validate.middleware.ts  # Zod schema validation
│   │   ├── role.middleware.ts      # Role-based access control
│   │   └── errorHandler.ts        # Central error → HTTP mapper
│   │
│   ├── jobs/                  # BullMQ workers (async background tasks)
│   │   └── {entity}.jobs.ts
│   │
│   ├── kafka/
│   │   ├── producer.ts
│   │   └── consumers/
│   │       └── {event}.consumer.ts
│   │
│   └── app.ts                 # Express app factory (no listen — testable)
│   └── server.ts              # Entry point: app.listen + DB connect
│
├── tests/
│   ├── unit/
│   └── integration/
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

## 2. Layer Responsibilities

### 2.1 Model Layer (`models/`)
Define Mongoose schema + TypeScript interface. **No business logic.**

```typescript
// models/product.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  sellerId: string;
  name: string;
  slug: string;
  basePrice: number;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    sellerId: { type: String, required: true, index: true },
    name: { type: String, required: true, maxlength: 500 },
    slug: { type: String, required: true, unique: true },
    basePrice: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ProductSchema.index({ sellerId: 1, isActive: 1 });
ProductSchema.index({ basePrice: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
```

### 2.2 Repository Layer (`repositories/`)
All DB queries via Mongoose. **No business logic. No req/res.**

```typescript
// repositories/product.repository.ts
import { Product, IProduct } from '../models/product.model';
import { NotFoundError } from '../middleware/errorHandler';

export class ProductRepository {
  async findById(id: string): Promise<IProduct> {
    const product = await Product.findOne({ _id: id, isActive: true }).lean();
    if (!product) throw new NotFoundError(`Product ${id} not found`);
    return product;
  }

  async findBySeller(sellerId: string, page: number, limit: number): Promise<IProduct[]> {
    return Product.find({ sellerId, isActive: true })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async decrementStock(id: string, quantity: number): Promise<IProduct> {
    const product = await Product.findOneAndUpdate(
      { _id: id, stock: { $gte: quantity } },     // Atomic check + update
      { $inc: { stock: -quantity } },
      { new: true }
    );
    if (!product) throw new Error(`Insufficient stock for product ${id}`);
    return product;
  }
}
```

### 2.3 Service Layer (`services/`)
All business logic. May call repositories, Redis, Kafka, other services. **No req/res objects.**

```typescript
// services/product.service.ts
import { ProductRepository } from '../repositories/product.repository';
import { KafkaProducer } from '../kafka/producer';
import { redisClient } from '../config/redis';
import { InsufficientStockError } from '../middleware/errorHandler';

export class ProductService {
  constructor(
    private repo: ProductRepository,
    private kafka: KafkaProducer,
    private cache: typeof redisClient,
  ) {}

  async getProduct(id: string) {
    const cacheKey = `product:${id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const product = await this.repo.findById(id);
    await this.cache.setex(cacheKey, 120, JSON.stringify(product));
    return product;
  }

  async reserveStock(productId: string, quantity: number): Promise<void> {
    const product = await this.repo.decrementStock(productId, quantity);
    await this.cache.del(`product:${productId}`);         // Invalidate cache
    await this.kafka.publish('inventory.updated', {
      productId,
      newStock: product.stock,
    });
  }
}
```

### 2.4 Controller Layer (`controllers/`)
Thin: validate input → call service → return standard response. **No business logic.**

```typescript
// controllers/product.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';

export class ProductController {
  constructor(private service: ProductService) {}

  getProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await this.service.getProduct(req.params.id);
      res.json({ success: true, data: product });
    } catch (err) {
      next(err);    // Central error handler maps to HTTP status
    }
  };
}
```

---

## 3. Standard Response Envelope

```typescript
// All responses MUST follow this shape:

// Success (single item)
{ "success": true, "data": { ... } }

// Success (list)
{ "success": true, "data": [...], "meta": { "page": 1, "limit": 20, "total": 847 } }

// Error
{ "success": false, "error": "Human-readable message", "code": "PRODUCT_NOT_FOUND" }
```

---

## 4. Central Error Handler

```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(public message: string, public statusCode: number, public code: string) {
    super(message);
  }
}
export class NotFoundError extends AppError {
  constructor(msg: string) { super(msg, 404, 'NOT_FOUND'); }
}
export class ForbiddenError extends AppError {
  constructor(msg = 'Forbidden') { super(msg, 403, 'FORBIDDEN'); }
}
export class ValidationError extends AppError {
  constructor(msg: string) { super(msg, 400, 'VALIDATION_ERROR'); }
}
export class ConflictError extends AppError {
  constructor(msg: string) { super(msg, 409, 'CONFLICT'); }
}

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
  }
  console.error(err);
  res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
};
```

---

## 5. Auth Middleware

```typescript
// middleware/auth.middleware.ts
import jwt from 'jsonwebtoken';
import { ForbiddenError } from './errorHandler';

export interface JwtPayload {
  sub: string;          // userId
  role: 'BUYER' | 'SELLER' | 'ADMIN' | 'DELIVERY';
  sellerId?: string;
  deliveryAgentId?: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request { user?: JwtPayload; }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw new ForbiddenError('No token provided');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    next();
  } catch {
    throw new ForbiddenError('Invalid or expired token');
  }
};

export const requireRole = (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ForbiddenError(`Requires role: ${roles.join(' or ')}`);
    }
    next();
  };
```

---

## 6. Zod Input Validation

```typescript
// middleware/validate.middleware.ts
import { z } from 'zod';
import { ValidationError } from './errorHandler';

export const validate = (schema: z.ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError(result.error.errors.map(e => e.message).join(', '));
    }
    req.body = result.data;
    next();
  };

// Usage in routes:
// router.post('/products', authenticate, requireRole('SELLER'), validate(CreateProductSchema), controller.create);
```

---

## 7. BullMQ Async Jobs

```typescript
// jobs/email.jobs.ts
import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis';

export const emailQueue = new Queue('emails', { connection: redis });

// Enqueue from service:
await emailQueue.add('send-order-confirmation', { orderId, userEmail });

// Worker (separate process or same service):
new Worker('emails', async (job) => {
  if (job.name === 'send-order-confirmation') {
    await sendEmail(job.data.userEmail, 'Order Confirmed', template(job.data.orderId));
  }
}, { connection: redis });
```

---

## 8. Health & Metrics Endpoints (required on every service)

```typescript
// routes/health.routes.ts
router.get('/health', async (_req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  const redisOk = await redis.ping().then(() => true).catch(() => false);
  const status = dbOk && redisOk ? 'healthy' : 'degraded';
  res.status(dbOk ? 200 : 503).json({ status, checks: { db: dbOk, redis: redisOk } });
});

router.get('/metrics', metricsHandler);   // prom-client default metrics
```

/**
 * Seed script — upserts BAZZAR10 coupon with proper limits and expiry.
 * Safe to re-run: uses findOneAndUpdate with upsert.
 *
 * Usage: npm run seed:coupons
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Coupon } from '../src/modules/orders/models/coupon.model';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bazzar_db';

async function seed(): Promise<void> {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1); // 1 year from run date

  const result = await Coupon.findOneAndUpdate(
    { code: 'BAZZAR10' },
    {
      $set: {
        code:        'BAZZAR10',
        type:        'PERCENTAGE',
        value:       10,
        usageLimit:  1000,
        validUntil,
        minOrder:    500,
        maxDiscount: 0,   // unlimited max discount
        isActive:    true,
      },
      $setOnInsert: { usageCount: 0 },
    },
    { upsert: true, new: true },
  );

  console.log('Upserted BAZZAR10:', result?.toObject());
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });

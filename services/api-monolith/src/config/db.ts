/**
 * Single Mongoose connection shared by all modules.
 *
 * Previously each microservice had its own `config/db.ts` pointing to an
 * isolated MongoDB database. In the monolith all modules share one URI
 * (MONGO_URI → bazzar_monolith). Collection names are unique across modules
 * (products, orders, coupons, payments, sellers, reviews, referrals, …) so
 * there are no collisions.
 */
import mongoose from 'mongoose';
import { env } from './env';

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) return;

  mongoose.connection.on('connected', () => console.log('✅ MongoDB connected'));
  mongoose.connection.on('error',     (err) => console.error('❌ MongoDB error:', err));
  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('⚠️  MongoDB disconnected');
  });

  await mongoose.connect(env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 20,           // shared across all module queries
  });

  isConnected = true;
}

export function getDB() {
  return mongoose.connection;
}

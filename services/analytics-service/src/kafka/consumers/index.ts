import { Kafka } from 'kafkajs';
import mongoose from 'mongoose';

const kafka = new Kafka({
  clientId: 'analytics-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

export async function startAnalyticsConsumers(): Promise<void> {
  const consumer = kafka.consumer({ groupId: 'analytics-service-group' });
  await consumer.connect();
  await consumer.subscribe({
    topics: ['order.created', 'payment.success', 'delivery.completed', 'user.registered'],
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const envelope = JSON.parse(message.value!.toString());
        const payload = envelope.payload ?? envelope;
        const db = mongoose.connection.db;
        if (!db) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (topic === 'order.created') {
          await db.collection('platformmetrics').updateOne(
            { date: today },
            {
              $inc: { totalOrders: 1, totalRevenue: payload.totalAmount || 0 },
              $set: { updatedAt: new Date() },
              $setOnInsert: { date: today, createdAt: new Date() },
            },
            { upsert: true }
          );
          if (payload.sellerId) {
            await db.collection('sellermetrics').updateOne(
              { sellerId: payload.sellerId, date: today },
              {
                $inc: { orders: 1, revenue: payload.totalAmount || 0 },
                $set: { updatedAt: new Date() },
                $setOnInsert: { sellerId: payload.sellerId, date: today, createdAt: new Date() },
              },
              { upsert: true }
            );
          }
          console.log(`📊 Analytics: order.created recorded`);
        }

        if (topic === 'payment.success') {
          await db.collection('platformmetrics').updateOne(
            { date: today },
            {
              $inc: { totalPayments: 1, totalPaymentValue: payload.amount || 0 },
              $set: { updatedAt: new Date() },
              $setOnInsert: { date: today, createdAt: new Date() },
            },
            { upsert: true }
          );
        }

        if (topic === 'user.registered') {
          await db.collection('platformmetrics').updateOne(
            { date: today },
            {
              $inc: { newUsers: 1 },
              $set: { updatedAt: new Date() },
              $setOnInsert: { date: today, createdAt: new Date() },
            },
            { upsert: true }
          );
        }

        if (topic === 'delivery.completed') {
          await db.collection('platformmetrics').updateOne(
            { date: today },
            {
              $inc: { deliveriesCompleted: 1 },
              $set: { updatedAt: new Date() },
              $setOnInsert: { date: today, createdAt: new Date() },
            },
            { upsert: true }
          );
        }
      } catch (err: any) {
        console.error(`[analytics-consumer] Error on topic ${topic}:`, err.message);
      }
    },
  });

  console.log('✅ Analytics consumers listening on: order.created, payment.success, delivery.completed, user.registered');
}

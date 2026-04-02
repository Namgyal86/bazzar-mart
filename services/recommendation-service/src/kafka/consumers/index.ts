import { Kafka } from 'kafkajs';
import mongoose from 'mongoose';

const kafka = new Kafka({
  clientId: 'recommendation-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

export async function startRecommendationConsumers(): Promise<void> {
  const consumer = kafka.consumer({ groupId: 'recommendation-service-group' });
  await consumer.connect();
  await consumer.subscribe({ topics: ['product.created', 'review.posted', 'order.created'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const envelope = JSON.parse(message.value!.toString());
        const payload = envelope.payload ?? envelope;
        const db = mongoose.connection.db;
        if (!db) return;

        if (topic === 'review.posted') {
          await db.collection('userproductinteractions').updateOne(
            { userId: payload.userId, productId: payload.productId },
            {
              $set: { rating: payload.rating, interactionType: 'REVIEW', updatedAt: new Date() },
              $setOnInsert: { createdAt: new Date() },
            },
            { upsert: true }
          );
          console.log(`📝 Recommendation: review interaction recorded`);
        }

        if (topic === 'order.created') {
          for (const item of (payload.items || [])) {
            await db.collection('userproductinteractions').updateOne(
              { userId: payload.userId, productId: item.productId },
              {
                $set: { interactionType: 'PURCHASE', updatedAt: new Date() },
                $setOnInsert: { createdAt: new Date() },
              },
              { upsert: true }
            );
          }
          console.log(`🛒 Recommendation: purchase interactions recorded for order ${payload.orderId}`);
        }

        if (topic === 'product.created') {
          await db.collection('trendingproducts').updateOne(
            { productId: payload.productId },
            { $setOnInsert: { productId: payload.productId, sellerId: payload.sellerId, score: 0, createdAt: new Date() } },
            { upsert: true }
          );
        }
      } catch (err: any) {
        console.error(`[recommendation-consumer] Error on topic ${topic}:`, err.message);
      }
    },
  });

  console.log('✅ Recommendation consumers listening on: product.created, review.posted, order.created');
}

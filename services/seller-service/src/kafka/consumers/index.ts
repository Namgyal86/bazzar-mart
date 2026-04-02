import { Kafka } from 'kafkajs';
import mongoose from 'mongoose';

const kafka = new Kafka({
  clientId: 'seller-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

export async function startSellerConsumers(): Promise<void> {
  const consumer = kafka.consumer({ groupId: 'seller-service-group' });
  await consumer.connect();
  await consumer.subscribe({ topics: ['payment.success', 'seller.approved'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const envelope = JSON.parse(message.value!.toString());
        const payload = envelope.payload ?? envelope;
        const db = mongoose.connection.db;
        if (!db) return;

        if (topic === 'payment.success') {
          // Platform takes 10% commission; queue 90% to seller pending balance
          const sellerAmount = Math.floor(payload.amount * 0.9);
          await db.collection('sellers').updateOne(
            { userId: payload.sellerId },
            { $inc: { 'balance.pending': sellerAmount }, $set: { updatedAt: new Date() } }
          );
          console.log(`💰 Queued payout NPR ${sellerAmount} for seller ${payload.sellerId}`);
        }

        if (topic === 'seller.approved') {
          console.log(`✅ Seller ${payload.sellerId} approved`);
        }
      } catch (err: any) {
        console.error(`[seller-consumer] Error on topic ${topic}:`, err.message);
      }
    },
  });

  console.log('✅ Seller consumers listening on: payment.success, seller.approved');
}

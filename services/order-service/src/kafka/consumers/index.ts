import { Kafka } from 'kafkajs';
import mongoose from 'mongoose';

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

export async function startOrderConsumers(): Promise<void> {
  const consumer = kafka.consumer({ groupId: 'order-service-group' });
  await consumer.connect();
  await consumer.subscribe({ topics: ['payment.success', 'payment.failed', 'delivery.completed'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const envelope = JSON.parse(message.value!.toString());
        const payload = envelope.payload ?? envelope;
        const db = mongoose.connection.db;
        if (!db) return;

        if (topic === 'payment.success') {
          await db.collection('orders').updateOne(
            { _id: new mongoose.Types.ObjectId(payload.orderId) },
            {
              $set: { status: 'CONFIRMED', updatedAt: new Date() },
              $push: { statusHistory: { status: 'CONFIRMED', note: 'Payment confirmed', timestamp: new Date() } as any },
            }
          );
          console.log(`✅ Order ${payload.orderId} confirmed after payment`);
        }

        if (topic === 'payment.failed') {
          await db.collection('orders').updateOne(
            { _id: new mongoose.Types.ObjectId(payload.orderId) },
            {
              $set: { status: 'CANCELLED', updatedAt: new Date() },
              $push: { statusHistory: { status: 'CANCELLED', note: `Payment failed: ${payload.reason}`, timestamp: new Date() } as any },
            }
          );
          console.log(`❌ Order ${payload.orderId} cancelled due to payment failure`);
        }

        if (topic === 'delivery.completed') {
          await db.collection('orders').updateOne(
            { _id: new mongoose.Types.ObjectId(payload.orderId) },
            {
              $set: { status: 'DELIVERED', updatedAt: new Date() },
              $push: { statusHistory: { status: 'DELIVERED', note: 'Delivered by agent', timestamp: new Date() } as any },
            }
          );
          console.log(`📦 Order ${payload.orderId} marked DELIVERED`);
        }
      } catch (err: any) {
        console.error(`[order-consumer] Error on topic ${topic}:`, err.message);
      }
    },
  });

  console.log('✅ Order consumers listening on: payment.success, payment.failed, delivery.completed');
}

import { Kafka } from 'kafkajs';
import mongoose from 'mongoose';

const kafka = new Kafka({
  clientId: 'delivery-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

export async function startDeliveryConsumers(): Promise<void> {
  const consumer = kafka.consumer({ groupId: 'delivery-service-group' });
  await consumer.connect();
  await consumer.subscribe({ topics: ['order.confirmed'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const envelope = JSON.parse(message.value!.toString());
        const payload = envelope.payload ?? envelope;
        const db = mongoose.connection.db;
        if (!db) return;

        if (topic === 'order.confirmed') {
          const existing = await db.collection('deliverytasks').findOne({ orderId: payload.orderId });
          if (!existing) {
            await db.collection('deliverytasks').insertOne({
              orderId: payload.orderId,
              buyerId: payload.userId,
              sellerId: payload.sellerId,
              status: 'PENDING',
              deliveryAddress: payload.deliveryAddress || null,
              pickupAddress: payload.pickupAddress || null,
              agentId: null,
              agentName: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            console.log(`🚚 Delivery task created for order ${payload.orderId}`);
          }
        }
      } catch (err: any) {
        console.error(`[delivery-consumer] Error on topic ${topic}:`, err.message);
      }
    },
  });

  console.log('✅ Delivery consumers listening on: order.confirmed');
}

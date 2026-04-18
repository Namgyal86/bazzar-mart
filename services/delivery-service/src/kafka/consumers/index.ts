import { Kafka } from 'kafkajs';
import mongoose from 'mongoose';
import { createDeliveryModel } from '../../models/delivery.model';

const KATHMANDU_VALLEY = ['kathmandu', 'lalitpur', 'bhaktapur', 'patan', 'kirtipur', 'thimi'];

function isWithinDeliveryZone(address: string): boolean {
  const lower = address.toLowerCase();
  return KATHMANDU_VALLEY.some(zone => lower.includes(zone));
}

const kafka = new Kafka({
  clientId: 'delivery-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

export async function startDeliveryConsumers(): Promise<void> {
  const consumer = kafka.consumer({ groupId: 'delivery-service-group' });
  await consumer.connect();
  await consumer.subscribe({ topics: ['order.confirmed'], fromBeginning: false });

  // Use the Delivery model for persistent storage (FEAT-08)
  const Delivery = createDeliveryModel(mongoose.connection);

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const envelope = JSON.parse(message.value!.toString());
        const payload = envelope.payload ?? envelope;

        if (topic === 'order.confirmed') {
          const orderId = payload.orderId;
          if (!orderId) return;

          const address = payload.deliveryAddress ?? payload.address ?? '';
          if (address && !isWithinDeliveryZone(address)) {
            console.warn(`[delivery-consumer] Order ${orderId} address "${address}" is outside Kathmandu Valley — skipping delivery creation`);
            return;
          }

          // Idempotent upsert — $setOnInsert ensures we never overwrite an already-assigned delivery
          await Delivery.findOneAndUpdate(
            { orderId },
            {
              $setOnInsert: {
                orderId,
                customer: payload.customer ?? 'Customer',
                address:  payload.deliveryAddress ?? payload.address ?? '',
                phone:    payload.phone ?? '',
                status:   'PENDING',
                driver:   null,
                driverId: null,
                total:    payload.total ?? 0,
                buyerId:  payload.userId ?? payload.buyerId ?? '',
              },
            },
            { upsert: true, new: true },
          );
          console.log(`Delivery record upserted for order ${orderId}`);
        }
      } catch (err: any) {
        console.error(`[delivery-consumer] Error on topic ${topic}:`, err.message);
      }
    },
  });

  console.log('Delivery consumers listening on: order.confirmed');
}

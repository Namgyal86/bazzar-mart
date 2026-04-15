/**
 * Aggregated Kafka consumers for the monolith.
 *
 * Now that user-service is merged, user.registered is emitted in-process by
 * auth.controller.ts — no Kafka consumer needed for that topic.
 *
 * Only one external event remains to consume:
 *   delivery.completed  (delivery-service) → internalBus DELIVERY_COMPLETED → orders module
 */
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { env } from '../../config/env';
import { internalBus, EVENTS } from '../../shared/events/emitter';

let consumer: Consumer | null = null;

export async function startConsumers(): Promise<void> {
  const kafka = new Kafka({
    clientId: `${env.KAFKA_CLIENT_ID}-consumer`,
    brokers:  env.KAFKA_BROKERS.split(','),
    retry: { retries: 1 },
  });

  consumer = kafka.consumer({ groupId: env.KAFKA_GROUP_ID });
  await consumer.connect();
  await consumer.subscribe({ topics: ['delivery.completed'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }: EachMessagePayload) => {
      if (!message.value) return;
      try {
        const payload = JSON.parse(message.value.toString()) as Record<string, unknown>;
        if (topic === 'delivery.completed') {
          internalBus.emit(EVENTS.DELIVERY_COMPLETED, {
            orderId:    String(payload.orderId    ?? ''),
            deliveryId: String(payload.deliveryId ?? ''),
          });
        }
      } catch (err) {
        console.error(`[kafka] consumer error on topic "${topic}":`, err);
      }
    },
  });

  console.log('✅ Kafka consumers running (delivery.completed)');
}

export async function stopConsumers(): Promise<void> {
  await consumer?.disconnect();
}

/**
 * Single Kafka producer for the entire monolith.
 * All modules import `publishEvent` — they do NOT create their own Kafka clients.
 *
 * Topics still published to Kafka (for kept microservices):
 *  • order.created       → analytics-service, recommendation-service
 *  • payment.success     → analytics-service, notification-service
 *  • payment.failed      → notification-service
 *  • payment.refunded    → notification-service
 *  • review.posted       → recommendation-service
 *  • cart.updated        → (future: recommendation)
 *  • cart.cleared        → (future: recommendation)
 *  • order.status_updated → notification-service
 *  • seller.approved     → notification-service
 *  • referral.rewarded   → notification-service
 */
import { Kafka, Producer, Partitioners } from 'kafkajs';
import { env } from '../config/env';

let producer: Producer | null = null;

function getKafka(): Kafka {
  return new Kafka({
    clientId: env.KAFKA_CLIENT_ID,
    brokers:  env.KAFKA_BROKERS.split(','),
  });
}

export async function connectProducer(): Promise<void> {
  const kafka = getKafka();
  producer = kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });
  await producer.connect();
  console.log('✅ Kafka producer connected');
}

export async function publishEvent(topic: string, payload: Record<string, unknown>): Promise<void> {
  if (!producer) {
    console.warn(`[kafka] producer not ready — dropping event on topic "${topic}"`);
    return;
  }
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify({ ...payload, _ts: new Date().toISOString() }) }],
    });
  } catch (err) {
    console.error(`[kafka] failed to publish to "${topic}":`, err);
  }
}

export async function disconnectProducer(): Promise<void> {
  await producer?.disconnect();
}

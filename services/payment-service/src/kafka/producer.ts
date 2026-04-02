import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

const kafka = new Kafka({
  clientId: 'payment-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

let producer: Producer | null = null;

export async function getPaymentProducer(): Promise<Producer> {
  if (producer) return producer;
  producer = kafka.producer();
  await producer.connect();
  return producer;
}

export async function publishPaymentEvent(
  topic: 'payment.success' | 'payment.failed' | 'payment.refunded',
  payload: unknown,
): Promise<void> {
  const p = await getPaymentProducer();
  await p.send({
    topic,
    messages: [{
      key: uuidv4(),
      value: JSON.stringify({ eventId: uuidv4(), eventType: topic, timestamp: new Date().toISOString(), payload }),
    }],
  });
}

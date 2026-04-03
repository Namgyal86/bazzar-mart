import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

const kafka = new Kafka({
  clientId: 'cart-service',
  brokers: env.KAFKA_BROKERS.split(','),
});

let producer: Producer | null = null;

export async function getCartProducer(): Promise<Producer> {
  if (producer) return producer;
  producer = kafka.producer();
  await producer.connect();
  return producer;
}

export async function publishCartEvent(eventType: string, payload: unknown): Promise<void> {
  const p = await getCartProducer();
  await p.send({
    topic: 'cart.updated',
    messages: [{
      key: uuidv4(),
      value: JSON.stringify({ eventId: uuidv4(), eventType, timestamp: new Date().toISOString(), payload }),
    }],
  });
}

import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

const kafka = new Kafka({
  clientId: 'order-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

let producer: Producer | null = null;

export async function getOrderProducer(): Promise<Producer> {
  if (producer) return producer;
  producer = kafka.producer();
  await producer.connect();
  return producer;
}

export async function publishOrderEvent(topic: string, eventType: string, payload: unknown): Promise<void> {
  const p = await getOrderProducer();
  await p.send({
    topic,
    messages: [{
      key: uuidv4(),
      value: JSON.stringify({ eventId: uuidv4(), eventType, timestamp: new Date().toISOString(), payload }),
    }],
  });
}

import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

const kafka = new Kafka({
  clientId: 'delivery-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

let producer: Producer | null = null;

export async function getDeliveryProducer(): Promise<Producer> {
  if (producer) return producer;
  producer = kafka.producer();
  await producer.connect();
  return producer;
}

export async function publishDeliveryEvent(topic: string, payload: unknown): Promise<void> {
  const p = await getDeliveryProducer();
  await p.send({
    topic,
    messages: [{
      key: uuidv4(),
      value: JSON.stringify({ eventId: uuidv4(), eventType: topic, timestamp: new Date().toISOString(), payload }),
    }],
  });
}

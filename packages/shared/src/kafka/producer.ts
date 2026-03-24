import { Kafka, Producer, ProducerRecord } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { KafkaEventEnvelope, KafkaTopic } from '../types';

let producer: Producer | null = null;

export const getKafkaProducer = async (): Promise<Producer> => {
  if (producer) return producer;

  const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'bazzar-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  });

  producer = kafka.producer();
  await producer.connect();
  return producer;
};

export const publishEvent = async <T>(
  topic: KafkaTopic,
  eventType: string,
  payload: T,
): Promise<void> => {
  const p = await getKafkaProducer();

  const envelope: KafkaEventEnvelope<T> = {
    eventId: uuidv4(),
    eventType,
    timestamp: new Date().toISOString(),
    payload,
  };

  const record: ProducerRecord = {
    topic,
    messages: [
      {
        key: uuidv4(),
        value: JSON.stringify(envelope),
      },
    ],
  };

  await p.send(record);
};

export const disconnectProducer = async (): Promise<void> => {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
};

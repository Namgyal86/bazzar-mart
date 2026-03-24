import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { KafkaEventEnvelope } from '../types';

type TopicHandler = (envelope: KafkaEventEnvelope) => Promise<void>;

export const createKafkaConsumer = async (
  groupId: string,
  handlers: Record<string, TopicHandler>,
): Promise<Consumer> => {
  const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'bazzar-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  });

  const consumer = kafka.consumer({ groupId });
  await consumer.connect();

  const topics = Object.keys(handlers);
  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }

  await consumer.run({
    eachMessage: async ({ topic, message }: EachMessagePayload) => {
      if (!message.value) return;

      try {
        const envelope: KafkaEventEnvelope = JSON.parse(message.value.toString());
        const handler = handlers[topic];
        if (handler) {
          await handler(envelope);
        }
      } catch (err) {
        console.error(`[Kafka Consumer] Error processing message on topic ${topic}:`, err);
      }
    },
  });

  return consumer;
};

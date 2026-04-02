import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

const kafka = new Kafka({
  clientId: 'review-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

let producer: Producer | null = null;

async function getProducer(): Promise<Producer> {
  if (producer) return producer;
  producer = kafka.producer();
  await producer.connect();
  return producer;
}

export async function publishReviewPosted(payload: {
  reviewId: string;
  productId: string;
  userId: string;
  sellerId: string;
  rating: number;
}): Promise<void> {
  const p = await getProducer();
  await p.send({
    topic: 'review.posted',
    messages: [{
      key: payload.reviewId,
      value: JSON.stringify({ eventId: uuidv4(), eventType: 'review.posted', timestamp: new Date().toISOString(), payload }),
    }],
  });
}

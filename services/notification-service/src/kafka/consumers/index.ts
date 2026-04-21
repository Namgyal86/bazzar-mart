import { Kafka } from 'kafkajs';
import { Notification } from '../../models/notification.model';

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const consumer = kafka.consumer({ groupId: 'notification-service-group' });

type TopicHandler = (payload: any) => Promise<void>;

const topicHandlers: Record<string, TopicHandler> = {
  'user.registered': async (payload) => {
    await Notification.create({
      userId: payload.userId,
      title: 'Welcome to Bazzar!',
      message: `Hi ${payload.firstName}, your account is ready.`,
      type: 'SYSTEM',
    });
  },

  'order.created': async (payload) => {
    await Notification.create({
      userId: payload.userId,
      title: 'Order Placed',
      message: `Your order #${payload.orderId} has been placed successfully.`,
      type: 'ORDER',
      data: payload,
    });
  },

  'order.status_changed': async (payload) => {
    await Notification.create({
      userId: payload.userId,
      title: 'Order Updated',
      message: `Your order status changed to ${payload.newStatus}.`,
      type: 'ORDER',
      data: payload,
    });
  },

  'order.status_updated': async (payload) => {
    const titleMap: Record<string, string> = {
      CONFIRMED:        'Order Confirmed',
      SHIPPED:          'Order Shipped',
      OUT_FOR_DELIVERY: 'Out for Delivery',
      DELIVERED:        'Order Delivered',
      CANCELLED:        'Order Cancelled',
      RETURN_REQUESTED: 'Return Requested',
      PENDING:          'Order Placed',
    };
    await Notification.create({
      userId:  payload.userId,
      title:   titleMap[payload.status] ?? 'Order Update',
      message: payload.message ?? `Your order status is now ${payload.status}.`,
      type:    'ORDER',
      data:    payload,
    });
  },

  'order.cancelled': async (payload) => {
    await Notification.create({
      userId: payload.userId,
      title: 'Order Cancelled',
      message: `Order #${payload.orderId} has been cancelled.`,
      type: 'ORDER',
      data: payload,
    });
  },

  'payment.success': async (payload) => {
    await Notification.create({
      userId: payload.userId,
      title: 'Payment Successful',
      message: `Payment of NPR ${payload.amount} for order #${payload.orderId} received.`,
      type: 'PAYMENT',
      data: payload,
    });
  },

  'payment.failed': async (payload) => {
    await Notification.create({
      userId: payload.userId,
      title: 'Payment Failed',
      message: `Payment for order #${payload.orderId} failed. Reason: ${payload.reason}`,
      type: 'PAYMENT',
      data: payload,
    });
  },

  'delivery.assigned': async (payload) => {
    await Notification.create({
      userId: payload.buyerId,
      title: 'Delivery Assigned',
      message: `${payload.agentName} is picking up your order. Phone: ${payload.agentPhone}`,
      type: 'DELIVERY',
      data: payload,
    });
  },

  'delivery.completed': async (payload) => {
    await Notification.create({
      userId: payload.buyerId,
      title: 'Order Delivered',
      message: `Your order has been delivered successfully!`,
      type: 'DELIVERY',
      data: payload,
    });
  },

  'referral.reward_issued': async (payload) => {
    await Notification.create({
      userId: payload.referrerId,
      title: 'Referral Reward',
      message: `You earned NPR ${payload.referrerAmount} referral credit!`,
      type: 'PROMO',
      data: payload,
    });
  },

  'seller.approved': async (payload) => {
    await Notification.create({
      userId: payload.userId,
      title: 'Seller Account Approved',
      message: `Congratulations! Your seller account for ${payload.businessName} is approved.`,
      type: 'SYSTEM',
      data: payload,
    });
  },
};

const topics = Object.keys(topicHandlers);

export async function startNotificationConsumers(): Promise<void> {
  await consumer.connect();
  console.log('✅ Kafka consumer connected (notification-service)');

  await consumer.subscribe({ topics, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const envelope = JSON.parse(message.value!.toString());
        const payload = envelope.payload ?? envelope;

        const handler = topicHandlers[topic];
        if (handler) {
          await handler(payload);
        } else {
          console.warn(`[Kafka] No handler registered for topic: ${topic}`);
        }
      } catch (err: any) {
        console.error(
          `[Kafka] Error processing message from topic "${topic}" (partition ${partition}):`,
          err.message,
        );
      }
    },
  });

  console.log(`✅ Notification consumers listening on topics: ${topics.join(', ')}`);
}

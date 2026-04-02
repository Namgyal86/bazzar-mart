import { Kafka } from 'kafkajs';
import mongoose from 'mongoose';

const kafka = new Kafka({
  clientId: 'referral-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const REFERRER_REWARD_NPR = 100;
const REFEREE_REWARD_NPR = 50;

export async function startReferralConsumers(): Promise<void> {
  const consumer = kafka.consumer({ groupId: 'referral-service-group' });
  await consumer.connect();
  await consumer.subscribe({ topics: ['user.registered', 'order.created'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const envelope = JSON.parse(message.value!.toString());
        const payload = envelope.payload ?? envelope;
        const db = mongoose.connection.db;
        if (!db) return;

        if (topic === 'user.registered' && payload.referredBy) {
          const existing = await db.collection('referrals').findOne({ refereeId: payload.userId });
          if (!existing) {
            await db.collection('referrals').insertOne({
              referrerId: payload.referredBy,
              refereeId: payload.userId,
              refereeEmail: payload.email,
              status: 'PENDING',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            console.log(`🔗 Referral recorded: ${payload.referredBy} → ${payload.userId}`);
          }
        }

        if (topic === 'order.created') {
          // Check if this buyer was referred and their referral is still pending (first order)
          const referral = await db.collection('referrals').findOne({ refereeId: payload.userId, status: 'PENDING' });
          if (referral) {
            // Credit referrer wallet
            await db.collection('referralwallets').updateOne(
              { userId: referral.referrerId },
              {
                $inc: { balance: REFERRER_REWARD_NPR },
                $set: { updatedAt: new Date() },
                $setOnInsert: { userId: referral.referrerId, createdAt: new Date() },
              },
              { upsert: true }
            );
            // Credit referee wallet
            await db.collection('referralwallets').updateOne(
              { userId: payload.userId },
              {
                $inc: { balance: REFEREE_REWARD_NPR },
                $set: { updatedAt: new Date() },
                $setOnInsert: { userId: payload.userId, createdAt: new Date() },
              },
              { upsert: true }
            );
            // Mark referral rewarded
            await db.collection('referrals').updateOne(
              { _id: referral._id },
              { $set: { status: 'REWARDED', rewardedAt: new Date(), updatedAt: new Date() } }
            );
            console.log(`🎁 Referral rewards: NPR ${REFERRER_REWARD_NPR} → ${referral.referrerId}, NPR ${REFEREE_REWARD_NPR} → ${payload.userId}`);
          }
        }
      } catch (err: any) {
        console.error(`[referral-consumer] Error on topic ${topic}:`, err.message);
      }
    },
  });

  console.log('✅ Referral consumers listening on: user.registered, order.created');
}

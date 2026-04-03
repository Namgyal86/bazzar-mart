import 'dotenv/config';
import { env } from './config/env';
import app from './app';
import { getCartProducer } from './kafka/producer';

async function start() {
  try {
    await getCartProducer();
    console.log('✅ Kafka producer connected');
  } catch {
    console.warn('⚠️  Kafka unavailable — cart.updated events will not be published');
  }

  app.listen(env.PORT, () => {
    console.log(`🚀 Cart Service running on port ${env.PORT}`);
  });
}

start();

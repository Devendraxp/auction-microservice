import { Kafka } from 'kafkajs';

// Initialize Kafka client with advanced configuration
const kafka = new Kafka({
  clientId: 'auction-service',
  brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

// Create admin and producer instances
export const admin = kafka.admin();
export const producer = kafka.producer({
  allowAutoTopicCreation: false,
  transactionTimeout: 30000
});

// Helper function to produce messages
export async function produceMessage(topic, message) {
  try {
    await producer.send({
      topic,
      messages: [
        { 
          value: typeof message === 'string' ? message : JSON.stringify(message),
          timestamp: Date.now().toString()
        }
      ],
    });
    return true;
  } catch (error) {
    console.error(`Error producing message to ${topic}:`, error);
    return false;
  }
}

// Helper function for graceful shutdown
export async function disconnectKafka() {
  try {
    await producer.disconnect();
    console.log('Kafka producer disconnected');
    return true;
  } catch (error) {
    console.error('Error disconnecting from Kafka:', error);
    return false;
  }
}

// Register shutdown handlers
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing Kafka connections');
  await disconnectKafka();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing Kafka connections');
  await disconnectKafka();
  process.exit(0);
});

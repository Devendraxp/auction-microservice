import { Kafka } from 'kafkajs';

// Initialize Kafka client with advanced configuration
const kafka = new Kafka({
  clientId: 'bid-service',
  brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

// Create admin, producer and consumer instances
export const admin = kafka.admin();
export const producer = kafka.producer({
  allowAutoTopicCreation: false,
  transactionTimeout: 30000
});
export const consumer = kafka.consumer({ 
  groupId: 'bid-service-group',
  sessionTimeout: 30000
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
    console.log(`Kafka event produced: ${topic}`);
    return true;
  } catch (error) {
    console.error(`Error producing message to ${topic}:`, error);
    return false;
  }
}

// Helper function to initialize Kafka
export async function initializeKafka() {
  try {
    await admin.connect();
    console.log('Kafka admin connected');

    // Ensure topics exist
    const topicsToCreate = [
      { topic: 'bid.submitted', numPartitions: 3, replicationFactor: 1 },
      { topic: 'bid.updated', numPartitions: 3, replicationFactor: 1 },
    ];

    const created = await admin.createTopics({ topics: topicsToCreate });
    console.log(created
      ? '✅ Kafka topics created'
      : 'ℹ️ Kafka topics already exist');

    await admin.disconnect();

    // Connect producer for later use
    await producer.connect();
    console.log('Kafka producer connected');

    return true;
  } catch (error) {
    console.error('Failed to initialize Kafka:', error);
    return false;
  }
}

// Helper function for graceful shutdown
export async function disconnectKafka() {
  try {
    await producer.disconnect();
    console.log('Kafka producer disconnected');
    
    if (consumer) {
      await consumer.disconnect();
      console.log('Kafka consumer disconnected');
    }
    
    return true;
  } catch (error) {
    console.error('Error disconnecting from Kafka:', error);
    return false;
  }
}

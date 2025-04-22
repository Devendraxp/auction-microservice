import { Kafka } from 'kafkajs';
import logger from '../utils/logger.js';

// This is a singleton class that manages Kafka connections
class KafkaConsumer {
  constructor() {
    this.io = null;
    this.isRunning = false;
    this.topicSubscriptions = new Set(['bid.updated']);
    this.messageCounter = 0;
    this.lastLogTime = Date.now();
    this.messageRateInterval = 10000; // Log message rate every 10 seconds
    
    // Create Kafka client
    this.kafka = new Kafka({
      clientId: 'websocket-gateway',
      brokers: process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092'],
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });
    
    this.consumer = this.kafka.consumer({ 
      groupId: 'websocket-gateway-group',
      sessionTimeout: 30000
    });
  }

  // Set reference to the Socket.IO server instance
  setIoInstance(io) {
    this.io = io;
    return this;
  }

  // Connect to Kafka and subscribe to topics
  async connect() {
    try {
      await this.consumer.connect();
      logger.info('Connected to Kafka');
      
      // Subscribe to all topics in the subscription set
      const subscribePromises = Array.from(this.topicSubscriptions).map(topic => 
        this.consumer.subscribe({ topic, fromBeginning: false })
      );
      
      await Promise.all(subscribePromises);
      logger.info(`Subscribed to topics: ${Array.from(this.topicSubscriptions).join(', ')}`);
      
      return this;
    } catch (error) {
      logger.error({ error }, 'Failed to connect to Kafka');
      throw error;
    }
  }

  // Start consuming messages from subscribed topics
  async run() {
    if (this.isRunning) {
      logger.info('Consumer is already running');
      return this;
    }

    if (!this.io) {
      throw new Error('Socket.IO instance not set. Call setIoInstance() before run()');
    }

    try {
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            this.messageCounter++;
            const now = Date.now();
            
            // Log message rate periodically
            if (now - this.lastLogTime > this.messageRateInterval) {
              const messagesPerSecond = (this.messageCounter / (now - this.lastLogTime)) * 1000;
              logger.info(`Processing ${messagesPerSecond.toFixed(2)} messages per second`);
              this.messageCounter = 0;
              this.lastLogTime = now;
            }
            
            // Handle different topics
            if (topic === 'bid.updated') {
              await this.handleBidUpdated(message);
            } else {
              logger.warn(`Received message from unexpected topic: ${topic}`);
            }
          } catch (error) {
            logger.error({ error }, `Error processing Kafka message from topic ${topic}`);
          }
        },
      });
      
      this.isRunning = true;
      logger.info('Kafka consumer is now running');
      
      return this;
    } catch (error) {
      logger.error({ error }, 'Failed to start Kafka consumer');
      throw error;
    }
  }

  // Handle bid.updated messages
  async handleBidUpdated(message) {
    try {
      // Parse message value as JSON
      const bidData = JSON.parse(message.value.toString());
      const auctionId = bidData.auctionId;

      // Validate message content
      if (!auctionId) {
        logger.warn({ bidData }, 'Received bid data without auctionId');
        return;
      }

      // Use more descriptive logging
      logger.info(
        { 
          auctionId, 
          bidAmount: bidData.amount, 
          bidder: bidData.username,
          timestamp: new Date().toISOString()
        }, 
        `Broadcasting bid update: ${bidData.username} bid $${bidData.amount} on auction ${auctionId}`
      );
      
      // Build the room ID with proper prefix
      const roomId = `auction:${auctionId}`;
      
      // Check for room existence and connected clients
      const room = this.io.sockets.adapter.rooms.get(roomId);
      const clientCount = room ? room.size : 0;
      
      // Log the broadcast attempt with client count information
      logger.debug(
        { auctionId, clientCount },
        `Broadcasting to ${clientCount} clients in room ${roomId}`
      );

      // Emit both event types for backward compatibility
      this.io.to(roomId).emit('bidUpdate', bidData);
      this.io.to(roomId).emit('bidUpdated', bidData);
      
      // Double-check for successful emission by logging a post-broadcast message
      logger.debug(
        { auctionId, bidAmount: bidData.amount, eventNames: ['bidUpdate', 'bidUpdated'] }, 
        'Bid update broadcast complete'
      );
    } catch (error) {
      logger.error({ error, rawMessage: message.value.toString() }, 'Error processing bid.updated message');
    }
  }

  // Gracefully disconnect from Kafka
  async disconnect() {
    try {
      await this.consumer.disconnect();
      this.isRunning = false;
      logger.info('Disconnected from Kafka');
    } catch (error) {
      logger.error({ error }, 'Error disconnecting from Kafka');
      throw error;
    }
  }
}

// Export singleton instance
export default new KafkaConsumer();
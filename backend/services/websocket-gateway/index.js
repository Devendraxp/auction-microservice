import http from 'http';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import webSocketServer from './websocket/server.js';
import kafkaConsumer from './kafka/consumer.js';

dotenv.config();

const PORT = process.env.PORT || 4000;

const httpServer = http.createServer();

const io = webSocketServer.initialize(httpServer);

const startServer = async () => {
  try {
    await kafkaConsumer
      .setIoInstance(io)
      .connect()
      .then(consumer => consumer.run());
    
    httpServer.listen(PORT, () => {
      logger.info(`WebSocket Gateway Server running on port ${PORT}`);
      logger.info('Ready to accept connections and relay bid updates!');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
};

startServer();
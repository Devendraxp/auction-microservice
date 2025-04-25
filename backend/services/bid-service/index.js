import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { initializeKafka } from './shared/kafka.js';
import { connectRedis } from './shared/redis.js';
import { startBatchProcessor } from './shared/batchProcessor.js';
import bidRoutes from './routes/bid.routes.js';
import { startCacheFlushInterval } from './shared/cacheFlusher.js';

const app = express();
const PORT = process.env.PORT || 3002;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/daa';

// Middleware
app.use(cors({
  origin: '*',  // Allow requests from any origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/', bidRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'bid-service' });
});

// Connect to MongoDB with retry logic
const connectWithRetry = () => {
  console.log('Attempting to connect to MongoDB...');
  mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
  })
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start the application after successful database connection
    app.listen(PORT, () => {
      console.log(`Bid service running on port ${PORT}`);
      
      // Connect to Redis
      connectRedis().then((success) => {
        if (success) {
          // Start the batch processor for pending bids
          startBatchProcessor();
          
          // Start the cache flush interval system
          startCacheFlushInterval();
        }
      });
      
      // Connect to Kafka
      initializeKafka().catch(err => {
        console.error('Failed to connect to Kafka:', err);
      });
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  });
};

// Start connection process
connectWithRetry();

// Handle graceful shutdown
const shutdown = async () => {
  console.log('Shutting down bid service...');
  // Close MongoDB connection
  await mongoose.connection.close();
  // Other cleanup...
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

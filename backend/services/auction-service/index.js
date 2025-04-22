import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import auctionRoutes from "./routes/auction.routes.js";
import { admin, producer, disconnectKafka } from './shared/kafka.js';
import { connectRedis, disconnectRedis } from './shared/redis.js';

const app = express();
app.use(express.json());

// Add CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Initialize Kafka topics
async function initKafka() {
  await admin.connect();

  const topicsToCreate = [
    { topic: 'auction.created', numPartitions: 3, replicationFactor: 1 },
    { topic: 'auction.updated', numPartitions: 3, replicationFactor: 1 },
    { topic: 'auction.deleted', numPartitions: 3, replicationFactor: 1 },
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
}

// mount routes
app.use("/", auctionRoutes);

// Graceful shutdown function
const gracefulShutdown = async () => {
  console.log('Initiating graceful shutdown...');
  
  // Disconnect from Redis
  await disconnectRedis();
  
  // Disconnect from Kafka
  await disconnectKafka();
  
  // Close MongoDB connection
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  
  process.exit(0);
};

// Connect to MongoDB and initialize Kafka before starting server
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auction-service')
  .then(() => {
    console.log("Auction Service DB connected successfully");
    
    // Connect to Redis
    return connectRedis();
  })
  .then(() => {
    // Initialize Kafka
    return initKafka();
  })
  .then(() => {
    const server = app.listen(process.env.PORT || 3002, () =>
      console.log(
        `Auction Service running on http://localhost:${
          process.env.PORT || 3002
        }`
      )
    );
    
    // Handle server shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received');
      server.close(() => gracefulShutdown());
    });
    
    process.on('SIGINT', () => {
      console.log('SIGINT received');
      server.close(() => gracefulShutdown());
    });
  })
  .catch(err => {
    console.error("⚠️ Initialization failed:", err);
    process.exit(1);
  });

import { getPendingBids, removePendingBids } from './redis.js';
import Bid from '../models/bid.model.js';
import mongoose from 'mongoose';

class BatchProcessor {
  constructor() {
    this.isRunning = false;
    this.processingInterval = null;
    this.batchSize = 100; // Process up to 100 bids at once
    this.intervalMs = 60000; // Run every 60 seconds by default (1 minute)
  }

  // Start the batch processor
  start(intervalMs = 60000) {
    if (this.isRunning) {
      console.log('Batch processor is already running');
      return;
    }

    this.intervalMs = intervalMs;
    this.isRunning = true;

    // Schedule the processing job
    this.processingInterval = setInterval(async () => {
      await this.processPendingBids();
    }, this.intervalMs);

    console.log(`Batch processor started. Will run every ${this.intervalMs / 1000} seconds.`);
  }

  // Stop the batch processor
  stop() {
    if (!this.isRunning) {
      return;
    }

    clearInterval(this.processingInterval);
    this.isRunning = false;
    console.log('Batch processor stopped');
  }

  // Process pending bids and save them to MongoDB
  async processPendingBids() {
    try {
      console.log('Starting batch processing of pending bids...');
      
      // Get pending bids from Redis
      const pendingBids = await getPendingBids(this.batchSize);
      
      if (pendingBids.length === 0) {
        console.log('No pending bids to process');
        return;
      }
      
      console.log(`Processing ${pendingBids.length} pending bids`);
      
      // Create a MongoDB session for transaction
      const session = await mongoose.startSession();
      
      try {
        // Start transaction
        session.startTransaction();
        
        // Insert all bids in one operation
        const insertOperations = pendingBids.map(bid => {
          // Make sure we don't duplicate _id
          const { _id, ...bidData } = bid;
          
          // Convert placedAt to a Date if it's a string
          if (typeof bidData.placedAt === 'string') {
            bidData.placedAt = new Date(bidData.placedAt);
          }
          
          return {
            insertOne: {
              document: bidData
            }
          };
        });
        
        // Execute the bulk write operation if there are any bids to insert
        if (insertOperations.length > 0) {
          await Bid.bulkWrite(insertOperations, { session });
        }
        
        // Remove the processed bids from Redis
        await removePendingBids(pendingBids.length);
        
        // Commit the transaction
        await session.commitTransaction();
        console.log(`Successfully saved ${pendingBids.length} bids to MongoDB`);
      } catch (error) {
        // Abort transaction on error
        await session.abortTransaction();
        console.error('Error in bid batch processing transaction:', error);
        throw error;
      } finally {
        // End the session
        session.endSession();
      }
    } catch (error) {
      console.error('Error processing pending bids:', error);
    }
  }
  
  // Manually trigger a processing cycle
  async triggerProcessing() {
    return this.processPendingBids();
  }
}

// Create a singleton instance
const batchProcessor = new BatchProcessor();

// Export the function to start the batch processor
export const startBatchProcessor = (intervalMs) => {
  return batchProcessor.start(intervalMs);
};

// Export the batch processor instance as default
export default batchProcessor;
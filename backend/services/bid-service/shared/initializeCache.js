// filepath: /home/dev/projects/daa/backend/services/bid-service/shared/initializeCache.js
import Bid from '../models/bid.model.js';
import { setHighestBid } from './redis.js';
import mongoose from 'mongoose';

/**
 * Loads all highest bids from the database and sets them in Redis
 * This is used to ensure cache consistency after server restart
 */
export async function initializeHighestBids() {
  try {
    console.log('Initializing highest bids cache from database...');
    
    // Find all unique auction IDs that have bids
    const auctionIds = await Bid.distinct('auctionId');
    
    console.log(`Found ${auctionIds.length} auctions with bids`);
    
    // For each auction ID, find the highest bid and cache it
    const promises = auctionIds.map(async (auctionId) => {
      try {
        // Find the highest bid for this auction
        const highestBid = await Bid.findOne({ auctionId })
          .sort({ amount: -1 })
          .limit(1);
        
        if (highestBid) {
          // Cache this highest bid in Redis
          await setHighestBid(auctionId, {
            id: highestBid._id.toString(),
            amount: highestBid.amount,
            username: highestBid.username,
            placedAt: highestBid.placedAt
          });
          
          console.log(`Set highest bid for auction ${auctionId}: $${highestBid.amount} by ${highestBid.username}`);
        }
      } catch (err) {
        console.error(`Error initializing highest bid for auction ${auctionId}:`, err);
      }
    });
    
    await Promise.all(promises);
    console.log('✅ Highest bids cache initialization complete');
    return true;
  } catch (error) {
    console.error('Error initializing highest bids cache:', error);
    return false;
  }
}

/**
 * Loads the most recent bids for each auction into Redis cache
 * This helps ensure recent bids are available even after server restart
 */
export async function initializeRecentBids() {
  try {
    console.log('Initializing recent bids cache from database...');
    
    // Find all unique auction IDs with recent bids (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const pipeline = [
      {
        $match: {
          placedAt: { $gte: oneDayAgo }
        }
      },
      {
        $group: {
          _id: "$auctionId"
        }
      }
    ];
    
    const recentAuctionIds = await Bid.aggregate(pipeline);
    console.log(`Found ${recentAuctionIds.length} auctions with recent bid activity`);
    
    // Implementation for loading recent bids can be added here
    // This is a placeholder for future implementation
    
    return true;
  } catch (error) {
    console.error('Error initializing recent bids cache:', error);
    return false;
  }
}

export default {
  initializeHighestBids,
  initializeRecentBids
};
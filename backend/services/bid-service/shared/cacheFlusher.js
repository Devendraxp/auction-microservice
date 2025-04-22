import Bid from "../models/bid.model.js";
import { 
  invalidateAuctionCache, 
  addBidToCache,
  setHighestBid
} from "./redis.js";

// Track which auctions have been processed
const processedAuctions = new Set();

/**
 * Periodic function to flush non-essential Redis cache and resync with database
 * - Flushes all auction bids caches
 * - Preserves the pending bids queue
 * - Resyncs auction data from the database
 */
export const startCacheFlushInterval = () => {
  console.log("Starting periodic cache flush mechanism");
  
  // Run every 2.5 minutes (150 seconds)
  const interval = 150 * 1000;
  
  const flushCache = async () => {
    try {
      // Get list of auctions that have been accessed/cached
      // In a real system we'd track this in Redis itself, 
      // but for simplicity we'll use the in-memory set
      const auctionsToProcess = [...processedAuctions];
      
      if (auctionsToProcess.length === 0) {
        console.log("No cached auctions to flush");
        return;
      }
      
      console.log(`Flushing cache for ${auctionsToProcess.length} auctions`);
      
      // Process each auction
      for (const auctionId of auctionsToProcess) {
        // Invalidate the auction cache
        await invalidateAuctionCache(auctionId);
        
        // Fetch fresh data from database
        const bids = await Bid.find({ auctionId })
          .sort({ amount: -1, placedAt: -1 })
          .limit(100);
          
        console.log(`Resyncing ${bids.length} bids for auction ${auctionId}`);
        
        // If we found bids, repopulate the cache
        if (bids.length > 0) {
          // Set highest bid
          const highestBid = bids[0];
          await setHighestBid(auctionId, {
            id: highestBid._id.toString(),
            amount: highestBid.amount,
            username: highestBid.username,
            placedAt: highestBid.placedAt
          });
          
          // Add all bids back to cache
          for (const bid of bids) {
            await addBidToCache(auctionId, {
              id: bid._id.toString(),
              auctionId: bid.auctionId,
              sessionId: bid.sessionId,
              username: bid.username,
              amount: bid.amount,
              placedAt: bid.placedAt
            });
          }
          
          console.log(`Successfully resynced cache for auction ${auctionId}`);
        }
      }
    } catch (error) {
      console.error("Error in cache flush process:", error);
    }
  };
  
  // Start the interval
  const intervalId = setInterval(flushCache, interval);
  
  // Return a function to stop the interval if needed
  return () => clearInterval(intervalId);
};

// Register an auction ID as being accessed/cached
export const trackAuctionAccess = (auctionId) => {
  if (auctionId) {
    processedAuctions.add(auctionId);
  }
};

export default {
  startCacheFlushInterval,
  trackAuctionAccess
};
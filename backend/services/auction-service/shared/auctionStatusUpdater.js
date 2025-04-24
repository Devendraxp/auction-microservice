// Automatic auction status updater
import Auction from "../models/auction.model.js";
import { produceMessage } from "./kafka.js";
import { invalidateAuctionCache, setAuctionInCache } from "./redis.js";

/**
 * Updates auction statuses based on their start and end times
 * - Changes 'scheduled' to 'active' when startTime is reached
 * - Changes 'active' to 'closed' when endTime is reached
 */
export const updateAuctionStatuses = async () => {
  try {
    const now = new Date();
    
    // Find scheduled auctions that should be active
    const activatingAuctions = await Auction.find({
      status: 'scheduled',
      startTime: { $lte: now }
    });
    
    // Find active auctions that should be closed
    const closingAuctions = await Auction.find({
      status: 'active',
      endTime: { $lte: now }
    });
    
    // Update activating auctions
    for (const auction of activatingAuctions) {
      console.log(`Activating auction: ${auction._id} - "${auction.title}"`);
      auction.status = 'active';
      await auction.save();
      
      // Update cache
      await invalidateAuctionCache(auction._id);
      await setAuctionInCache(auction);
      
      // Emit Kafka event for real-time updates
      await produceMessage('auction.status_updated', {
        auctionId: auction._id,
        title: auction.title,
        newStatus: 'active',
        timestamp: now
      });
    }
    
    // Update closing auctions
    for (const auction of closingAuctions) {
      console.log(`Closing auction: ${auction._id} - "${auction.title}"`);
      auction.status = 'closed';
      await auction.save();
      
      // Update cache
      await invalidateAuctionCache(auction._id);
      await setAuctionInCache(auction);
      
      // Emit Kafka event for real-time updates
      await produceMessage('auction.status_updated', {
        auctionId: auction._id,
        title: auction.title,
        newStatus: 'closed',
        timestamp: now
      });
    }
    
    const total = activatingAuctions.length + closingAuctions.length;
    if (total > 0) {
      console.log(`Updated status for ${total} auctions (${activatingAuctions.length} activated, ${closingAuctions.length} closed)`);
    }
    
    return { activated: activatingAuctions.length, closed: closingAuctions.length };
  } catch (error) {
    console.error('Error updating auction statuses:', error);
    return { error: error.message };
  }
};

/**
 * Initialize the auction status updater to run periodically
 * @param {number} intervalSeconds - How often to check for status updates (in seconds)
 */
export const initAuctionStatusUpdater = (intervalSeconds = 30) => {
  console.log(`Starting auction status updater (interval: ${intervalSeconds} seconds)`);
  
  // Run immediately on startup
  updateAuctionStatuses();
  
  // Then schedule periodic updates
  const interval = setInterval(updateAuctionStatuses, intervalSeconds * 1000);
  
  return interval;
};
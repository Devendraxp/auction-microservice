import { createClient } from 'redis';

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

client.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

export const connectRedis = async () => {
  try {
    await client.connect();
    console.log('Redis client connected');
    return true;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    return false;
  }
};

export const disconnectRedis = async () => {
  try {
    await client.disconnect();
    console.log('Redis client disconnected');
    return true;
  } catch (error) {
    console.error('Error disconnecting from Redis:', error);
    return false;
  }
};

// Helper functions for bid cache operations

// Get the highest bid for an auction
export const getHighestBid = async (auctionId) => {
  try {
    const key = `auction:${auctionId}:topBid`;
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Error getting highest bid for auction ${auctionId}:`, error);
    return null;
  }
};

// Check if a bid with same username and amount already exists
export const checkBidExistsInCache = async (auctionId, username, amount) => {
  try {
    const key = `auction:${auctionId}:bids`;
    const bids = await client.zRange(key, 0, -1, { REV: true });
    
    if (!bids || bids.length === 0) {
      return false;
    }
    
    // Parse JSON strings and check for matching bid
    for (const bidJson of bids) {
      const bid = JSON.parse(bidJson);
      if (bid.username === username && bid.amount === amount) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error(`Error checking if bid exists in cache for auction ${auctionId}:`, error);
    return false;
  }
};

// Cache a new highest bid
export const setHighestBid = async (auctionId, bid) => {
  try {
    const key = `auction:${auctionId}:topBid`;
    await client.set(key, JSON.stringify(bid));
    // Set an expiry of 24 hours for the cache
    await client.expire(key, 60 * 60 * 24);
    return true;
  } catch (error) {
    console.error(`Error setting highest bid for auction ${auctionId}:`, error);
    return false;
  }
};

// Add a bid to the list of bids for an auction (using sorted set with score as timestamp)
export const addBidToCache = async (auctionId, bid) => {
  try {
    const key = `auction:${auctionId}:bids`;
    const score = new Date(bid.placedAt).getTime(); // Use timestamp as score for sorting
    await client.zAdd(key, { score, value: JSON.stringify(bid) });
    
    // Set expiry on the auction bids collection (24 hours)
    await client.expire(key, 60 * 60 * 24);
    
    // Add bid to the list of pending bids to be saved to database
    await client.lPush('pending:bids', JSON.stringify(bid));
    
    return true;
  } catch (error) {
    console.error(`Error adding bid to cache for auction ${auctionId}:`, error);
    return false;
  }
};

// Get all bids for an auction from cache, sorted by timestamp (recent first)
export const getBidsFromCache = async (auctionId, limit = 100) => {
  try {
    const key = `auction:${auctionId}:bids`;
    // Use zRange with REV option instead of zRangeReversed which doesn't exist
    const results = await client.zRange(key, 0, limit - 1, { REV: true });
    
    if (!results || results.length === 0) {
      return [];
    }
    
    // Parse JSON strings back to objects
    return results.map(item => JSON.parse(item));
  } catch (error) {
    console.error(`Error getting bids from cache for auction ${auctionId}:`, error);
    return [];
  }
};

// Get bids pending database persistence (up to a limit)
export const getPendingBids = async (limit = 100) => {
  try {
    // Get bids from the pending list but don't remove them yet
    const bids = await client.lRange('pending:bids', 0, limit - 1);
    
    if (!bids || bids.length === 0) {
      return [];
    }
    
    return bids.map(item => JSON.parse(item));
  } catch (error) {
    console.error('Error getting pending bids:', error);
    return [];
  }
};

// Remove processed bids from the pending list
export const removePendingBids = async (count = 100) => {
  try {
    // Remove the specified number of items from the beginning of the list
    await client.lTrim('pending:bids', count, -1);
    return true;
  } catch (error) {
    console.error('Error removing pending bids:', error);
    return false;
  }
};

// Invalidate the cache for an auction
export const invalidateAuctionCache = async (auctionId) => {
  try {
    const topBidKey = `auction:${auctionId}:topBid`;
    const bidsKey = `auction:${auctionId}:bids`;
    
    await client.del(topBidKey);
    await client.del(bidsKey);
    
    return true;
  } catch (error) {
    console.error(`Error invalidating cache for auction ${auctionId}:`, error);
    return false;
  }
};

export default client;
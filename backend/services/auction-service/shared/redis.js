// filepath: /home/dev/projects/daa/backend/services/auction-service/shared/redis.js
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

// Auction cache operations

// Get auction details from cache
export const getAuctionFromCache = async (auctionId) => {
  try {
    const key = `auction:${auctionId}:details`;
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`Error getting auction details for auction ${auctionId} from cache:`, error);
    return null;
  }
};

// Cache auction details
export const setAuctionInCache = async (auction) => {
  try {
    if (!auction || !auction._id) {
      console.error('Cannot cache auction without an ID');
      return false;
    }
    
    const key = `auction:${auction._id}:details`;
    await client.set(key, JSON.stringify(auction));
    // Set an expiry of 24 hours for the cache
    await client.expire(key, 60 * 60 * 24);
    return true;
  } catch (error) {
    console.error(`Error setting auction details in cache for auction ${auction._id}:`, error);
    return false;
  }
};

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

// Invalidate auction cache when it's updated or deleted
export const invalidateAuctionCache = async (auctionId) => {
  try {
    const key = `auction:${auctionId}:details`;
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Error invalidating cache for auction ${auctionId}:`, error);
    return false;
  }
};

export default client;
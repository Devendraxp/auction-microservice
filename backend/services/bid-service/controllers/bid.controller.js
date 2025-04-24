import Bid from "../models/bid.model.js";
import { produceMessage } from "../shared/kafka.js";
import { 
  getHighestBid, 
  setHighestBid,
  addBidToCache,
  getBidsFromCache,
  checkBidExistsInCache
} from "../shared/redis.js";
import { trackAuctionAccess } from "../shared/cacheFlusher.js";

// Set to track recent bids to prevent duplicates
const recentBids = new Map();

// Helper to check for duplicate bids within a short time window
const isDuplicateBid = (auctionId, sessionId, amount) => {
  const key = `${auctionId}:${sessionId}:${amount}`;
  const now = Date.now();

  // Check if this exact bid exists and was made in the last 10 seconds
  if (recentBids.has(key)) {
    const timestamp = recentBids.get(key);
    if (now - timestamp < 10000) { // 10 seconds window
      return true;
    }
  }

  // Not a duplicate or expired, update the timestamp
  recentBids.set(key, now);

  // Cleanup old entries every so often
  if (recentBids.size > 1000) {
    for (const [key, timestamp] of recentBids.entries()) {
      if (now - timestamp > 60000) { // Remove entries older than 1 minute
        recentBids.delete(key);
      }
    }
  }

  return false;
};

const createBid = async (req, res) => {
  try {
    const { auctionId, amount, sessionId, username } = req.body;
    
    if (!auctionId || !amount || !sessionId || !username) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Track this auction for cache flushing
    trackAuctionAccess(auctionId);

    // Check if the amount is a valid number
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Bid amount must be a positive number' 
      });
    }

    // Check for duplicate bid within a short time window
    if (isDuplicateBid(auctionId, sessionId, amount)) {
      console.log(`Rejected duplicate bid: ${username} bid $${amount} on auction ${auctionId}`);
      return res.status(409).json({
        success: false,
        error: 'A similar bid was already placed. Please wait a moment and try again if needed.'
      });
    }
    
    // Check if this bid already exists in the Redis cache (more thorough check)
    const bidExists = await checkBidExistsInCache(auctionId, username, amount);
    if (bidExists) {
      console.log(`Rejected duplicate bid found in cache: ${username} bid $${amount} on auction ${auctionId}`);
      return res.status(409).json({
        success: false,
        error: 'You have already placed this exact bid amount. Please try a different amount.'
      });
    }

    // Check if the bid is higher than the current highest bid in cache
    const currentHighest = await getHighestBid(auctionId);
    if (currentHighest && amount <= currentHighest.amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Bid amount must be higher than the current highest bid',
        currentHighestBid: currentHighest.amount
      });
    }

    // Create new bid object with timestamp
    const now = new Date();
    const bid = {
      auctionId,
      sessionId,
      username,
      amount,
      placedAt: now,
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` // Temporary ID before MongoDB save
    };

    // Immediately add bid to Redis cache for instant access
    await addBidToCache(auctionId, bid);
    
    // If this is a new highest bid, update the highest bid cache immediately
    if (!currentHighest || amount > currentHighest.amount) {
      await setHighestBid(auctionId, {
        id: bid.id,
        amount: bid.amount,
        username: bid.username,
        placedAt: bid.placedAt
      });
    }

    // Emit Kafka event for real-time updates BEFORE database operation
    // This ensures other users see the bid immediately
    await produceMessage('bid.updated', bid);
    console.log(`Real-time bid update sent to Kafka: ${bid.username} bid $${bid.amount} on auction ${auctionId}`);

    // Return success response immediately
    res.status(201).json({ 
      success: true, 
      bid: bid,
      message: 'Bid registered successfully'
    });

    // After responding to user, save the bid to database asynchronously
    try {
      // Database will assign a permanent ID
      const newBid = new Bid({
        auctionId,
        sessionId,
        username,
        amount,
        placedAt: now
      });
      
      const savedBid = await newBid.save();
      console.log(`Bid saved to database: ${savedBid._id}`);
      
      // If desired, we could emit another Kafka event with the permanent ID
      // but it's not necessary for the frontend functionality
    } catch (saveErr) {
      console.error('Error saving bid to database (non-blocking):', saveErr);
      // This won't affect the user's experience since we already responded
    }
  } catch (err) {
    console.error('Error creating bid:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

/**
 * List all bids for an auction
 * GET /bids/:auctionId
 */
const listBids = async (req, res) => {
  try {
    const { auctionId } = req.params;
    const { limit = 100 } = req.query;
    const limitNum = parseInt(limit);
    
    // Track this auction for cache flushing
    trackAuctionAccess(auctionId);

    // Validate auctionId
    if (!auctionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Auction ID is required' 
      });
    }

    // First try to get bids from Redis cache
    let bids = await getBidsFromCache(auctionId, limitNum);
    let source = 'cache';
    
    // If no bids in cache, fallback to database
    if (bids.length === 0) {
      bids = await Bid.find({ auctionId })
        .sort({ amount: -1 })
        .limit(limitNum);
      source = 'database';
      
      // If we found bids in the database, cache them for future requests
      if (bids.length > 0) {
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
        console.log(`Cached ${bids.length} bids for auction ${auctionId} from database`);
      }
    }
    
    // Get highest bid
    const highestBid = await getHighestBid(auctionId) || (bids.length > 0 ? bids[0] : null);

    // Check if any bids exist
    if (bids.length === 0) {
      return res.status(200).json({ 
        success: true, 
        bids: [],
        message: 'No bids found for this auction',
        source
      });
    }

    return res.status(200).json({ 
      success: true, 
      bids,
      highestBid,
      source
    });
  } catch (err) {
    console.error(`Error listing bids for auction ${req.params.auctionId}:`, err);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

export { createBid, listBids };
import Auction from "../models/auction.model.js";
import { produceMessage } from "../shared/kafka.js";
import { 
  getAuctionFromCache, 
  setAuctionInCache, 
  invalidateAuctionCache 
} from "../shared/redis.js";

const createAuction = async (req, res) => {
  try {
    const { title, description, startTime, endTime, sessionId, username } = req.body;
    // Validate required fields
    if (!title || !startTime || !endTime || !sessionId || !username) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Build auction object
    const auction = new Auction({
      title,
      description,
      startTime,
      endTime,
      createdBy: { sessionId, username }
    });

    // Save to database
    const saved = await auction.save();
    
    // Cache the auction details in Redis
    await setAuctionInCache(saved);

    // Emit Kafka event
    await produceMessage('auction.created', saved);
    console.log('Kafka event produced: auction.created');

    return res.status(201).json({ success: true, auction: saved });
  } catch (err) {
    console.error('Error creating auction:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const listAuctions = async (req, res) => {
  try {
    const auctions = await Auction.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, auctions });
  } catch (err) {
    console.error('Error listing auctions:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const getAuction = async (req, res) => {
  try {
    const { id } = req.params;
    let auction;
    let source = 'database';
    
    // First try to get auction from Redis cache
    auction = await getAuctionFromCache(id);
    
    // If auction found in cache, use it
    if (auction) {
      source = 'cache';
      console.log(`Auction ${id} retrieved from cache`);
    } else {
      // Otherwise, get from database
      auction = await Auction.findById(id);
      if (!auction) {
        return res.status(404).json({ success: false, error: 'Auction not found' });
      }
      
      // Cache the auction details for future requests
      await setAuctionInCache(auction);
      console.log(`Auction ${id} cached in Redis`);
    }
    
    return res.status(200).json({ 
      success: true, 
      auction,
      source  // Include the source of the data (cache or database)
    });
  } catch (err) {
    console.error('Error fetching auction:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Update auction fields
 * PUT /auctions/:id
 */
const updateAuction = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Optionally prevent updating if auction has started
    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({ success: false, error: 'Auction not found' });
    }
    if (auction.status !== 'scheduled') {
      return res.status(400).json({ success: false, error: 'Cannot update an auction that is active or closed' });
    }

    // Apply updates
    Object.assign(auction, updates);
    const saved = await auction.save();
    
    // Invalidate the cache for this auction and update with new data
    await invalidateAuctionCache(id);
    await setAuctionInCache(saved);

    // Emit Kafka event
    await produceMessage('auction.updated', saved);
    console.log('Kafka event produced: auction.updated');

    return res.status(200).json({ success: true, auction: saved });
  } catch (err) {
    console.error('Error updating auction:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

/**
 * Delete an auction
 * DELETE /auctions/:id
 */
const deleteAuction = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Auction.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Auction not found' });
    }
    
    // Invalidate the cache for this auction
    await invalidateAuctionCache(id);
    
    // Emit Kafka event
    await produceMessage('auction.deleted', { id, auction: deleted });
    console.log('Kafka event produced: auction.deleted');

    return res.status(204).send();
  } catch (err) {
    console.error('Error deleting auction:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export { createAuction, listAuctions, getAuction, updateAuction, deleteAuction }
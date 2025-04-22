import mongoose from "mongoose";

const BidSchema = new mongoose.Schema({
  auctionId: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  placedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficiently querying bids by auction
BidSchema.index({ auctionId: 1, amount: -1 });

const Bid = mongoose.model("Bid", BidSchema);
export default Bid;
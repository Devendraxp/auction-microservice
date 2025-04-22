import mongoose from "mongoose";

const AuctionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  createdBy: {
    sessionId: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['scheduled','active','closed'],
    default: 'scheduled'
  },
},{
    timestamps: true
});

const Auction = mongoose.model("Auction", AuctionSchema);
export default Auction;

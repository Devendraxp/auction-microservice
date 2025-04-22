import express from "express";
const router = express.Router();
import { createBid, listBids } from "../controllers/bid.controller.js";

// Create bid ❱ POST /bids
router.post('/bids', createBid);

// List bids for an auction ❱ GET /bids/:auctionId
router.get('/bids/:auctionId', listBids);

export default router;
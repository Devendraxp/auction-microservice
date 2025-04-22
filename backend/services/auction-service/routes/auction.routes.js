import express from "express"
const router = express.Router();
import {createAuction, listAuctions, getAuction, updateAuction, deleteAuction} from "../controllers/auction.controller.js"

// Create ❱ POST /auctions
router.post('/auctions', createAuction);

// List All ❱ GET /auctions
router.get('/auctions', listAuctions);

// Get One ❱ GET /auctions/:id
router.get('/auctions/:id', getAuction);

// Update ❱ PUT /auctions/:id
router.put('/auctions/:id', updateAuction);

// Delete ❱ DELETE /auctions/:id
router.delete('/auctions/:id', deleteAuction);

export default router
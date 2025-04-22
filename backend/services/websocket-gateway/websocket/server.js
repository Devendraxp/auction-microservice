import { Server } from 'socket.io';
import logger from '../utils/logger.js';

// Track metrics for connections
const metrics = {
  totalConnections: 0,
  activeConnections: 0,
  connectionsByAuction: new Map(),
};

class WebSocketServer {
  constructor() {
    this.io = null;
    this.metricsInterval = null;
    this.connectedClients = new Map();
    this.auctionRooms = new Map(); // Track clients per auction room
  }

  // Initialize Socket.IO server
  initialize(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*',  // Allow connections from any origin
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,     // Increased timeout for better connection stability
      pingInterval: 25000,    // More frequent pings to keep connections alive
      transports: ['websocket', 'polling'],  // Try websocket first, fall back to polling
      allowEIO3: true,        // Allow backward compatibility with older clients
      path: '/socket.io',     // Explicit path setting
      connectTimeout: 45000   // Higher connect timeout
    });

    this.setupConnectionHandlers();
    this.startMetricsLogging();
    
    logger.info('WebSocket server initialized with configuration:', {
      cors: '*',
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling']
    });
    
    return this.io;
  }

  // Set up connection event handlers
  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      // Extract auctionId from query parameters
      const { auctionId } = socket.handshake.query;
      const clientIp = socket.request.connection.remoteAddress;
      
      if (!auctionId) {
        logger.warn('Client connected without auctionId, disconnecting', { 
          socketId: socket.id,
          ip: clientIp
        });
        socket.disconnect();
        return;
      }

      const roomId = `auction:${auctionId}`;
      
      // Update metrics
      metrics.totalConnections++;
      metrics.activeConnections++;
      
      if (!metrics.connectionsByAuction.has(auctionId)) {
        metrics.connectionsByAuction.set(auctionId, 0);
      }
      metrics.connectionsByAuction.set(
        auctionId, 
        metrics.connectionsByAuction.get(auctionId) + 1
      );

      // Join the auction room
      socket.join(roomId);
      
      // Track this client
      this.connectedClients.set(socket.id, { 
        auctionId, 
        socketId: socket.id,
        connectedAt: new Date(),
        ip: clientIp
      });
      
      // Update auction room tracking
      if (!this.auctionRooms.has(auctionId)) {
        this.auctionRooms.set(auctionId, new Set());
      }
      this.auctionRooms.get(auctionId).add(socket.id);

      logger.info({
        socketId: socket.id,
        auctionId,
        ip: socket.handshake.address
      }, 'Client connected and joined room');

      // Send confirmation to the client
      socket.emit('roomJoined', { 
        auctionId, 
        message: `You've joined the auction room for ${auctionId}` 
      });

      // Handle ping from client to keep connection alive
      socket.on('ping', () => {
        logger.debug({ socketId: socket.id }, 'Received ping from client, sending pong');
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Handle client joining specific room
      socket.on('joinAuction', (newAuctionId) => {
        if (!newAuctionId) return;
        
        // Leave current room if exists
        if (socket.auctionId) {
          const oldRoomId = `auction:${socket.auctionId}`;
          socket.leave(oldRoomId);
          
          // Update metrics for old auction
          const oldCount = metrics.connectionsByAuction.get(socket.auctionId) || 0;
          if (oldCount > 0) {
            metrics.connectionsByAuction.set(socket.auctionId, oldCount - 1);
          }
          
          logger.info({ socketId: socket.id, auctionId: socket.auctionId }, 'Client left auction room');
        }
        
        // Join new room
        const newRoomId = `auction:${newAuctionId}`;
        socket.join(newRoomId);
        socket.auctionId = newAuctionId;
        
        // Update metrics for new auction
        if (!metrics.connectionsByAuction.has(newAuctionId)) {
          metrics.connectionsByAuction.set(newAuctionId, 0);
        }
        metrics.connectionsByAuction.set(
          newAuctionId,
          metrics.connectionsByAuction.get(newAuctionId) + 1
        );
        
        logger.info({ socketId: socket.id, auctionId: newAuctionId }, 'Client joined auction room');
        
        // Send confirmation to client
        socket.emit('roomJoined', { 
          auctionId: newAuctionId, 
          message: `You've joined the auction room for ${newAuctionId}` 
        });
      });

      // Store auctionId in socket for reference
      socket.auctionId = auctionId;

      // Handle client disconnection
      socket.on('disconnect', () => {
        metrics.activeConnections--;
        
        if (socket.auctionId) {
          const count = metrics.connectionsByAuction.get(socket.auctionId) || 0;
          if (count > 0) {
            metrics.connectionsByAuction.set(socket.auctionId, count - 1);
          }
        }

        // Remove from tracking
        this.connectedClients.delete(socket.id);
        
        // Remove from auction room
        if (this.auctionRooms.has(auctionId)) {
          this.auctionRooms.get(auctionId).delete(socket.id);
          // Clean up empty rooms
          if (this.auctionRooms.get(auctionId).size === 0) {
            this.auctionRooms.delete(auctionId);
          }
        }
        
        logger.info({ socketId: socket.id, auctionId: socket.auctionId }, 'Client disconnected');
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error({ socketId: socket.id, error }, 'Socket error');
      });

      // Handle cooldown broadcasts
      socket.on('bidCooldown', (data) => {
        if (data && data.auctionId) {
          // Broadcast cooldown to all clients in the room except the sender
          socket.to(data.auctionId).emit('bidCooldownUpdate', data);
          logger.debug('Broadcast cooldown timer', { auctionId: data.auctionId, seconds: data.seconds });
        }
      });
    });
  }

  // Log metrics periodically
  startMetricsLogging() {
    this.metricsInterval = setInterval(() => {
      const auctionStats = [];
      
      // Convert Map to array of objects for better logging
      metrics.connectionsByAuction.forEach((count, auctionId) => {
        if (count > 0) {
          auctionStats.push({ auctionId, connections: count });
        }
      });
      
      logger.info({
        totalConnections: metrics.totalConnections,
        activeConnections: metrics.activeConnections,
        auctions: auctionStats
      }, 'WebSocket connection metrics');
    }, 60000); // Log every minute
  }
  
  // Stop metrics logging
  stopMetricsLogging() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }
  
  // Get Socket.IO server instance
  getIo() {
    return this.io;
  }

  // Broadcast a message to a specific auction room
  broadcastToAuction(auctionId, eventName, data) {
    if (!this.io) {
      logger.error('Cannot broadcast: Socket.IO server not initialized');
      return false;
    }

    const roomId = `auction:${auctionId}`;
    logger.debug({ auctionId, eventName }, `Broadcasting ${eventName} to room ${roomId}`);
    
    this.io.to(roomId).emit(eventName, data);
    return true;
  }

  // Method to emit a bid update to all clients in an auction room
  broadcastBidUpdate(bidData) {
    if (!bidData || !bidData.auctionId) {
      logger.error('Cannot broadcast bid update: Missing auction ID', { bidData });
      return false;
    }
    
    // IMPORTANT FIX: Use proper room ID format with auction: prefix
    const roomId = `auction:${bidData.auctionId}`;
    
    // Track how many clients this is sent to
    const roomSize = this.auctionRooms.has(bidData.auctionId) ? this.auctionRooms.get(bidData.auctionId).size : 0;
    
    // Broadcast to all clients in the room for this auction
    // IMPORTANT FIX: Use consistent event name 'bidUpdate' (to match frontend)
    this.io.to(roomId).emit('bidUpdate', bidData);
    
    // Also emit with the previous event name for backward compatibility
    this.io.to(roomId).emit('bidUpdated', bidData);
    
    logger.info('Broadcasting bid update', { 
      auctionId: bidData.auctionId,
      bidAmount: bidData.amount,
      bidder: bidData.username,
      recipientCount: roomSize,
      eventNames: ['bidUpdate', 'bidUpdated'] // Log both event names
    });
    
    return true;
  }

  // Method to emit updates to auction details to all clients in a room
  broadcastAuctionUpdate(auctionData) {
    if (!auctionData || !auctionData.id) {
      logger.error('Cannot broadcast auction update: Missing auction ID', { auctionData });
      return false;
    }
    
    const roomId = auctionData.id;
    
    // Broadcast to all clients in the room
    this.io.to(roomId).emit('auctionUpdated', auctionData);
    
    logger.info('Broadcasting auction update', { auctionId: auctionData.id });
    return true;
  }

  // Method to log connection metrics periodically
  logMetrics() {
    const totalConnections = this.connectedClients.size;
    
    // Summarize auction rooms
    const auctions = Array.from(this.auctionRooms.entries())
      .map(([auctionId, clients]) => ({ 
        auctionId, 
        connections: clients.size 
      }));
    
    logger.info('WebSocket connection metrics', { 
      totalConnections,
      activeConnections: totalConnections,  // Currently the same since we're removing disconnected clients
      auctions
    });
  }
}

export default new WebSocketServer();
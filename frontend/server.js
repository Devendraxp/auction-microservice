import { serve } from 'bun';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

const PORT = process.env.PORT || 80;
const DIST_FOLDER = join(import.meta.dir, 'dist');

// Helper function to read static files
const serveFile = (path, contentType) => {
  try {
    const filePath = join(DIST_FOLDER, path);
    
    if (existsSync(filePath)) {
      const fileContent = readFileSync(filePath);
      return new Response(fileContent, {
        headers: { 'Content-Type': contentType },
      });
    }
    
    // For client-side routing, serve index.html for non-file requests
    if (!path.includes('.')) {
      const indexContent = readFileSync(join(DIST_FOLDER, 'index.html'));
      return new Response(indexContent, {
        headers: { 'Content-Type': 'text/html' },
      });
    }
    
    return new Response('Not Found', { status: 404 });
  } catch (error) {
    console.error(`Error serving ${path}:`, error);
    return new Response('Server Error', { status: 500 });
  }
};

// Proxies for backend services
const proxyAuctions = (req) => {
  return fetch(`http://auction-service:3001${new URL(req.url).pathname.replace(/^\/auctions/, '')}`, {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });
};

const proxyBids = (req) => {
  return fetch(`http://bid-service:3002${new URL(req.url).pathname.replace(/^\/bids/, '')}`, {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });
};

console.log(`Starting server on port ${PORT}`);

// Main server handler
serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    
    // Health check endpoint
    if (path === '/health') {
      return new Response(JSON.stringify({
        status: 'UP',
        timestamp: new Date().toISOString(),
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // API routes for auction service
    if (path.startsWith('/auctions')) {
      return proxyAuctions(req);
    }
    
    // API routes for bid service
    if (path.startsWith('/bids')) {
      return proxyBids(req);
    }
    
    // WebSocket routing
    if (path.startsWith('/socket.io/')) {
      return fetch(`http://websocket-gateway:3003${path}`, {
        method: req.method,
        headers: req.headers,
        body: req.body,
        duplex: 'half',
      });
    }
    
    // Static file handling with content type mapping
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };
    
    const extension = path.match(/\.\w+$/)?.[0] || '';
    const contentType = contentTypes[extension] || 'text/plain';
    
    return serveFile(path.substring(1) || 'index.html', contentType);
  },
});

console.log(`Server running at http://localhost:${PORT}`);
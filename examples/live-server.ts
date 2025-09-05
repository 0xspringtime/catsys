import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { createCounterService } from './demo-service';

// Create service instance
const service = createCounterService();
let currentState = { count: 0 };

// Simple HTTP server to serve demo.html and handle API requests
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    if (req.url === '/') {
      fs.readFile(path.join(__dirname, 'demo.html'), (err, content) => {
        if (err) {
          res.writeHead(500);
          res.end('Error loading demo.html');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      });
    } 
    else if (req.url === '/api/increment' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const { amount } = JSON.parse(body);
          currentState = await service.handle(currentState, {
            kind: 'Increment',
            amount: Number(amount)
          });
          const view = await service.query(currentState);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ state: currentState, view }));
        } catch (error) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }));
        }
      });
    }
    else if (req.url === '/api/health' && req.method === 'GET') {
      const health = await service.healthCheck();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health));
    }
    else {
      res.writeHead(404);
      res.end('Not found');
    }
  } catch (error) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Demo server running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop\n');
});
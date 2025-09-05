const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple HTTP server to serve demo.html
const server = http.createServer((req, res) => {
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
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Demo server running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop\n');
});
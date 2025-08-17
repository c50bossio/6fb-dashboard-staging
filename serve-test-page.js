#!/usr/bin/env node

/**
 * Simple HTTP server to serve the test page (avoids CORS issues)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/test') {
    // Serve the test HTML page
    const htmlPath = path.join(__dirname, 'test-payment-complete.html');
    fs.readFile(htmlPath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading test page');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Payment Test Server Running!`);
  console.log(`================================\n`);
  console.log(`📍 Test page available at:`);
  console.log(`   http://localhost:${PORT}\n`);
  console.log(`✅ This avoids CORS issues by serving from HTTP\n`);
  console.log(`Press Ctrl+C to stop the server\n`);
  
  // Auto-open in browser
  const { exec } = require('child_process');
  exec(`open http://localhost:${PORT}`);
});
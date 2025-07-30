#!/usr/bin/env python3
import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

class SimpleHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        if self.path == '/health':
            response = {"status": "healthy", "service": "railway-test"}
        else:
            response = {"message": "Railway backend is working!", "path": self.path}
            
        self.wfile.write(json.dumps(response).encode())

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    server = HTTPServer(('0.0.0.0', port), SimpleHandler)
    print(f"Server starting on port {port}")
    server.serve_forever()
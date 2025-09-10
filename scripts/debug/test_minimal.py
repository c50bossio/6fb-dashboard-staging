#!/usr/bin/env python3
"""
Absolute minimal test server - no dependencies
"""
import http.server
import socketserver
import os
import json

PORT = int(os.getenv("PORT", 8000))

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/":
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            response = {
                "message": "6FB AI Agent System Backend",
                "status": "running",
                "version": "minimal",
                "port": PORT
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()

print(f"Starting minimal server on port {PORT}...")
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    httpd.serve_forever()
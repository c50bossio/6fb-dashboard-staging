#!/usr/bin/env python3
"""
Ultra-simple HTTP server for Render - no dependencies issues
"""
import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime

class APIHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        """Handle GET requests"""
        parsed_path = urlparse(self.path)
        
        # Route handlers
        if parsed_path.path == "/":
            self.send_json_response({
                "message": "6FB AI Agent System Backend",
                "status": "running", 
                "version": "1.0.4",
                "environment": os.getenv("ENVIRONMENT", "production"),
                "port": os.getenv("PORT", "8000")
            })
        elif parsed_path.path == "/health":
            self.send_json_response({"status": "healthy", "service": "6fb-ai-backend"})
        elif parsed_path.path == "/api/v1/agents":
            self.send_json_response([
                {"id": "business_coach", "name": "Business Coach", "status": "active"},
                {"id": "marketing_expert", "name": "Marketing Expert", "status": "active"},
                {"id": "financial_advisor", "name": "Financial Advisor", "status": "active"}
            ])
        elif parsed_path.path == "/debug":
            self.send_json_response({
                "environment": os.getenv("ENVIRONMENT", "production"),
                "port": os.getenv("PORT", "8000"),
                "timestamp": datetime.now().isoformat()
            })
        else:
            self.send_error(404, "Not Found")

    def do_POST(self):
        """Handle POST requests"""
        parsed_path = urlparse(self.path)
        
        # Read request body
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            data = {}
        
        # Route handlers
        if parsed_path.path in ["/api/v1/ai-agents/chat", "/api/v1/agentic-coach/chat"]:
            message = data.get("message", "")
            agent_id = data.get("agent_id", "business_coach")
            
            self.send_json_response({
                "agent_id": agent_id,
                "response": f"AI response to: {message}",
                "suggestions": ["Try this", "Consider that"],
                "timestamp": datetime.now().isoformat()
            })
        else:
            self.send_error(404, "Not Found")

    def send_json_response(self, data):
        """Send JSON response with CORS headers"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        """Override to use print for Render logs"""
        print(f"{self.address_string()} - {format % args}")

def run_server():
    port = int(os.getenv("PORT", 8000))
    server_address = ('', port)
    
    print(f"🚀 6FB AI Agent System Backend Starting...")
    print(f"📍 Environment: {os.getenv('ENVIRONMENT', 'production')}")
    print(f"🌐 Port: {port}")
    
    httpd = HTTPServer(server_address, APIHandler)
    print(f"✅ Backend Ready! Server running on port {port}")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n⏹️  Shutting down server...")
        httpd.shutdown()

if __name__ == "__main__":
    run_server()
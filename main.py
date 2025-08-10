#!/usr/bin/env python3
"""
Backend entry point - automatically chooses FastAPI (Docker/dev) or simple HTTP (production)
"""
import json
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime

# Check if we're in Docker or development environment
DOCKER_ENV = os.path.exists('/.dockerenv') or os.getenv('DOCKER_ENVIRONMENT') == 'true'
DEV_MODE = os.getenv('NODE_ENV') == 'development' or os.getenv('PYTHONPATH') == '/app'

def should_use_fastapi():
    """Determine if we should use FastAPI instead of simple HTTP server"""
    return DOCKER_ENV or DEV_MODE or os.getenv('USE_FASTAPI', 'false').lower() == 'true'

def run_fastapi():
    """Launch FastAPI application using uvicorn"""
    print("🚀 Launching FastAPI backend for development/Docker environment...")
    
    try:
        import uvicorn
        
        port = int(os.getenv("PORT", 8000))
        print(f"✅ Starting FastAPI on port {port}")
        
        # Use string import to avoid import-time issues
        uvicorn.run(
            "fastapi_backend:app",
            host="0.0.0.0",
            port=port,
            reload=True,
            access_log=True,
            log_level="info"
        )
        return True
        
    except ImportError as e:
        print(f"❌ FastAPI dependencies not available: {e}")
        print("🔄 Falling back to simple HTTP server...")
        return False
    except Exception as e:
        print(f"❌ Failed to start FastAPI: {e}")
        print("🔄 Falling back to simple HTTP server...")
        return False

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
    # Auto-detect environment and choose appropriate backend
    if should_use_fastapi():
        print(f"🐳 Environment Detection:")
        print(f"   Docker: {DOCKER_ENV}")
        print(f"   Dev Mode: {DEV_MODE}")
        print(f"   PYTHONPATH: {os.getenv('PYTHONPATH', 'not set')}")
        print(f"   USE_FASTAPI: {os.getenv('USE_FASTAPI', 'not set')}")
        
        if not run_fastapi():
            print("🔄 FastAPI failed, starting simple HTTP server...")
            run_server()
    else:
        print("🌐 Production mode - using simple HTTP server")
        run_server()
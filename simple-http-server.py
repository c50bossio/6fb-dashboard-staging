#!/usr/bin/env python3
import os
import socketserver
from http.server import SimpleHTTPRequestHandler

class MyHTTPRequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'Railway backend is working!')

if __name__ == "__main__":
    PORT = int(os.environ.get('PORT', 8000))
    print(f"Server starting on port {PORT}")
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"Serving at port {PORT}")
        httpd.serve_forever()
#!/usr/bin/env python3
"""
Railway-specific startup script
Railway sets PORT as environment variable
"""
import os
import sys

def main():
    # Railway requires binding to 0.0.0.0:$PORT
    port = os.environ.get('PORT')
    if not port:
        print("ERROR: PORT environment variable not set by Railway")
        sys.exit(1)
    
    print(f"🚀 Starting 6FB AI Agent System on Railway")
    print(f"🔌 Port: {port}")
    print(f"🌍 Host: 0.0.0.0")
    print(f"📦 Environment: {os.environ.get('ENVIRONMENT', 'production')}")
    
    # Import and start FastAPI
    import uvicorn
    from fastapi import FastAPI
    
    # Import our app
    try:
        from fastapi_server import app
        print("✅ FastAPI app imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import FastAPI app: {e}")
        sys.exit(1)
    
    # Start the server
    uvicorn.run(
        "fastapi-server:app",
        host="0.0.0.0", 
        port=int(port),
        log_level="info"
    )

if __name__ == "__main__":
    main()
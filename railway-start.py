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
    
    # Start the server directly without importing
    # Use the hyphenated filename as Railway expects
    cmd = [
        "python3", "-m", "uvicorn",
        "fastapi-server:app",
        "--host", "0.0.0.0",
        "--port", port,
        "--log-level", "info"
    ]
    
    print(f"🚀 Executing: {' '.join(cmd)}")
    
    import subprocess
    subprocess.run(cmd)

if __name__ == "__main__":
    main()
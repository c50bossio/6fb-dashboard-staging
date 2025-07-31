#!/usr/bin/env python3
"""
Simple startup script for Render deployment
"""
import os
import sys
import subprocess

def main():
    port = os.getenv('PORT', '8000')
    print(f"Starting 6FB AI Agent System Backend on port {port}")
    print(f"Environment: {os.getenv('ENVIRONMENT', 'production')}")
    
    # Run uvicorn
    cmd = [
        sys.executable, '-m', 'uvicorn',
        'main:app',
        '--host', '0.0.0.0',
        '--port', port
    ]
    
    print(f"Running command: {' '.join(cmd)}")
    subprocess.run(cmd)

if __name__ == "__main__":
    main()
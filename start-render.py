#!/usr/bin/env python3
"""
Render deployment startup script - runs the simple HTTP server
"""
import os
import sys
import subprocess
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    try:
        port = os.getenv('PORT', '8000')
        logger.info(f"🚀 Starting 6FB AI Agent System Backend on port {port}")
        logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'production')}")
        logger.info(f"Python path: {sys.executable}")
        logger.info(f"Working directory: {os.getcwd()}")
        
        # Verify main_simple.py exists
        if not os.path.exists('main_simple.py'):
            logger.error("❌ main_simple.py not found in current directory")
            sys.exit(1)
            
        logger.info("✅ main_simple.py found, starting server...")
        
        # Run the simple HTTP server directly
        cmd = [sys.executable, 'main_simple.py']
        
        logger.info(f"Running command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=False)
        
        if result.returncode != 0:
            logger.error(f"❌ Server exited with code {result.returncode}")
            sys.exit(result.returncode)
            
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
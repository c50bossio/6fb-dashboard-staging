#!/usr/bin/env python3
"""
Render deployment startup script with error handling
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
        
        # Verify main.py exists
        if not os.path.exists('main.py'):
            logger.error("❌ main.py not found in current directory")
            sys.exit(1)
            
        # Check if we can import the app
        try:
            from main import app
            logger.info("✅ Successfully imported app from main.py")
        except Exception as e:
            logger.error(f"❌ Failed to import app from main.py: {e}")
            sys.exit(1)
        
        # Run uvicorn with error handling
        cmd = [
            sys.executable, '-m', 'uvicorn',
            'main:app',
            '--host', '0.0.0.0',
            '--port', str(port),
            '--log-level', 'info'
        ]
        
        logger.info(f"Running command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=False)
        
        if result.returncode != 0:
            logger.error(f"❌ uvicorn exited with code {result.returncode}")
            sys.exit(result.returncode)
            
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
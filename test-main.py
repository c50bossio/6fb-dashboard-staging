#!/usr/bin/env python3
"""
Minimal FastAPI application for Render deployment testing
This eliminates all dependencies except FastAPI and uvicorn
"""
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from fastapi import FastAPI
    logger.info("✅ FastAPI imported successfully")
except ImportError as e:
    logger.error(f"❌ FastAPI import failed: {e}")
    exit(1)

try:
    import uvicorn
    logger.info("✅ uvicorn imported successfully")
except ImportError as e:
    logger.error(f"❌ uvicorn import failed: {e}")
    exit(1)

# Create minimal FastAPI app
app = FastAPI(title="6FB AI Test Service")

@app.get("/")
def root():
    logger.info("Root endpoint accessed")
    return {
        "message": "6FB AI Test Service",
        "status": "working",
        "version": "1.0.0-test"
    }

@app.get("/health")
def health():
    logger.info("Health endpoint accessed")
    return {
        "status": "healthy",
        "service": "6fb-test"
    }

@app.get("/debug")
def debug():
    logger.info("Debug endpoint accessed")
    return {
        "port": os.getenv("PORT", "not set"),
        "environment": os.getenv("ENVIRONMENT", "not set"),
        "python": os.sys.version,
        "working_dir": os.getcwd()
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    logger.info(f"🚀 Starting test server on 0.0.0.0:{port}")
    
    try:
        uvicorn.run(
            app, 
            host="0.0.0.0", 
            port=port, 
            log_level="info"
        )
    except Exception as e:
        logger.error(f"❌ Server startup failed: {e}")
        exit(1)
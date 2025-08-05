#!/usr/bin/env python3
import asyncio
import logging
import signal
import sys
import os
from monitoring.alerts_config import get_monitoring_service

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/monitoring.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Global monitoring service
monitoring_service = None

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}, shutting down...")
    if monitoring_service:
        monitoring_service.stop()
    sys.exit(0)

async def main():
    global monitoring_service
    
    try:
        # Set up signal handlers
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        # Start monitoring service
        monitoring_service = get_monitoring_service()
        logger.info("6FB AI Agent System monitoring service starting...")
        
        await monitoring_service.start()
        
    except Exception as e:
        logger.error(f"Monitoring service failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())

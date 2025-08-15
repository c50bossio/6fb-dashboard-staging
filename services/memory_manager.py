#!/usr/bin/env python3
"""
Memory Management Service for 6FB AI Agent System
Addresses critical production issues causing authentication failures and system crashes under load
"""

import gc
import os
import psutil
import asyncio
import threading
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass
import time
from contextlib import contextmanager

logger = logging.getLogger(__name__)

@dataclass
class MemoryStats:
    """Memory usage statistics"""
    total_memory: float
    available_memory: float
    used_memory: float
    cpu_percent: float
    process_memory: float
    memory_pressure: float  # 0-1 scale

class MemoryManager:
    """
    Production-grade memory manager to fix critical authentication failures
    Production Readiness Report showed: "Complete failure under memory pressure" (0% success)
    """
    
    def __init__(self):
        self.process = psutil.Process()
        self.monitoring_active = False
        self.cleanup_thread = None
        self.last_cleanup = time.time()
        self.memory_threshold = 0.85  # Trigger cleanup at 85% memory usage
        self.critical_threshold = 0.95  # Emergency cleanup at 95%
        
        # OAuth callback memory tracking
        self.oauth_sessions = {}
        self.oauth_cleanup_interval = 300  # 5 minutes
        
        # Connection pool references for cleanup
        self.connection_pools = []
        
        logger.info("🧠 Memory Manager initialized for production stability")
    
    def get_memory_stats(self) -> MemoryStats:
        """Get current memory statistics"""
        try:
            # System memory
            memory = psutil.virtual_memory()
            
            # Process memory
            process_info = self.process.memory_info()
            
            # CPU usage
            cpu_percent = self.process.cpu_percent()
            
            # Calculate memory pressure (0-1 scale)
            memory_pressure = memory.percent / 100.0
            
            return MemoryStats(
                total_memory=memory.total / (1024**3),  # GB
                available_memory=memory.available / (1024**3),  # GB
                used_memory=memory.used / (1024**3),  # GB
                cpu_percent=cpu_percent,
                process_memory=process_info.rss / (1024**2),  # MB
                memory_pressure=memory_pressure
            )
        except Exception as e:
            logger.error(f"Error getting memory stats: {e}")
            return MemoryStats(0, 0, 0, 0, 0, 0)
    
    def is_memory_pressure(self) -> bool:
        """Check if system is under memory pressure"""
        stats = self.get_memory_stats()
        return stats.memory_pressure > self.memory_threshold
    
    def is_critical_memory_pressure(self) -> bool:
        """Check if system is under critical memory pressure"""
        stats = self.get_memory_stats()
        return stats.memory_pressure > self.critical_threshold
    
    def force_garbage_collection(self) -> int:
        """Force garbage collection and return objects collected"""
        logger.info("🗑️ Forcing garbage collection due to memory pressure")
        
        collected = 0
        for generation in range(gc.get_count()):
            collected += gc.collect(generation)
        
        # Also clear internal caches
        self.clear_internal_caches()
        
        logger.info(f"✅ Garbage collection completed, {collected} objects collected")
        return collected
    
    def clear_internal_caches(self):
        """Clear internal application caches"""
        try:
            # Clear OAuth session cache
            current_time = time.time()
            expired_sessions = []
            
            for session_id, session_data in self.oauth_sessions.items():
                if current_time - session_data.get('created_at', 0) > self.oauth_cleanup_interval:
                    expired_sessions.append(session_id)
            
            for session_id in expired_sessions:
                del self.oauth_sessions[session_id]
                logger.debug(f"Cleared expired OAuth session: {session_id}")
            
            logger.info(f"🧹 Cleared {len(expired_sessions)} expired OAuth sessions")
            
        except Exception as e:
            logger.error(f"Error clearing internal caches: {e}")
    
    def register_oauth_session(self, session_id: str, session_data: dict):
        """Register OAuth session for memory management"""
        self.oauth_sessions[session_id] = {
            **session_data,
            'created_at': time.time()
        }
        
        # Immediate cleanup if too many sessions
        if len(self.oauth_sessions) > 100:
            self.clear_internal_caches()
    
    def cleanup_oauth_session(self, session_id: str):
        """Clean up specific OAuth session"""
        if session_id in self.oauth_sessions:
            del self.oauth_sessions[session_id]
            logger.debug(f"Cleaned up OAuth session: {session_id}")
    
    def register_connection_pool(self, pool):
        """Register connection pool for memory cleanup"""
        self.connection_pools.append(pool)
    
    def cleanup_connection_pools(self):
        """Clean up connection pools under memory pressure"""
        for pool in self.connection_pools:
            try:
                if hasattr(pool, 'cleanup_idle_connections'):
                    pool.cleanup_idle_connections()
                elif hasattr(pool, 'clear_cache'):
                    pool.clear_cache()
            except Exception as e:
                logger.error(f"Error cleaning up connection pool: {e}")
    
    def emergency_cleanup(self):
        """Emergency cleanup when system is under critical memory pressure"""
        logger.warning("🚨 EMERGENCY: Critical memory pressure detected - performing emergency cleanup")
        
        try:
            # 1. Force garbage collection
            self.force_garbage_collection()
            
            # 2. Clear all internal caches
            self.clear_internal_caches()
            
            # 3. Clean up connection pools
            self.cleanup_connection_pools()
            
            # 4. Clear OAuth sessions aggressively
            self.oauth_sessions.clear()
            
            logger.warning("✅ Emergency cleanup completed")
            
        except Exception as e:
            logger.error(f"❌ Emergency cleanup failed: {e}")
    
    def start_monitoring(self):
        """Start background memory monitoring"""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        self.cleanup_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.cleanup_thread.start()
        logger.info("🎯 Memory monitoring started")
    
    def stop_monitoring(self):
        """Stop background memory monitoring"""
        self.monitoring_active = False
        if self.cleanup_thread:
            self.cleanup_thread.join(timeout=5)
        logger.info("⏹️ Memory monitoring stopped")
    
    def _monitoring_loop(self):
        """Background monitoring loop"""
        while self.monitoring_active:
            try:
                # Check memory pressure every 30 seconds
                stats = self.get_memory_stats()
                
                if stats.memory_pressure > self.critical_threshold:
                    logger.warning(f"🚨 CRITICAL memory pressure: {stats.memory_pressure:.1%}")
                    self.emergency_cleanup()
                elif stats.memory_pressure > self.memory_threshold:
                    logger.warning(f"⚠️ High memory pressure: {stats.memory_pressure:.1%}")
                    self.force_garbage_collection()
                
                # Regular cleanup every 5 minutes
                current_time = time.time()
                if current_time - self.last_cleanup > 300:  # 5 minutes
                    self.clear_internal_caches()
                    self.last_cleanup = current_time
                
                time.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Error in memory monitoring loop: {e}")
                time.sleep(60)  # Slower retry on error
    
    @contextmanager
    def memory_limited_operation(self, operation_name: str):
        """Context manager for memory-sensitive operations like OAuth"""
        logger.debug(f"🔒 Starting memory-limited operation: {operation_name}")
        
        # Check memory before starting
        if self.is_critical_memory_pressure():
            logger.warning(f"⚠️ High memory pressure before {operation_name}, performing cleanup")
            self.force_garbage_collection()
        
        start_memory = self.get_memory_stats().process_memory
        start_time = time.time()
        
        try:
            yield
        finally:
            # Cleanup after operation
            end_time = time.time()
            end_memory = self.get_memory_stats().process_memory
            
            memory_delta = end_memory - start_memory
            duration = end_time - start_time
            
            logger.debug(
                f"✅ {operation_name} completed: "
                f"Duration: {duration:.2f}s, "
                f"Memory change: {memory_delta:+.1f}MB"
            )
            
            # Force cleanup if operation used significant memory
            if memory_delta > 50:  # 50MB threshold
                logger.info(f"🧹 {operation_name} used {memory_delta:.1f}MB, cleaning up")
                self.force_garbage_collection()

# Global memory manager instance
memory_manager = MemoryManager()

# Start monitoring automatically
memory_manager.start_monitoring()

def get_memory_stats() -> MemoryStats:
    """Get current memory statistics"""
    return memory_manager.get_memory_stats()

def memory_limited_oauth_operation():
    """Context manager specifically for OAuth operations"""
    return memory_manager.memory_limited_operation("OAuth Authentication")

def register_oauth_session(session_id: str, session_data: dict):
    """Register OAuth session for memory management"""
    memory_manager.register_oauth_session(session_id, session_data)

def cleanup_oauth_session(session_id: str):
    """Clean up OAuth session"""
    memory_manager.cleanup_oauth_session(session_id)
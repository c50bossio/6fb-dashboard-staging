#!/usr/bin/env python3
"""
Enable Foreign Key Constraints for 6FB AI Agent System

This script safely enables foreign key constraints across all database files
and verifies that the connection pool configuration is properly enforcing them.
"""

import asyncio
import sqlite3
import logging
import sys
from pathlib import Path
from typing import List, Dict, Any
from database.optimized_database_manager import OptimizedDatabaseManager
from database.async_connection_pool import ConnectionPoolConfig, AsyncConnectionPool

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ForeignKeyManager:
    """Manages foreign key constraint enablement and verification"""
    
    def __init__(self):
        self.database_files = [
            "database/agent_system.db",
            "data/vector_knowledge.db", 
            "data/ai_insights.db"
        ]
        
    def check_foreign_key_status(self, db_path: str) -> bool:
        """Check if foreign keys are enabled in a database file"""
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("PRAGMA foreign_keys;")
            result = cursor.fetchone()
            conn.close()
            return bool(result[0]) if result else False
        except Exception as e:
            logger.error(f"Error checking foreign key status for {db_path}: {e}")
            return False
    
    def enable_foreign_keys_on_file(self, db_path: str) -> bool:
        """Enable foreign keys on a specific database file"""
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Enable foreign keys
            cursor.execute("PRAGMA foreign_keys = ON;")
            
            # Verify it's enabled
            cursor.execute("PRAGMA foreign_keys;")
            result = cursor.fetchone()
            is_enabled = bool(result[0]) if result else False
            
            if is_enabled:
                # Run integrity check
                cursor.execute("PRAGMA foreign_key_check;")
                violations = cursor.fetchall()
                
                if violations:
                    logger.error(f"Foreign key violations found in {db_path}: {violations}")
                    conn.close()
                    return False
                else:
                    logger.info(f"✅ Foreign keys enabled on {db_path} with no violations")
            
            conn.close()
            return is_enabled
            
        except Exception as e:
            logger.error(f"Error enabling foreign keys on {db_path}: {e}")
            return False
    
    async def test_connection_pool_foreign_keys(self) -> bool:
        """Test that the connection pool properly enables foreign keys"""
        try:
            # Create a temporary connection pool to test
            config = ConnectionPoolConfig(
                database_path="database/agent_system.db",
                max_connections=5,
                min_connections=1,
                enable_foreign_keys=True
            )
            
            pool = AsyncConnectionPool(config)
            await pool.initialize()
            
            # Test foreign key status in a new connection
            async with pool.get_connection() as conn:
                cursor = await conn.execute("PRAGMA foreign_keys;")
                result = await cursor.fetchone()
                fk_enabled = bool(result[0]) if result else False
                
                if fk_enabled:
                    logger.info("✅ Connection pool properly enables foreign keys")
                else:
                    logger.error("❌ Connection pool not enabling foreign keys")
                    
                await pool.close()
                return fk_enabled
                
        except Exception as e:
            logger.error(f"Error testing connection pool foreign keys: {e}")
            return False
    
    async def test_foreign_key_enforcement(self) -> bool:
        """Test that foreign key constraints are actually enforced"""
        try:
            # Use the optimized database manager
            manager = OptimizedDatabaseManager("database/agent_system.db")
            await manager.initialize()
            
            # Test 1: Try to insert an appointment with invalid barbershop_id
            test_query = """
                INSERT INTO appointments (id, barbershop_id, client_id, barber_id, service_id, scheduled_at, status) 
                VALUES ('test_fk_violation', 'invalid_barbershop_id', 'test_client', 'test_barber', 'test_service', datetime('now'), 'PENDING')
            """
            
            try:
                async with manager.pool.get_connection() as conn:
                    await conn.execute(test_query)
                    await conn.commit()
                    
                    # If we get here, foreign keys are NOT being enforced
                    logger.error("❌ Foreign key constraint violation was NOT caught - constraints are disabled")
                    
                    # Clean up the invalid record
                    await conn.execute("DELETE FROM appointments WHERE id = 'test_fk_violation'")
                    await conn.commit()
                    
                    await manager.close()
                    return False
                    
            except Exception as fk_error:
                # This is expected - foreign key violation should be caught
                logger.info(f"✅ Foreign key constraint properly enforced: {str(fk_error)[:100]}...")
                await manager.close()
                return True
                
        except Exception as e:
            logger.error(f"Error testing foreign key enforcement: {e}")
            return False
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Get statistics about the database files"""
        stats = {}
        
        for db_path in self.database_files:
            if Path(db_path).exists():
                try:
                    conn = sqlite3.connect(db_path)
                    cursor = conn.cursor()
                    
                    # Get table count
                    cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
                    table_count = cursor.fetchone()[0]
                    
                    # Get foreign key status
                    cursor.execute("PRAGMA foreign_keys;")
                    fk_status = cursor.fetchone()[0]
                    
                    # Get file size
                    file_size = Path(db_path).stat().st_size
                    
                    stats[db_path] = {
                        'exists': True,
                        'tables': table_count,
                        'foreign_keys_enabled': bool(fk_status),
                        'size_bytes': file_size,
                        'size_mb': round(file_size / 1024 / 1024, 2)
                    }
                    
                    conn.close()
                    
                except Exception as e:
                    stats[db_path] = {
                        'exists': True,
                        'error': str(e)
                    }
            else:
                stats[db_path] = {'exists': False}
        
        return stats

async def main():
    """Main function to enable and verify foreign key constraints"""
    logger.info("🚀 Starting Foreign Key Constraint Enablement Process")
    
    fk_manager = ForeignKeyManager()
    
    # Step 1: Check current status
    logger.info("\n📊 STEP 1: Checking Current Database Status")
    stats = fk_manager.get_database_stats()
    
    for db_path, info in stats.items():
        if info.get('exists'):
            if 'error' in info:
                logger.error(f"❌ {db_path}: {info['error']}")
            else:
                logger.info(f"📄 {db_path}: {info['tables']} tables, FK enabled: {info['foreign_keys_enabled']}, Size: {info['size_mb']}MB")
    
    # Step 2: Enable foreign keys on each database file
    logger.info("\n🔧 STEP 2: Enabling Foreign Keys on Database Files")
    enable_success = True
    
    for db_path in fk_manager.database_files:
        if Path(db_path).exists():
            success = fk_manager.enable_foreign_keys_on_file(db_path)
            if not success:
                enable_success = False
                logger.error(f"❌ Failed to enable foreign keys on {db_path}")
        else:
            logger.warning(f"⚠️  Database file not found: {db_path}")
    
    # Step 3: Test connection pool configuration
    logger.info("\n🏊 STEP 3: Testing Connection Pool Foreign Key Configuration")
    pool_test_success = await fk_manager.test_connection_pool_foreign_keys()
    
    # Step 4: Test foreign key enforcement
    logger.info("\n🧪 STEP 4: Testing Foreign Key Constraint Enforcement")
    enforcement_test_success = await fk_manager.test_foreign_key_enforcement()
    
    # Step 5: Final verification
    logger.info("\n✅ STEP 5: Final Verification")
    final_stats = fk_manager.get_database_stats()
    
    all_enabled = True
    for db_path, info in final_stats.items():
        if info.get('exists') and not info.get('error'):
            if info.get('foreign_keys_enabled'):
                logger.info(f"✅ {db_path}: Foreign keys ENABLED")
            else:
                logger.error(f"❌ {db_path}: Foreign keys DISABLED")
                all_enabled = False
    
    # Summary
    logger.info("\n🎯 SUMMARY:")
    logger.info(f"Database File FK Enable: {'✅ SUCCESS' if enable_success else '❌ FAILED'}")
    logger.info(f"Connection Pool Config: {'✅ SUCCESS' if pool_test_success else '❌ FAILED'}")
    logger.info(f"FK Constraint Enforcement: {'✅ SUCCESS' if enforcement_test_success else '❌ FAILED'}")
    logger.info(f"All Databases FK Enabled: {'✅ SUCCESS' if all_enabled else '❌ FAILED'}")
    
    if all_enabled and pool_test_success and enforcement_test_success:
        logger.info("\n🎉 FOREIGN KEY CONSTRAINTS SUCCESSFULLY ENABLED!")
        logger.info("   - All database files have foreign keys enabled")
        logger.info("   - Connection pool properly configures foreign keys")
        logger.info("   - Foreign key constraints are being enforced")
        logger.info("   - Data integrity is now protected")
        return True
    else:
        logger.error("\n❌ FOREIGN KEY ENABLEMENT INCOMPLETE")
        logger.error("   Some issues remain - please check the logs above")
        return False

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)
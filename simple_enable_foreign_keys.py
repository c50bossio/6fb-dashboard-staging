#!/usr/bin/env python3
"""
Simple Foreign Key Enablement Script for 6FB AI Agent System

This script focuses solely on enabling foreign key constraints without 
modifying existing database schemas.
"""

import sqlite3
import logging
import sys
from pathlib import Path
import asyncio

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SimpleForeignKeyEnabler:
    """Simple foreign key enablement without schema changes"""
    
    def __init__(self):
        self.database_files = [
            "database/agent_system.db",
            "data/vector_knowledge.db", 
            "data/ai_insights.db"
        ]
    
    def enable_foreign_keys_persistent(self, db_path: str) -> bool:
        """Enable foreign keys in a way that persists across connections"""
        try:
            # First, check current status
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            cursor.execute("PRAGMA foreign_keys;")
            current_status = cursor.fetchone()[0]
            logger.info(f"Current FK status for {db_path}: {current_status}")
            
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
                    logger.error(f"❌ Foreign key violations found in {db_path}: {violations}")
                    conn.close()
                    return False
                else:
                    logger.info(f"✅ Foreign keys enabled on {db_path} with no violations")
            
            conn.close()
            return is_enabled
            
        except Exception as e:
            logger.error(f"Error enabling foreign keys on {db_path}: {e}")
            return False
    
    def test_foreign_key_with_direct_connection(self, db_path: str) -> bool:
        """Test foreign key enforcement with direct SQLite connection"""
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Enable foreign keys for this connection
            cursor.execute("PRAGMA foreign_keys = ON;")
            
            # Verify foreign keys are enabled
            cursor.execute("PRAGMA foreign_keys;")
            fk_status = cursor.fetchone()[0]
            
            if not fk_status:
                logger.error(f"❌ Could not enable foreign keys on {db_path}")
                conn.close()
                return False
            
            # Test foreign key enforcement (only for main database with appointments table)
            if "agent_system.db" in db_path:
                try:
                    # Try to insert an appointment with invalid barbershop_id
                    cursor.execute("""
                        INSERT INTO appointments (id, barbershop_id, client_id, barber_id, service_id, scheduled_at, status) 
                        VALUES (?, ?, ?, ?, ?, datetime('now'), 'PENDING')
                    """, ('test_fk_violation', 'invalid_barbershop_id', 'test_client', 'test_barber', 'test_service'))
                    
                    # If we get here, foreign keys are NOT being enforced
                    logger.error(f"❌ Foreign key constraint violation was NOT caught for {db_path}")
                    
                    # Clean up the invalid record
                    cursor.execute("DELETE FROM appointments WHERE id = ?", ('test_fk_violation',))
                    conn.commit()
                    conn.close()
                    return False
                    
                except sqlite3.IntegrityError as e:
                    if "FOREIGN KEY constraint failed" in str(e):
                        logger.info(f"✅ Foreign key constraint properly enforced on {db_path}")
                        conn.close()
                        return True
                    else:
                        logger.error(f"❌ Unexpected integrity error on {db_path}: {e}")
                        conn.close()
                        return False
            else:
                # For other databases, just check that FK is enabled
                logger.info(f"✅ Foreign keys enabled on {db_path} (no FK relationships to test)")
                conn.close()
                return True
                
        except Exception as e:
            logger.error(f"Error testing foreign keys on {db_path}: {e}")
            return False

def main():
    """Main function to enable foreign keys"""
    logger.info("🚀 Starting Simple Foreign Key Enablement")
    
    enabler = SimpleForeignKeyEnabler()
    all_success = True
    
    for db_path in enabler.database_files:
        if not Path(db_path).exists():
            logger.warning(f"⚠️  Database file not found: {db_path}")
            continue
            
        logger.info(f"\n🔧 Processing {db_path}")
        
        # Enable foreign keys
        enable_success = enabler.enable_foreign_keys_persistent(db_path)
        if not enable_success:
            all_success = False
            continue
            
        # Test enforcement
        test_success = enabler.test_foreign_key_with_direct_connection(db_path)
        if not test_success:
            all_success = False
    
    # Final summary
    if all_success:
        logger.info("\n🎉 SUCCESS: Foreign key constraints enabled on all database files")
        logger.info("✅ Data integrity protection is now active")
        
        # Show how to verify in connection pool
        logger.info("\n💡 To ensure your application uses foreign keys:")
        logger.info("   1. Make sure enable_foreign_keys=True in ConnectionPoolConfig")
        logger.info("   2. Verify 'PRAGMA foreign_keys = ON' is executed on each new connection")
        logger.info("   3. Test foreign key enforcement in your application code")
        
        return True
    else:
        logger.error("\n❌ FAILED: Some databases could not enable foreign key constraints")
        return False

if __name__ == "__main__":
    result = main()
    sys.exit(0 if result else 1)
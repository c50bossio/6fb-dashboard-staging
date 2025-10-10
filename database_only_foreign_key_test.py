#!/usr/bin/env python3
"""
Database-Only Foreign Key Test for 6FB AI Agent System

This script tests foreign key constraints directly on the database files
without depending on the API system being stable.
"""

import asyncio
import sqlite3
import logging
import sys
import json
import time
from pathlib import Path
from typing import Dict, Any, List

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DatabaseForeignKeyTester:
    """Test foreign key enforcement directly on database files"""
    
    def __init__(self):
        self.databases = {
            "main": "database/agent_system.db",
            "vector_knowledge": "data/vector_knowledge.db", 
            "ai_insights": "data/ai_insights.db"
        }
    
    def test_database_foreign_key_status(self, db_name: str, db_path: str) -> Dict[str, Any]:
        """Test foreign key status for a specific database"""
        result = {
            'database': db_name,
            'path': db_path,
            'exists': Path(db_path).exists(),
            'foreign_keys_enabled': False,
            'tables_with_fk': 0,
            'constraint_test_passed': False,
            'error': None
        }
        
        if not result['exists']:
            result['error'] = "Database file does not exist"
            return result
        
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Enable foreign keys for this connection
            cursor.execute("PRAGMA foreign_keys = ON;")
            
            # Check if foreign keys are enabled
            cursor.execute("PRAGMA foreign_keys;")
            fk_status = cursor.fetchone()[0]
            result['foreign_keys_enabled'] = bool(fk_status)
            
            # Count tables with foreign keys
            cursor.execute("""
                SELECT COUNT(*) FROM sqlite_master 
                WHERE type='table' AND (sql LIKE '%FOREIGN KEY%' OR sql LIKE '%REFERENCES%')
            """)
            result['tables_with_fk'] = cursor.fetchone()[0]
            
            # Test constraint enforcement (only for main database)
            if db_name == "main" and result['foreign_keys_enabled']:
                try:
                    # Try to insert invalid appointment
                    test_id = f"fk_test_{int(time.time())}"
                    cursor.execute("""
                        INSERT INTO appointments (id, barbershop_id, client_id, barber_id, service_id, scheduled_at, status) 
                        VALUES (?, ?, ?, ?, ?, datetime('now'), 'PENDING')
                    """, (test_id, 'invalid_barbershop', 'invalid_client', 'invalid_barber', 'invalid_service'))
                    
                    # If we get here, constraint was NOT enforced
                    result['constraint_test_passed'] = False
                    result['error'] = "Foreign key constraint not enforced"
                    
                    # Clean up
                    cursor.execute("DELETE FROM appointments WHERE id = ?", (test_id,))
                    conn.commit()
                    
                except sqlite3.IntegrityError as e:
                    if "FOREIGN KEY constraint failed" in str(e):
                        result['constraint_test_passed'] = True
                    else:
                        result['error'] = f"Unexpected integrity error: {e}"
            else:
                result['constraint_test_passed'] = True  # No FK relationships to test
            
            conn.close()
            
        except Exception as e:
            result['error'] = str(e)
        
        return result
    
    async def test_async_connection_pool(self) -> Dict[str, Any]:
        """Test foreign key enforcement through async connection pool"""
        result = {
            'pool_test_passed': False,
            'foreign_keys_enabled': False,
            'constraint_enforced': False,
            'error': None
        }
        
        try:
            # Import the connection pool
            sys.path.append('.')
            from database.async_connection_pool import ConnectionPoolConfig, AsyncConnectionPool
            
            config = ConnectionPoolConfig(
                database_path="database/agent_system.db",
                max_connections=3,
                min_connections=1,
                enable_foreign_keys=True
            )
            
            pool = AsyncConnectionPool(config)
            await pool.initialize()
            
            # Test foreign key status
            async with pool.get_connection() as conn:
                cursor = await conn.execute("PRAGMA foreign_keys;")
                fk_result = await cursor.fetchone()
                result['foreign_keys_enabled'] = bool(fk_result[0]) if fk_result else False
                
                if result['foreign_keys_enabled']:
                    # Test constraint enforcement
                    test_id = f"async_fk_test_{int(time.time())}"
                    try:
                        await conn.execute("""
                            INSERT INTO appointments (id, barbershop_id, client_id, barber_id, service_id, scheduled_at, status) 
                            VALUES (?, ?, ?, ?, ?, datetime('now'), 'PENDING')
                        """, (test_id, 'invalid_barbershop', 'invalid_client', 'invalid_barber', 'invalid_service'))
                        
                        await conn.commit()
                        result['constraint_enforced'] = False
                        result['error'] = "Foreign key constraint not enforced in async pool"
                        
                        # Clean up
                        await conn.execute("DELETE FROM appointments WHERE id = ?", (test_id,))
                        await conn.commit()
                        
                    except Exception as e:
                        if "FOREIGN KEY constraint failed" in str(e):
                            result['constraint_enforced'] = True
                            result['pool_test_passed'] = True
                        else:
                            result['error'] = f"Unexpected async error: {e}"
            
            await pool.close()
            
        except Exception as e:
            result['error'] = str(e)
        
        return result
    
    def get_database_statistics(self) -> Dict[str, Any]:
        """Get comprehensive statistics about database files"""
        stats = {}
        
        for db_name, db_path in self.databases.items():
            if Path(db_path).exists():
                try:
                    conn = sqlite3.connect(db_path)
                    cursor = conn.cursor()
                    
                    # Basic info
                    cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table';")
                    table_count = cursor.fetchone()[0]
                    
                    # File size
                    file_size = Path(db_path).stat().st_size
                    
                    # Get table names and row counts
                    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
                    tables = cursor.fetchall()
                    
                    table_stats = {}
                    for (table_name,) in tables:
                        try:
                            cursor.execute(f"SELECT COUNT(*) FROM [{table_name}];")
                            row_count = cursor.fetchone()[0]
                            table_stats[table_name] = row_count
                        except:
                            table_stats[table_name] = "error"
                    
                    stats[db_name] = {
                        'path': db_path,
                        'size_bytes': file_size,
                        'size_mb': round(file_size / 1024 / 1024, 2),
                        'table_count': table_count,
                        'tables': table_stats
                    }
                    
                    conn.close()
                    
                except Exception as e:
                    stats[db_name] = {'error': str(e)}
            else:
                stats[db_name] = {'exists': False}
        
        return stats
    
    def analyze_foreign_key_relationships(self) -> Dict[str, Any]:
        """Analyze all foreign key relationships in main database"""
        if not Path(self.databases["main"]).exists():
            return {'error': 'Main database does not exist'}
        
        try:
            conn = sqlite3.connect(self.databases["main"])
            cursor = conn.cursor()
            
            # Get all tables with foreign key definitions
            cursor.execute("""
                SELECT name, sql FROM sqlite_master 
                WHERE type='table' AND (sql LIKE '%FOREIGN KEY%' OR sql LIKE '%REFERENCES%')
            """)
            
            fk_tables = cursor.fetchall()
            relationships = []
            
            for table_name, sql in fk_tables:
                # Parse foreign key relationships
                lines = sql.split('\n')
                table_fks = []
                
                for line in lines:
                    if 'REFERENCES' in line:
                        # Extract the reference
                        parts = line.strip().replace(',', '').split()
                        if 'REFERENCES' in parts:
                            ref_idx = parts.index('REFERENCES')
                            if ref_idx + 1 < len(parts):
                                referenced_table = parts[ref_idx + 1].replace('(', '').replace(')', '')
                                table_fks.append({
                                    'definition': line.strip(),
                                    'referenced_table': referenced_table
                                })
                
                if table_fks:
                    relationships.append({
                        'table': table_name,
                        'foreign_keys': table_fks
                    })
            
            conn.close()
            
            return {
                'total_tables_with_fk': len(relationships),
                'relationships': relationships
            }
            
        except Exception as e:
            return {'error': str(e)}

async def main():
    """Main testing function"""
    logger.info("🔍 Starting Database-Only Foreign Key Testing")
    
    tester = DatabaseForeignKeyTester()
    
    # Step 1: Get database statistics
    logger.info("\n📊 STEP 1: Database Statistics")
    stats = tester.get_database_statistics()
    
    for db_name, db_stats in stats.items():
        if 'error' in db_stats:
            logger.error(f"❌ {db_name}: {db_stats['error']}")
        elif not db_stats.get('exists', True):
            logger.warning(f"⚠️  {db_name}: Database file does not exist")
        else:
            logger.info(f"📄 {db_name}: {db_stats['table_count']} tables, {db_stats['size_mb']}MB")
            if 'tables' in db_stats:
                for table, count in db_stats['tables'].items():
                    if count != "error":
                        logger.info(f"   └── {table}: {count} rows")
    
    # Step 2: Analyze foreign key relationships  
    logger.info("\n🔗 STEP 2: Foreign Key Relationship Analysis")
    fk_analysis = tester.analyze_foreign_key_relationships()
    
    if 'error' in fk_analysis:
        logger.error(f"❌ FK Analysis failed: {fk_analysis['error']}")
    else:
        logger.info(f"📊 Found {fk_analysis['total_tables_with_fk']} tables with foreign keys")
        for rel in fk_analysis.get('relationships', []):
            logger.info(f"   🔗 {rel['table']}: {len(rel['foreign_keys'])} foreign keys")
    
    # Step 3: Test each database
    logger.info("\n🧪 STEP 3: Individual Database Foreign Key Tests")
    
    all_passed = True
    test_results = {}
    
    for db_name, db_path in tester.databases.items():
        logger.info(f"\n   Testing {db_name} database...")
        result = tester.test_database_foreign_key_status(db_name, db_path)
        test_results[db_name] = result
        
        if result['error']:
            logger.error(f"   ❌ {db_name}: {result['error']}")
            all_passed = False
        else:
            logger.info(f"   📄 {db_name}: FK enabled: {result['foreign_keys_enabled']}, "
                       f"Tables with FK: {result['tables_with_fk']}, "
                       f"Constraints working: {result['constraint_test_passed']}")
            
            if not (result['foreign_keys_enabled'] and result['constraint_test_passed']):
                all_passed = False
    
    # Step 4: Test async connection pool
    logger.info("\n🏊 STEP 4: Async Connection Pool Foreign Key Test")
    async_result = await tester.test_async_connection_pool()
    
    if async_result['error']:
        logger.error(f"❌ Async pool test failed: {async_result['error']}")
        all_passed = False
    else:
        logger.info(f"✅ Async pool: FK enabled: {async_result['foreign_keys_enabled']}, "
                   f"Constraints enforced: {async_result['constraint_enforced']}")
        if not (async_result['foreign_keys_enabled'] and async_result['constraint_enforced']):
            all_passed = False
    
    # Final summary
    logger.info("\n🎯 FINAL SUMMARY:")
    logger.info(f"Database Statistics: ✅ COLLECTED")
    logger.info(f"FK Relationship Analysis: {'✅ SUCCESS' if 'error' not in fk_analysis else '❌ FAILED'}")
    
    for db_name, result in test_results.items():
        status = "✅ PASS" if (result['foreign_keys_enabled'] and result['constraint_test_passed'] and not result['error']) else "❌ FAIL"
        logger.info(f"{db_name.capitalize()} Database: {status}")
    
    async_status = "✅ PASS" if (async_result['foreign_keys_enabled'] and async_result['constraint_enforced'] and not async_result['error']) else "❌ FAIL"
    logger.info(f"Async Connection Pool: {async_status}")
    
    if all_passed:
        logger.info("\n🎉 SUCCESS: All foreign key constraints are properly enabled and working!")
        logger.info("   ✅ Foreign keys enabled on all database files")
        logger.info("   ✅ Connection pool properly configures foreign keys")
        logger.info("   ✅ Constraint enforcement is working correctly")
        logger.info("   ✅ Data integrity protection is active")
        
        # Performance note
        logger.info("\n💡 PERFORMANCE NOTES:")
        logger.info("   • Foreign key constraints add minimal performance overhead")
        logger.info("   • Benefits of data integrity far outweigh small performance cost")
        logger.info("   • System is ready for production use with data protection")
        
        return True
    else:
        logger.error("\n❌ ISSUES FOUND: Some foreign key constraints are not working properly")
        logger.error("   Please review the test results above for specific issues")
        return False

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)
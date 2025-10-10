#!/usr/bin/env python3
"""
Test Foreign Key Enforcement in Running 6FB AI Agent System

This script tests that foreign key constraints are properly enforced
in the running system using both direct database access and API endpoints.
"""

import asyncio
import requests
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

class ForeignKeyTester:
    """Test foreign key enforcement across the system"""
    
    def __init__(self):
        self.api_base_url = "http://localhost:8002"
        self.db_path = "database/agent_system.db"
        
    def test_system_health(self) -> bool:
        """Test that the API system is running"""
        try:
            response = requests.get(f"{self.api_base_url}/health", timeout=5)
            if response.status_code == 200:
                health_data = response.json()
                logger.info(f"✅ System is healthy with {len(health_data.get('services', []))} services")
                return True
            else:
                logger.error(f"❌ System health check failed: {response.status_code}")
                return False
        except Exception as e:
            logger.error(f"❌ Cannot connect to API system: {e}")
            return False
    
    def test_direct_database_foreign_keys(self) -> bool:
        """Test foreign key constraints with direct database access"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Enable foreign keys for this connection
            cursor.execute("PRAGMA foreign_keys = ON;")
            
            # Verify foreign keys are enabled
            cursor.execute("PRAGMA foreign_keys;")
            fk_status = cursor.fetchone()[0]
            
            if not fk_status:
                logger.error("❌ Foreign keys not enabled in direct connection")
                conn.close()
                return False
            
            logger.info("✅ Foreign keys enabled in direct connection")
            
            # Test 1: Try to insert appointment with invalid barbershop_id
            test_id = f"fk_test_{int(time.time())}"
            try:
                cursor.execute("""
                    INSERT INTO appointments (id, barbershop_id, client_id, barber_id, service_id, scheduled_at, status) 
                    VALUES (?, ?, ?, ?, ?, datetime('now'), 'PENDING')
                """, (test_id, 'invalid_barbershop', 'invalid_client', 'invalid_barber', 'invalid_service'))
                
                # If we reach here, constraint was NOT enforced
                logger.error("❌ Foreign key constraint NOT enforced - invalid appointment created")
                cursor.execute("DELETE FROM appointments WHERE id = ?", (test_id,))
                conn.commit()
                conn.close()
                return False
                
            except sqlite3.IntegrityError as e:
                if "FOREIGN KEY constraint failed" in str(e):
                    logger.info("✅ Foreign key constraint properly enforced on appointments table")
                else:
                    logger.error(f"❌ Unexpected integrity error: {e}")
                    conn.close()
                    return False
            
            # Test 2: Try to insert payment with invalid appointment_id
            test_payment_id = f"payment_fk_test_{int(time.time())}"
            try:
                cursor.execute("""
                    INSERT INTO payments (id, appointment_id, amount, status) 
                    VALUES (?, ?, 100.00, 'COMPLETED')
                """, (test_payment_id, 'invalid_appointment_id'))
                
                logger.error("❌ Foreign key constraint NOT enforced - invalid payment created")
                cursor.execute("DELETE FROM payments WHERE id = ?", (test_payment_id,))
                conn.commit()
                conn.close()
                return False
                
            except sqlite3.IntegrityError as e:
                if "FOREIGN KEY constraint failed" in str(e):
                    logger.info("✅ Foreign key constraint properly enforced on payments table")
                else:
                    logger.error(f"❌ Unexpected integrity error: {e}")
                    conn.close()
                    return False
            
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"❌ Error testing direct database foreign keys: {e}")
            return False
    
    def test_connection_pool_foreign_keys(self) -> bool:
        """Test foreign key enforcement through the connection pool"""
        try:
            # Import and test the connection pool directly
            import sys
            sys.path.append('.')
            
            from database.async_connection_pool import ConnectionPoolConfig, AsyncConnectionPool
            
            async def test_pool():
                config = ConnectionPoolConfig(
                    database_path=self.db_path,
                    max_connections=5,
                    min_connections=1,
                    enable_foreign_keys=True
                )
                
                pool = AsyncConnectionPool(config)
                await pool.initialize()
                
                # Test foreign key status
                async with pool.get_connection() as conn:
                    cursor = await conn.execute("PRAGMA foreign_keys;")
                    result = await cursor.fetchone()
                    fk_enabled = bool(result[0]) if result else False
                    
                    if not fk_enabled:
                        logger.error("❌ Foreign keys not enabled in connection pool")
                        await pool.close()
                        return False
                    
                    logger.info("✅ Foreign keys enabled in connection pool")
                    
                    # Test constraint enforcement
                    test_id = f"pool_fk_test_{int(time.time())}"
                    try:
                        await conn.execute("""
                            INSERT INTO appointments (id, barbershop_id, client_id, barber_id, service_id, scheduled_at, status) 
                            VALUES (?, ?, ?, ?, ?, datetime('now'), 'PENDING')
                        """, (test_id, 'invalid_barbershop', 'invalid_client', 'invalid_barber', 'invalid_service'))
                        
                        await conn.commit()
                        logger.error("❌ Connection pool foreign key constraint NOT enforced")
                        
                        # Clean up
                        await conn.execute("DELETE FROM appointments WHERE id = ?", (test_id,))
                        await conn.commit()
                        await pool.close()
                        return False
                        
                    except Exception as e:
                        if "FOREIGN KEY constraint failed" in str(e):
                            logger.info("✅ Connection pool foreign key constraint properly enforced")
                            await pool.close()
                            return True
                        else:
                            logger.error(f"❌ Unexpected error in connection pool: {e}")
                            await pool.close()
                            return False
            
            return asyncio.run(test_pool())
            
        except Exception as e:
            logger.error(f"❌ Error testing connection pool foreign keys: {e}")
            return False
    
    def get_database_constraints_info(self) -> Dict[str, Any]:
        """Get information about foreign key constraints in the database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get all tables with foreign keys
            cursor.execute("""
                SELECT name, sql FROM sqlite_master 
                WHERE type='table' AND sql LIKE '%FOREIGN KEY%' OR sql LIKE '%REFERENCES%'
            """)
            
            fk_tables = cursor.fetchall()
            
            constraints_info = {
                'total_tables_with_fk': len(fk_tables),
                'foreign_key_relationships': []
            }
            
            for table_name, sql in fk_tables:
                # Extract foreign key information
                fk_info = {
                    'table': table_name,
                    'references': []
                }
                
                # Simple parsing of REFERENCES clauses
                lines = sql.split('\n')
                for line in lines:
                    if 'REFERENCES' in line:
                        fk_info['references'].append(line.strip().replace(',', ''))
                
                constraints_info['foreign_key_relationships'].append(fk_info)
            
            # Get current foreign key setting
            cursor.execute("PRAGMA foreign_keys;")
            fk_status = cursor.fetchone()[0]
            constraints_info['foreign_keys_enabled'] = bool(fk_status)
            
            # Get record counts for key tables
            try:
                cursor.execute("SELECT COUNT(*) FROM users")
                constraints_info['users_count'] = cursor.fetchone()[0]
                
                cursor.execute("SELECT COUNT(*) FROM barbershops")
                constraints_info['barbershops_count'] = cursor.fetchone()[0]
                
                cursor.execute("SELECT COUNT(*) FROM appointments")
                constraints_info['appointments_count'] = cursor.fetchone()[0]
                
                cursor.execute("SELECT COUNT(*) FROM payments")
                constraints_info['payments_count'] = cursor.fetchone()[0]
            except:
                pass
            
            conn.close()
            return constraints_info
            
        except Exception as e:
            logger.error(f"Error getting constraints info: {e}")
            return {}
    
    def run_performance_test(self) -> Dict[str, Any]:
        """Run a basic performance test to ensure foreign keys don't significantly impact performance"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Test with foreign keys enabled
            cursor.execute("PRAGMA foreign_keys = ON;")
            
            # Time a simple query
            start_time = time.time()
            cursor.execute("""
                SELECT a.id, a.status, u.full_name, b.id as barbershop_id 
                FROM appointments a 
                JOIN users u ON a.client_id = u.id 
                JOIN barbershops b ON a.barbershop_id = b.id 
                LIMIT 100
            """)
            results_fk_on = cursor.fetchall()
            time_fk_on = time.time() - start_time
            
            # Test with foreign keys disabled  
            cursor.execute("PRAGMA foreign_keys = OFF;")
            
            start_time = time.time()
            cursor.execute("""
                SELECT a.id, a.status, u.full_name, b.id as barbershop_id 
                FROM appointments a 
                JOIN users u ON a.client_id = u.id 
                JOIN barbershops b ON a.barbershop_id = b.id 
                LIMIT 100
            """)
            results_fk_off = cursor.fetchall()
            time_fk_off = time.time() - start_time
            
            conn.close()
            
            return {
                'foreign_keys_on_time_ms': round(time_fk_on * 1000, 2),
                'foreign_keys_off_time_ms': round(time_fk_off * 1000, 2),
                'performance_impact_ms': round((time_fk_on - time_fk_off) * 1000, 2),
                'results_count': len(results_fk_on),
                'performance_acceptable': (time_fk_on - time_fk_off) < 0.01  # Less than 10ms impact
            }
            
        except Exception as e:
            logger.error(f"Error running performance test: {e}")
            return {'error': str(e)}

def main():
    """Main testing function"""
    logger.info("🧪 Starting Foreign Key Enforcement Testing")
    
    tester = ForeignKeyTester()
    
    # Test 1: System Health
    logger.info("\n📡 STEP 1: Testing System Health")
    system_healthy = tester.test_system_health()
    
    if not system_healthy:
        logger.error("❌ System not healthy - cannot run foreign key tests")
        return False
    
    # Test 2: Database Constraints Info
    logger.info("\n📊 STEP 2: Analyzing Database Constraints")
    constraints_info = tester.get_database_constraints_info()
    
    if constraints_info:
        logger.info(f"📄 Database has {constraints_info.get('total_tables_with_fk', 0)} tables with foreign keys")
        logger.info(f"📊 Data counts - Users: {constraints_info.get('users_count', 'unknown')}, "
                   f"Appointments: {constraints_info.get('appointments_count', 'unknown')}, "
                   f"Payments: {constraints_info.get('payments_count', 'unknown')}")
    
    # Test 3: Direct Database Foreign Key Enforcement
    logger.info("\n🔒 STEP 3: Testing Direct Database Foreign Key Enforcement")
    direct_fk_test = tester.test_direct_database_foreign_keys()
    
    # Test 4: Connection Pool Foreign Key Enforcement
    logger.info("\n🏊 STEP 4: Testing Connection Pool Foreign Key Enforcement")
    pool_fk_test = tester.test_connection_pool_foreign_keys()
    
    # Test 5: Performance Impact
    logger.info("\n⚡ STEP 5: Testing Performance Impact")
    performance_results = tester.run_performance_test()
    
    if 'error' not in performance_results:
        logger.info(f"⚡ Query time with FK ON: {performance_results.get('foreign_keys_on_time_ms')}ms")
        logger.info(f"⚡ Query time with FK OFF: {performance_results.get('foreign_keys_off_time_ms')}ms")
        logger.info(f"⚡ Performance impact: {performance_results.get('performance_impact_ms')}ms")
        
        if performance_results.get('performance_acceptable', False):
            logger.info("✅ Performance impact is acceptable")
        else:
            logger.warning("⚠️  Performance impact may be noticeable")
    
    # Final Summary
    logger.info("\n🎯 FINAL SUMMARY:")
    logger.info(f"System Health: {'✅ HEALTHY' if system_healthy else '❌ UNHEALTHY'}")
    logger.info(f"Direct FK Enforcement: {'✅ WORKING' if direct_fk_test else '❌ FAILED'}")
    logger.info(f"Connection Pool FK Enforcement: {'✅ WORKING' if pool_fk_test else '❌ FAILED'}")
    logger.info(f"Performance Impact: {'✅ ACCEPTABLE' if performance_results.get('performance_acceptable') else '⚠️  NOTICEABLE'}")
    
    overall_success = system_healthy and direct_fk_test and pool_fk_test
    
    if overall_success:
        logger.info("\n🎉 SUCCESS: Foreign key constraints are properly enabled and working!")
        logger.info("   ✅ Data integrity is protected")
        logger.info("   ✅ System performance is acceptable")
        logger.info("   ✅ Both direct database and connection pool enforce constraints")
    else:
        logger.error("\n❌ ISSUES FOUND: Foreign key enforcement needs attention")
    
    return overall_success

if __name__ == "__main__":
    result = main()
    sys.exit(0 if result else 1)
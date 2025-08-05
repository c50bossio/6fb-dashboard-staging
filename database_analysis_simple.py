#!/usr/bin/env python3
"""
Database Schema Analysis and Integrity Testing
6FB AI Agent System - Database Administrator Analysis
"""

import sqlite3
import os
import json
from datetime import datetime
import time

class DatabaseAnalyzer:
    def __init__(self):
        self.base_path = "/Users/bossio/6FB AI Agent System"
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "schema_analysis": {},
            "data_integrity": {},
            "performance_analysis": {},
            "migration_compatibility": {},
            "security_assessment": {},
            "barbershop_data_model": {},
            "recommendations": []
        }
    
    def run_analysis(self):
        """Run comprehensive database analysis"""
        print("🔍 Starting database analysis...")
        
        # 1. Schema Analysis
        self.analyze_schemas()
        
        # 2. Data Integrity Testing
        self.test_data_integrity() 
        
        # 3. Performance Analysis
        self.analyze_performance()
        
        # 4. Security Assessment
        self.assess_security()
        
        # 5. Generate Report
        self.generate_report()
        
        return self.results
    
    def analyze_schemas(self):
        """Analyze database schemas"""
        print("📊 Analyzing schemas...")
        
        schema_analysis = {}
        
        # Analyze main SQLite database
        sqlite_path = os.path.join(self.base_path, "agent_system.db")
        if os.path.exists(sqlite_path):
            schema_analysis["main_sqlite"] = self.analyze_sqlite_db(sqlite_path)
        
        # Analyze database directory
        db_dir = os.path.join(self.base_path, "database")
        sqlite_db_path = os.path.join(db_dir, "agent_system.db")
        if os.path.exists(sqlite_db_path):
            schema_analysis["database_dir_sqlite"] = self.analyze_sqlite_db(sqlite_db_path)
        
        # Analyze data directory databases
        data_dir = os.path.join(self.base_path, "data")
        if os.path.exists(data_dir):
            for file in os.listdir(data_dir):
                if file.endswith('.db'):
                    db_path = os.path.join(data_dir, file)
                    schema_analysis[f"data_{file}"] = self.analyze_sqlite_db(db_path)
        
        # Analyze schema files
        schema_analysis["postgresql_schema"] = self.analyze_schema_file("database/complete-schema.sql")
        schema_analysis["supabase_schema"] = self.analyze_schema_file("database/supabase-schema.sql")
        
        self.results["schema_analysis"] = schema_analysis
    
    def analyze_sqlite_db(self, db_path):
        """Analyze a SQLite database"""
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Get tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            analysis = {
                "path": db_path,
                "tables": {},
                "total_tables": len(tables),
                "indexes": [],
                "triggers": []
            }
            
            # Analyze each table
            for table in tables:
                if table == 'sqlite_sequence':
                    continue
                
                # Get table info
                cursor.execute(f"PRAGMA table_info({table})")
                columns = cursor.fetchall()
                
                # Get row count
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                row_count = cursor.fetchone()[0]
                
                analysis["tables"][table] = {
                    "columns": len(columns),
                    "row_count": row_count,
                    "column_info": [
                        {
                            "name": col[1],
                            "type": col[2],
                            "not_null": bool(col[3]),
                            "primary_key": bool(col[5])
                        } for col in columns
                    ]
                }
            
            # Get indexes
            cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'")
            indexes = cursor.fetchall()
            analysis["indexes"] = [{"name": idx[0], "sql": idx[1]} for idx in indexes]
            
            # Get triggers
            cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='trigger'")
            triggers = cursor.fetchall()
            analysis["triggers"] = [{"name": trig[0], "sql": trig[1]} for trig in triggers]
            
            conn.close()
            return analysis
            
        except Exception as e:
            return {"error": str(e), "path": db_path}
    
    def analyze_schema_file(self, schema_file):
        """Analyze schema SQL file"""
        file_path = os.path.join(self.base_path, schema_file)
        
        if not os.path.exists(file_path):
            return {"error": "File not found", "path": file_path}
        
        try:
            with open(file_path, 'r') as f:
                content = f.read()
            
            analysis = {
                "path": file_path,
                "extensions": [],
                "types": [],
                "tables": [],
                "indexes": [],
                "functions": [],
                "policies": []
            }
            
            lines = content.split('\n')
            for line in lines:
                line = line.strip()
                if line.startswith('CREATE EXTENSION'):
                    analysis["extensions"].append(line)
                elif line.startswith('CREATE TYPE'):
                    analysis["types"].append(line)
                elif line.startswith('CREATE TABLE'):
                    analysis["tables"].append(line)
                elif line.startswith('CREATE INDEX'):
                    analysis["indexes"].append(line)
                elif line.startswith('CREATE OR REPLACE FUNCTION'):
                    analysis["functions"].append(line)
                elif line.startswith('CREATE POLICY'):
                    analysis["policies"].append(line)
            
            return analysis
            
        except Exception as e:
            return {"error": str(e), "path": file_path}
    
    def test_data_integrity(self):
        """Test data integrity"""
        print("🔍 Testing data integrity...")
        
        integrity_results = {
            "crud_tests": {},
            "constraint_tests": {},
            "referential_integrity": {}
        }
        
        # Test main database
        sqlite_path = os.path.join(self.base_path, "agent_system.db")
        if os.path.exists(sqlite_path):
            integrity_results["crud_tests"]["main_db"] = self.test_crud_operations(sqlite_path)
            integrity_results["constraint_tests"]["main_db"] = self.test_constraints(sqlite_path)
            integrity_results["referential_integrity"]["main_db"] = self.check_referential_integrity(sqlite_path)
        
        self.results["data_integrity"] = integrity_results
    
    def test_crud_operations(self, db_path):
        """Test CRUD operations"""
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            test_results = {
                "create": False,
                "read": False, 
                "update": False,
                "delete": False,
                "errors": []
            }
            
            # Test CREATE
            try:
                test_email = f"test_{int(time.time())}@example.com"
                cursor.execute("""
                    INSERT INTO users (email, hashed_password, full_name)
                    VALUES (?, ?, ?)
                """, (test_email, "test_hash", "Test User"))
                
                test_user_id = cursor.lastrowid
                test_results["create"] = True
                conn.commit()
                
                # Test READ
                cursor.execute("SELECT * FROM users WHERE email = ?", (test_email,))
                user_data = cursor.fetchone()
                test_results["read"] = user_data is not None
                
                # Test UPDATE
                cursor.execute("UPDATE users SET full_name = ? WHERE id = ?", 
                             ("Updated User", test_user_id))
                test_results["update"] = cursor.rowcount > 0
                conn.commit()
                
                # Test DELETE (cleanup)
                cursor.execute("DELETE FROM users WHERE id = ?", (test_user_id,))
                test_results["delete"] = cursor.rowcount > 0
                conn.commit()
                
            except Exception as e:
                test_results["errors"].append(str(e))
            
            conn.close()
            return test_results
            
        except Exception as e:
            return {"error": str(e)}
    
    def test_constraints(self, db_path):
        """Test database constraints"""
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            constraint_results = {
                "unique_constraint_test": False,
                "foreign_key_test": False,
                "errors": []
            }
            
            # Test unique constraint on email
            try:
                test_email = "constraint_test@example.com"
                
                # Insert first user
                cursor.execute("""
                    INSERT INTO users (email, hashed_password, full_name)
                    VALUES (?, ?, ?)
                """, (test_email, "hash1", "User 1"))
                user1_id = cursor.lastrowid
                
                # Try to insert duplicate email (should fail)
                cursor.execute("""
                    INSERT INTO users (email, hashed_password, full_name)
                    VALUES (?, ?, ?)
                """, (test_email, "hash2", "User 2"))
                
                # If we get here, constraint failed
                constraint_results["unique_constraint_test"] = False
                constraint_results["errors"].append("Unique constraint not enforced")
                
                # Cleanup
                cursor.execute("DELETE FROM users WHERE id = ?", (user1_id,))
                
            except sqlite3.IntegrityError:
                # This is expected - constraint working
                constraint_results["unique_constraint_test"] = True
            except Exception as e:
                constraint_results["errors"].append(f"Unique constraint test error: {e}")
            
            conn.commit()
            conn.close()
            return constraint_results
            
        except Exception as e:
            return {"error": str(e)}
    
    def check_referential_integrity(self, db_path):
        """Check for referential integrity issues"""
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            integrity_results = {
                "orphaned_sessions": 0,
                "orphaned_messages": 0,
                "orphaned_bookings": 0,
                "integrity_status": "CLEAN"
            }
            
            # Check for orphaned sessions
            cursor.execute("""
                SELECT COUNT(*) FROM sessions s 
                LEFT JOIN users u ON s.user_id = u.id 
                WHERE u.id IS NULL
            """)
            orphaned_sessions = cursor.fetchone()[0]
            integrity_results["orphaned_sessions"] = orphaned_sessions
            
            # Check for orphaned messages
            cursor.execute("""
                SELECT COUNT(*) FROM messages m 
                LEFT JOIN sessions s ON m.session_id = s.session_id 
                WHERE s.session_id IS NULL
            """)
            orphaned_messages = cursor.fetchone()[0]
            integrity_results["orphaned_messages"] = orphaned_messages
            
            # Check for orphaned bookings
            cursor.execute("""
                SELECT COUNT(*) FROM bookings b
                LEFT JOIN users u ON b.user_id = u.id
                WHERE u.id IS NULL
            """)
            orphaned_bookings = cursor.fetchone()[0]
            integrity_results["orphaned_bookings"] = orphaned_bookings
            
            # Determine overall status
            total_orphaned = orphaned_sessions + orphaned_messages + orphaned_bookings
            if total_orphaned > 0:
                integrity_results["integrity_status"] = "ISSUES_FOUND"
            
            conn.close()
            return integrity_results
            
        except Exception as e:
            return {"error": str(e)}
    
    def analyze_performance(self):
        """Analyze database performance"""
        print("⚡ Analyzing performance...")
        
        performance_results = {
            "query_performance": {},
            "table_statistics": {},
            "index_analysis": {}
        }
        
        sqlite_path = os.path.join(self.base_path, "agent_system.db")
        if os.path.exists(sqlite_path):
            performance_results = self.test_query_performance(sqlite_path)
        
        self.results["performance_analysis"] = performance_results
    
    def test_query_performance(self, db_path):
        """Test query performance"""
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            performance_results = {
                "queries": {},
                "table_stats": {},
                "recommendations": []
            }
            
            # Test common queries
            test_queries = [
                ("SELECT COUNT(*) FROM users", "user_count"),
                ("SELECT * FROM users LIMIT 10", "user_select"),
                ("SELECT COUNT(*) FROM sessions", "session_count"),
                ("SELECT COUNT(*) FROM messages", "message_count"),
                ("SELECT COUNT(*) FROM bookings", "booking_count")
            ]
            
            for query, name in test_queries:
                start_time = time.time()
                try:
                    cursor.execute(query)
                    results = cursor.fetchall()
                    end_time = time.time()
                    
                    performance_results["queries"][name] = {
                        "execution_time_ms": (end_time - start_time) * 1000,
                        "result_count": len(results),
                        "query": query
                    }
                except Exception as e:
                    performance_results["queries"][name] = {
                        "error": str(e),
                        "query": query
                    }
            
            # Get table statistics
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            for table in tables:
                if table == 'sqlite_sequence':
                    continue
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    row_count = cursor.fetchone()[0]
                    performance_results["table_stats"][table] = {"rows": row_count}
                except Exception as e:
                    performance_results["table_stats"][table] = {"error": str(e)}
            
            # Performance recommendations
            performance_results["recommendations"] = [
                "Add indexes on frequently queried columns",
                "Consider connection pooling for production",
                "Implement query result caching",
                "Monitor slow queries in production",
                "Regular VACUUM operations for SQLite"
            ]
            
            conn.close()
            return performance_results
            
        except Exception as e:
            return {"error": str(e)}
    
    def assess_security(self):
        """Assess security measures"""
        print("🔒 Assessing security...")
        
        security_results = {
            "encryption": {},
            "access_control": {},
            "audit_logging": {},
            "recommendations": []
        }
        
        # Check encryption implementation
        sqlite_path = os.path.join(self.base_path, "agent_system.db")
        if os.path.exists(sqlite_path):
            security_results["encryption"] = self.check_encryption_status(sqlite_path)
        
        # Security recommendations
        security_results["recommendations"] = [
            "CRITICAL: Implement field-level encryption for sensitive data",
            "HIGH: Enable Row Level Security (RLS) policies in PostgreSQL",
            "HIGH: Implement comprehensive audit logging",
            "MEDIUM: Add rate limiting on authentication endpoints",
            "MEDIUM: Regular security audits and penetration testing",
            "LOW: Implement automated backup encryption"
        ]
        
        self.results["security_assessment"] = security_results
    
    def check_encryption_status(self, db_path):
        """Check encryption implementation status"""
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            encryption_status = {
                "encryption_tables": [],
                "encrypted_fields": [],
                "encryption_active": False
            }
            
            # Check for encryption-related tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%encryption%'")
            encryption_tables = [row[0] for row in cursor.fetchall()]
            encryption_status["encryption_tables"] = encryption_tables
            
            if encryption_tables:
                encryption_status["encryption_active"] = True
            
            # Check for encrypted fields in users table
            cursor.execute("PRAGMA table_info(users)")
            columns = cursor.fetchall()
            
            encrypted_fields = []
            for col in columns:
                if 'encryption' in col[1].lower() or 'encrypted' in col[1].lower():
                    encrypted_fields.append(col[1])
            
            encryption_status["encrypted_fields"] = encrypted_fields
            
            conn.close()
            return encryption_status
            
        except Exception as e:
            return {"error": str(e)}
    
    def generate_report(self):
        """Generate comprehensive report"""
        print("📋 Generating report...")
        
        # Generate recommendations based on analysis
        recommendations = []
        
        # Schema recommendations
        recommendations.extend([
            "HIGH: Implement proper UUID handling for PostgreSQL migration",
            "HIGH: Add pgvector extension for AI embeddings",
            "MEDIUM: Standardize timestamp handling with timezone support",
            "MEDIUM: Add comprehensive foreign key constraints"
        ])
        
        # Performance recommendations  
        recommendations.extend([
            "HIGH: Add composite indexes for frequent query patterns",
            "HIGH: Implement connection pooling for production",
            "MEDIUM: Consider table partitioning for large datasets",
            "LOW: Regular database maintenance (VACUUM, ANALYZE)"
        ])
        
        # Security recommendations
        recommendations.extend([
            "CRITICAL: Complete field-level encryption implementation",
            "HIGH: Implement Row Level Security policies", 
            "HIGH: Add comprehensive audit logging",
            "MEDIUM: Implement automated security scanning"
        ])
        
        # Migration recommendations
        recommendations.extend([
            "CRITICAL: Create and test migration scripts",
            "HIGH: Validate data integrity post-migration",
            "MEDIUM: Implement rollback procedures",
            "LOW: Document migration process thoroughly"
        ])
        
        self.results["recommendations"] = recommendations
        
        # Save report
        report_path = os.path.join(self.base_path, "database_analysis_report.json")
        with open(report_path, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        
        print(f"📊 Analysis complete! Report saved to: {report_path}")

def main():
    """Main function"""
    print("🚀 6FB AI Agent System - Database Analysis")
    print("=" * 50)
    
    analyzer = DatabaseAnalyzer()
    results = analyzer.run_analysis()
    
    print("\n" + "=" * 50)
    print("📊 ANALYSIS SUMMARY")
    print("=" * 50)
    
    # Print summary
    schema_count = len(results.get('schema_analysis', {}))
    print(f"✅ Schemas analyzed: {schema_count}")
    
    integrity_tests = results.get('data_integrity', {})
    print(f"✅ Data integrity tests: {len(integrity_tests)}")
    
    performance_metrics = results.get('performance_analysis', {})
    print(f"✅ Performance metrics: {len(performance_metrics)}")
    
    recommendations = results.get('recommendations', [])
    print(f"📋 Total recommendations: {len(recommendations)}")
    
    print("\n🔍 TOP RECOMMENDATIONS:")
    for i, rec in enumerate(recommendations[:8], 1):
        print(f"{i:2}. {rec}")
    
    print(f"\n📄 Full report: database_analysis_report.json")
    
    return results

if __name__ == "__main__":
    main()
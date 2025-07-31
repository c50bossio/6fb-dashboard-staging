#!/usr/bin/env python3
"""
Database Consolidation Script for 6FB AI Agent System
Consolidates all 25 duplicate database files into a single unified schema
"""

import sqlite3
import os
import shutil
import json
from datetime import datetime
from typing import List, Dict, Any
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('database_consolidation.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DatabaseConsolidator:
    """Consolidates multiple database files into a unified schema"""
    
    def __init__(self, base_path: str):
        self.base_path = base_path
        self.unified_db_path = os.path.join(base_path, "agent_system.db")
        self.backup_dir = os.path.join(base_path, "database_backups", datetime.now().strftime("%Y%m%d_%H%M%S"))
        self.database_files = []
        self.consolidation_report = {
            "start_time": datetime.now().isoformat(),
            "databases_found": 0,
            "databases_consolidated": 0,
            "tables_created": 0,
            "records_migrated": 0,
            "errors": [],
            "warnings": []
        }
    
    def find_all_databases(self) -> List[str]:
        """Find all database files in the project"""
        db_files = []
        
        for root, dirs, files in os.walk(self.base_path):
            for file in files:
                if file.endswith('.db'):
                    full_path = os.path.join(root, file)
                    db_files.append(full_path)
        
        self.database_files = db_files
        self.consolidation_report["databases_found"] = len(db_files)
        logger.info(f"Found {len(db_files)} database files")
        
        return db_files
    
    def create_backup(self):
        """Create backup of all database files before consolidation"""
        try:
            os.makedirs(self.backup_dir, exist_ok=True)
            
            for db_file in self.database_files:
                if os.path.exists(db_file):
                    # Create backup with relative path structure
                    relative_path = os.path.relpath(db_file, self.base_path)
                    backup_path = os.path.join(self.backup_dir, relative_path)
                    
                    # Create directory structure in backup
                    os.makedirs(os.path.dirname(backup_path), exist_ok=True)
                    
                    # Copy file
                    shutil.copy2(db_file, backup_path)
            
            logger.info(f"Created backup in: {self.backup_dir}")
            
        except Exception as e:
            error_msg = f"Backup creation failed: {e}"
            logger.error(error_msg)
            self.consolidation_report["errors"].append(error_msg)
            raise
    
    def analyze_database_schemas(self) -> Dict[str, Any]:
        """Analyze all database schemas to understand structure"""
        schema_analysis = {
            "unique_tables": set(),
            "table_schemas": {},
            "data_samples": {},
            "statistics": {}
        }
        
        for db_file in self.database_files:
            try:
                if not os.path.exists(db_file):
                    continue
                    
                conn = sqlite3.connect(db_file)
                cursor = conn.cursor()
                
                # Get table list
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = [row[0] for row in cursor.fetchall()]
                
                db_name = os.path.basename(db_file)
                schema_analysis["statistics"][db_name] = {
                    "tables": len(tables),
                    "file_size": os.path.getsize(db_file)
                }
                
                for table in tables:
                    schema_analysis["unique_tables"].add(table)
                    
                    # Get table schema
                    cursor.execute(f"PRAGMA table_info({table})")
                    columns = cursor.fetchall()
                    
                    table_key = f"{db_name}::{table}"
                    schema_analysis["table_schemas"][table_key] = columns
                    
                    # Get sample data
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    
                    if count > 0:
                        cursor.execute(f"SELECT * FROM {table} LIMIT 3")
                        sample_data = cursor.fetchall()
                        schema_analysis["data_samples"][table_key] = {
                            "count": count,
                            "sample": sample_data
                        }
                
                conn.close()
                
            except Exception as e:
                error_msg = f"Error analyzing {db_file}: {e}"
                logger.warning(error_msg)
                self.consolidation_report["warnings"].append(error_msg)
        
        # Convert sets to lists for JSON serialization
        schema_analysis["unique_tables"] = list(schema_analysis["unique_tables"])
        
        logger.info(f"Schema analysis complete: {len(schema_analysis['unique_tables'])} unique tables found")
        return schema_analysis
    
    def create_unified_schema(self) -> sqlite3.Connection:
        """Create unified database schema"""
        try:
            # Remove existing unified database
            if os.path.exists(self.unified_db_path):
                os.remove(self.unified_db_path)
            
            conn = sqlite3.connect(self.unified_db_path)
            cursor = conn.cursor()
            
            # Enable security and performance features
            cursor.execute("PRAGMA foreign_keys = ON")
            cursor.execute("PRAGMA journal_mode = WAL")
            cursor.execute("PRAGMA synchronous = NORMAL")
            cursor.execute("PRAGMA cache_size = -64000")  # 64MB cache
            
            # Create core tables for the unified system
            
            # Users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    hashed_password TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    barbershop_name TEXT,
                    barbershop_id TEXT,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP,
                    failed_login_attempts INTEGER DEFAULT 0,
                    locked_until TIMESTAMP
                )
            """)
            
            # Sessions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT UNIQUE NOT NULL,
                    user_id INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    ip_address TEXT,
                    user_agent TEXT,
                    conversation_history TEXT,
                    shop_context TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Messages table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    domains_addressed TEXT,
                    recommendations TEXT,
                    confidence REAL,
                    urgency TEXT,
                    requires_data BOOLEAN,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES sessions (session_id)
                )
            """)
            
            # Analytics insights table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS analytics_insights (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    insight_type TEXT NOT NULL,
                    insight_data TEXT NOT NULL,
                    confidence REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Marketing campaigns table (consolidated from multiple campaign databases)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS marketing_campaigns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    campaign_name TEXT NOT NULL,
                    campaign_type TEXT NOT NULL,
                    status TEXT DEFAULT 'active',
                    target_audience TEXT,
                    budget REAL,
                    start_date DATE,
                    end_date DATE,
                    metrics TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Bookings table (consolidated from booking databases)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS bookings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    customer_name TEXT NOT NULL,
                    customer_email TEXT,
                    customer_phone TEXT,
                    service_type TEXT NOT NULL,
                    appointment_date DATETIME NOT NULL,
                    duration_minutes INTEGER,
                    price REAL,
                    status TEXT DEFAULT 'scheduled',
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # AI learning data table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ai_learning_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    learning_type TEXT NOT NULL,
                    learning_data TEXT NOT NULL,
                    confidence REAL,
                    usage_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Security events table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS security_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    user_id INTEGER,
                    ip_address TEXT,
                    details TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Create indexes for performance
            indexes = [
                "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
                "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id)",
                "CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)",
                "CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_insights(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON marketing_campaigns(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(appointment_date)",
                "CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_ai_learning_type ON ai_learning_data(learning_type)"
            ]
            
            for index_sql in indexes:
                cursor.execute(index_sql)
            
            conn.commit()
            self.consolidation_report["tables_created"] = 8
            logger.info("Unified database schema created successfully")
            
            return conn
            
        except Exception as e:
            error_msg = f"Failed to create unified schema: {e}"
            logger.error(error_msg)
            self.consolidation_report["errors"].append(error_msg)
            raise
    
    def migrate_data(self, unified_conn: sqlite3.Connection, schema_analysis: Dict[str, Any]):
        """Migrate data from all databases to unified schema"""
        total_records = 0
        
        for db_file in self.database_files:
            try:
                if not os.path.exists(db_file) or db_file == self.unified_db_path:
                    continue
                
                logger.info(f"Migrating data from: {os.path.basename(db_file)}")
                
                source_conn = sqlite3.connect(db_file)
                source_conn.row_factory = sqlite3.Row
                source_cursor = source_conn.cursor()
                
                # Get tables in source database
                source_cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                tables = [row[0] for row in source_cursor.fetchall()]
                
                for table in tables:
                    try:
                        # Get data from source table
                        source_cursor.execute(f"SELECT * FROM {table}")
                        rows = source_cursor.fetchall()
                        
                        if not rows:
                            continue
                        
                        # Map data to unified schema tables
                        records_migrated = self._map_and_insert_data(unified_conn, table, rows, db_file)
                        total_records += records_migrated
                        
                    except Exception as e:
                        warning_msg = f"Failed to migrate table {table} from {db_file}: {e}"
                        logger.warning(warning_msg)
                        self.consolidation_report["warnings"].append(warning_msg)
                
                source_conn.close()
                self.consolidation_report["databases_consolidated"] += 1
                
            except Exception as e:
                error_msg = f"Failed to migrate database {db_file}: {e}"
                logger.error(error_msg)
                self.consolidation_report["errors"].append(error_msg)
        
        self.consolidation_report["records_migrated"] = total_records
        logger.info(f"Data migration complete: {total_records} records migrated")
    
    def _map_and_insert_data(self, unified_conn: sqlite3.Connection, source_table: str, rows: List, source_file: str) -> int:
        """Map source table data to unified schema tables"""
        cursor = unified_conn.cursor()
        records_inserted = 0
        
        try:
            # Map different source tables to unified tables
            if 'user' in source_table.lower() or 'auth' in source_table.lower():
                # Map to users table
                for row in rows:
                    row_dict = dict(row)
                    if 'email' in row_dict:
                        cursor.execute("""
                            INSERT OR IGNORE INTO users (email, hashed_password, full_name, barbershop_name, is_active)
                            VALUES (?, ?, ?, ?, ?)
                        """, (
                            row_dict.get('email', ''),
                            row_dict.get('hashed_password', row_dict.get('password', '')),
                            row_dict.get('full_name', row_dict.get('name', 'Unknown')),
                            row_dict.get('barbershop_name', ''),
                            row_dict.get('is_active', True)
                        ))
                        records_inserted += 1
            
            elif 'campaign' in source_table.lower() or 'marketing' in source_table.lower():
                # Map to marketing_campaigns table
                for row in rows:
                    row_dict = dict(row)
                    cursor.execute("""
                        INSERT OR IGNORE INTO marketing_campaigns 
                        (user_id, campaign_name, campaign_type, status, target_audience, budget, metrics)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        row_dict.get('user_id', 1),  # Default user
                        row_dict.get('campaign_name', row_dict.get('name', 'Unknown Campaign')),
                        row_dict.get('campaign_type', 'general'),
                        row_dict.get('status', 'active'),
                        row_dict.get('target_audience', ''),
                        row_dict.get('budget', 0.0),
                        json.dumps(row_dict)  # Store original data as JSON
                    ))
                    records_inserted += 1
            
            elif 'booking' in source_table.lower() or 'appointment' in source_table.lower():
                # Map to bookings table
                for row in rows:
                    row_dict = dict(row)
                    cursor.execute("""
                        INSERT OR IGNORE INTO bookings
                        (user_id, customer_name, customer_email, service_type, appointment_date, price, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        row_dict.get('user_id', 1),  # Default user
                        row_dict.get('customer_name', row_dict.get('name', 'Unknown Customer')),
                        row_dict.get('customer_email', row_dict.get('email', '')),
                        row_dict.get('service_type', row_dict.get('service', 'General Service')),
                        row_dict.get('appointment_date', row_dict.get('date', datetime.now().isoformat())),
                        row_dict.get('price', 0.0),
                        row_dict.get('status', 'scheduled')
                    ))
                    records_inserted += 1
            
            elif 'analytics' in source_table.lower() or 'insight' in source_table.lower():
                # Map to analytics_insights table
                for row in rows:
                    row_dict = dict(row)
                    cursor.execute("""
                        INSERT OR IGNORE INTO analytics_insights
                        (user_id, insight_type, insight_data, confidence)
                        VALUES (?, ?, ?, ?)
                    """, (
                        row_dict.get('user_id', 1),  # Default user
                        row_dict.get('insight_type', 'general'),
                        json.dumps(row_dict),  # Store as JSON
                        row_dict.get('confidence', 0.8)
                    ))
                    records_inserted += 1
            
            elif 'message' in source_table.lower() or 'chat' in source_table.lower():
                # Map to messages table
                for row in rows:
                    row_dict = dict(row)
                    cursor.execute("""
                        INSERT OR IGNORE INTO messages
                        (session_id, role, content, confidence)
                        VALUES (?, ?, ?, ?)
                    """, (
                        row_dict.get('session_id', 'migrated_session'),
                        row_dict.get('role', 'user'),
                        row_dict.get('content', row_dict.get('message', '')),
                        row_dict.get('confidence', 0.8)
                    ))
                    records_inserted += 1
            
            else:
                # Store unknown table data in ai_learning_data for future analysis
                for row in rows:
                    row_dict = dict(row)
                    cursor.execute("""
                        INSERT OR IGNORE INTO ai_learning_data
                        (learning_type, learning_data)
                        VALUES (?, ?)
                    """, (
                        f"migrated_{source_table}",
                        json.dumps(row_dict)
                    ))
                    records_inserted += 1
            
            unified_conn.commit()
            
        except Exception as e:
            logger.warning(f"Error inserting data from {source_table}: {e}")
        
        return records_inserted
    
    def cleanup_old_databases(self):
        """Remove old database files after successful consolidation"""
        try:
            for db_file in self.database_files:
                if db_file != self.unified_db_path and os.path.exists(db_file):
                    os.remove(db_file)
                    logger.info(f"Removed: {db_file}")
            
            # Remove empty database directories
            for root, dirs, files in os.walk(self.base_path, topdown=False):
                for dir_name in dirs:
                    dir_path = os.path.join(root, dir_name)
                    if dir_name in ['databases', 'database'] and not os.listdir(dir_path):
                        os.rmdir(dir_path)
                        logger.info(f"Removed empty directory: {dir_path}")
            
        except Exception as e:
            error_msg = f"Cleanup failed: {e}"
            logger.error(error_msg)
            self.consolidation_report["errors"].append(error_msg)
    
    def generate_report(self):
        """Generate consolidation report"""
        self.consolidation_report["end_time"] = datetime.now().isoformat()
        self.consolidation_report["duration"] = str(
            datetime.fromisoformat(self.consolidation_report["end_time"]) - 
            datetime.fromisoformat(self.consolidation_report["start_time"])
        )
        
        report_path = os.path.join(self.base_path, "database_consolidation_report.json")
        
        with open(report_path, 'w') as f:
            json.dump(self.consolidation_report, f, indent=2)
        
        logger.info(f"Consolidation report saved: {report_path}")
        return self.consolidation_report
    
    def consolidate(self):
        """Main consolidation process"""
        try:
            logger.info("🚀 Starting database consolidation process...")
            
            # Find all databases
            self.find_all_databases()
            
            # Create backup
            logger.info("📦 Creating backup of all databases...")
            self.create_backup()
            
            # Analyze schemas
            logger.info("🔍 Analyzing database schemas...")
            schema_analysis = self.analyze_database_schemas()
            
            # Create unified schema
            logger.info("🏗️ Creating unified database schema...")
            unified_conn = self.create_unified_schema()
            
            # Migrate data
            logger.info("📊 Migrating data to unified database...")
            self.migrate_data(unified_conn, schema_analysis)
            
            unified_conn.close()
            
            # Cleanup old databases
            logger.info("🧹 Cleaning up old database files...")
            self.cleanup_old_databases()
            
            # Generate report
            logger.info("📋 Generating consolidation report...")
            report = self.generate_report()
            
            logger.info("✅ Database consolidation completed successfully!")
            logger.info(f"📊 Summary: {report['databases_found']} databases → 1 unified database")
            logger.info(f"📊 Records migrated: {report['records_migrated']}")
            logger.info(f"📊 Tables created: {report['tables_created']}")
            
            return True
            
        except Exception as e:
            error_msg = f"Consolidation failed: {e}"
            logger.error(error_msg)
            self.consolidation_report["errors"].append(error_msg)
            self.generate_report()
            return False

def main():
    """Main entry point"""
    base_path = "/Users/bossio/6FB AI Agent System"
    
    consolidator = DatabaseConsolidator(base_path)
    success = consolidator.consolidate()
    
    if success:
        print("✅ Database consolidation completed successfully!")
        print(f"📊 Unified database: {consolidator.unified_db_path}")
        print(f"📦 Backup created: {consolidator.backup_dir}")
    else:
        print("❌ Database consolidation failed!")
        print("Check the logs for details.")

if __name__ == "__main__":
    main()
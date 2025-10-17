#!/usr/bin/env python3
"""
Database Schema Consistency Fix
Resolves critical mismatch between repository expectations and actual database schema.

Issues Fixed:
1. Repository expects 'agentic_sessions' but database has 'sessions'
2. Repository expects 'agentic_messages' but database has 'messages'  
3. Missing 'learning_insights' table that repository expects
4. Missing 'user_analytics' table that repository expects
5. Missing 'schema_version' table for proper migration tracking

This script provides both migration and fresh installation options.
"""

import sqlite3
import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DatabaseSchemaFixer:
    """Fix database schema consistency issues"""
    
    def __init__(self, database_path: str = "agent_system.db"):
        self.database_path = database_path
        self.backup_path = f"{database_path}.backup_{int(datetime.now().timestamp())}"
    
    def create_backup(self) -> bool:
        """Create backup of existing database"""
        try:
            if os.path.exists(self.database_path):
                import shutil
                shutil.copy2(self.database_path, self.backup_path)
                logger.info(f"Database backup created: {self.backup_path}")
                return True
            else:
                logger.info("No existing database to backup")
                return True
        except Exception as e:
            logger.error(f"Backup creation failed: {e}")
            return False
    
    def check_current_schema(self) -> Dict[str, Any]:
        """Analyze current database schema"""
        try:
            with sqlite3.connect(self.database_path) as conn:
                cursor = conn.cursor()
                
                # Get all table names
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
                tables = [row[0] for row in cursor.fetchall()]
                
                # Check specific table structures
                schema_info = {
                    'tables': tables,
                    'has_sessions': 'sessions' in tables,
                    'has_agentic_sessions': 'agentic_sessions' in tables,
                    'has_messages': 'messages' in tables, 
                    'has_agentic_messages': 'agentic_messages' in tables,
                    'has_learning_insights': 'learning_insights' in tables,
                    'has_user_analytics': 'user_analytics' in tables,
                    'has_schema_version': 'schema_version' in tables
                }
                
                # Get record counts for existing tables
                for table in ['sessions', 'messages', 'users']:
                    if table in tables:
                        cursor.execute(f"SELECT COUNT(*) FROM {table}")
                        schema_info[f'{table}_count'] = cursor.fetchone()[0]
                
                return schema_info
                
        except Exception as e:
            logger.error(f"Schema analysis failed: {e}")
            return {'error': str(e)}
    
    def migrate_existing_data(self) -> bool:
        """Migrate existing data to new schema"""
        try:
            with sqlite3.connect(self.database_path) as conn:
                cursor = conn.cursor()
                
                # Step 1: Rename existing tables if they exist
                schema_info = self.check_current_schema()
                
                if schema_info.get('has_sessions') and not schema_info.get('has_agentic_sessions'):
                    logger.info("Migrating 'sessions' table to 'agentic_sessions'")
                    
                    # Create new agentic_sessions table with proper schema
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS agentic_sessions (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            session_id TEXT UNIQUE NOT NULL,
                            user_id INTEGER NOT NULL,
                            shop_context TEXT NOT NULL DEFAULT '{}',
                            conversation_history TEXT,
                            ongoing_projects TEXT,
                            goals TEXT,
                            pain_points TEXT,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            ip_address TEXT,
                            user_agent TEXT,
                            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                        )
                    """)
                    
                    # Migrate data from sessions to agentic_sessions
                    cursor.execute("""
                        INSERT INTO agentic_sessions 
                        (session_id, user_id, shop_context, conversation_history, created_at, updated_at, last_activity, ip_address, user_agent)
                        SELECT 
                            session_id, 
                            user_id, 
                            COALESCE(shop_context, '{}'),
                            conversation_history,
                            created_at, 
                            created_at as updated_at,
                            COALESCE(last_activity, created_at),
                            ip_address,
                            user_agent
                        FROM sessions
                    """)
                    
                    # Keep old sessions table as sessions_old for safety
                    cursor.execute("ALTER TABLE sessions RENAME TO sessions_old")
                    logger.info("Sessions table migrated successfully")
                
                if schema_info.get('has_messages') and not schema_info.get('has_agentic_messages'):
                    logger.info("Migrating 'messages' table to 'agentic_messages'")
                    
                    # Create new agentic_messages table with proper schema
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS agentic_messages (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            session_id TEXT NOT NULL,
                            role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
                            content TEXT NOT NULL,
                            domains_addressed TEXT,
                            recommendations TEXT,
                            confidence REAL CHECK (confidence >= 0.0 AND confidence <= 1.0),
                            urgency TEXT CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
                            requires_data BOOLEAN DEFAULT FALSE,
                            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (session_id) REFERENCES agentic_sessions (session_id) ON DELETE CASCADE
                        )
                    """)
                    
                    # Migrate data from messages to agentic_messages
                    cursor.execute("""
                        INSERT INTO agentic_messages 
                        (session_id, role, content, domains_addressed, recommendations, confidence, urgency, requires_data, timestamp)
                        SELECT 
                            session_id, 
                            role, 
                            content, 
                            domains_addressed,
                            recommendations,
                            confidence,
                            urgency,
                            COALESCE(requires_data, 0),
                            COALESCE(created_at, CURRENT_TIMESTAMP)
                        FROM messages
                    """)
                    
                    # Keep old messages table as messages_old for safety
                    cursor.execute("ALTER TABLE messages RENAME TO messages_old")
                    logger.info("Messages table migrated successfully")
                
                conn.commit()
                return True
                
        except Exception as e:
            logger.error(f"Data migration failed: {e}")
            return False
    
    def create_missing_tables(self) -> bool:
        """Create missing tables that repository expects"""
        try:
            with sqlite3.connect(self.database_path) as conn:
                cursor = conn.cursor()
                
                # Create learning_insights table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS learning_insights (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        shop_profile TEXT NOT NULL,
                        question_domain TEXT NOT NULL,
                        question_pattern TEXT,
                        recommendation_success TEXT,
                        conversation_context TEXT,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                logger.info("Created learning_insights table")
                
                # Create user_analytics table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS user_analytics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        session_count INTEGER DEFAULT 0,
                        message_count INTEGER DEFAULT 0,
                        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        total_query_time REAL DEFAULT 0.0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                        UNIQUE(user_id)
                    )
                """)
                logger.info("Created user_analytics table")
                
                # Create schema_version table for proper migration tracking
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS schema_version (
                        id INTEGER PRIMARY KEY,
                        version INTEGER NOT NULL,
                        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        description TEXT
                    )
                """)
                
                # Insert initial schema version
                cursor.execute("""
                    INSERT OR REPLACE INTO schema_version (id, version, description)
                    VALUES (1, 1, 'Fixed schema consistency issues')
                """)
                logger.info("Created schema_version table")
                
                conn.commit()
                return True
                
        except Exception as e:
            logger.error(f"Table creation failed: {e}")
            return False
    
    def create_performance_indexes(self) -> bool:
        """Create critical indexes for performance"""
        try:
            with sqlite3.connect(self.database_path) as conn:
                cursor = conn.cursor()
                
                indexes = [
                    # Agentic sessions indexes
                    "CREATE INDEX IF NOT EXISTS idx_agentic_sessions_user_id ON agentic_sessions (user_id)",
                    "CREATE INDEX IF NOT EXISTS idx_agentic_sessions_session_id ON agentic_sessions (session_id)",
                    "CREATE INDEX IF NOT EXISTS idx_agentic_sessions_updated ON agentic_sessions (updated_at)",
                    
                    # Agentic messages indexes
                    "CREATE INDEX IF NOT EXISTS idx_agentic_messages_session_id ON agentic_messages (session_id)",
                    "CREATE INDEX IF NOT EXISTS idx_agentic_messages_timestamp ON agentic_messages (timestamp)",
                    "CREATE INDEX IF NOT EXISTS idx_agentic_messages_role ON agentic_messages (role)",
                    
                    # Learning insights indexes
                    "CREATE INDEX IF NOT EXISTS idx_learning_insights_profile ON learning_insights (shop_profile)",
                    "CREATE INDEX IF NOT EXISTS idx_learning_insights_domain ON learning_insights (question_domain)",
                    "CREATE INDEX IF NOT EXISTS idx_learning_insights_timestamp ON learning_insights (timestamp)",
                    
                    # User analytics indexes  
                    "CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics (user_id)",
                    "CREATE INDEX IF NOT EXISTS idx_user_analytics_activity ON user_analytics (last_activity)",
                    
                    # Users table indexes (if not exists)
                    "CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)",
                    "CREATE INDEX IF NOT EXISTS idx_users_barbershop_id ON users (barbershop_id)",
                    "CREATE INDEX IF NOT EXISTS idx_users_active ON users (is_active)"
                ]
                
                for index in indexes:
                    cursor.execute(index)
                
                logger.info(f"Created {len(indexes)} performance indexes")
                conn.commit()
                return True
                
        except Exception as e:
            logger.error(f"Index creation failed: {e}")
            return False
    
    def create_triggers(self) -> bool:
        """Create database triggers for data integrity"""
        try:
            with sqlite3.connect(self.database_path) as conn:
                cursor = conn.cursor()
                
                # Update timestamp triggers
                cursor.execute("""
                    CREATE TRIGGER IF NOT EXISTS update_agentic_session_timestamp 
                    AFTER UPDATE ON agentic_sessions
                    BEGIN
                        UPDATE agentic_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                    END
                """)
                
                # Analytics update trigger
                cursor.execute("""
                    CREATE TRIGGER IF NOT EXISTS update_analytics_on_message
                    AFTER INSERT ON agentic_messages
                    BEGIN
                        INSERT OR REPLACE INTO user_analytics (user_id, message_count, last_activity)
                        SELECT s.user_id, COALESCE(ua.message_count, 0) + 1, CURRENT_TIMESTAMP
                        FROM agentic_sessions s
                        LEFT JOIN user_analytics ua ON s.user_id = ua.user_id
                        WHERE s.session_id = NEW.session_id;
                    END
                """)
                
                logger.info("Created database triggers")
                conn.commit()
                return True
                
        except Exception as e:
            logger.error(f"Trigger creation failed: {e}")
            return False
    
    def verify_fix(self) -> Dict[str, Any]:
        """Verify that the schema fix was successful"""
        try:
            with sqlite3.connect(self.database_path) as conn:
                cursor = conn.cursor()
                
                # Check table existence
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
                tables = [row[0] for row in cursor.fetchall()]
                
                verification = {
                    'success': True,
                    'tables': tables,
                    'has_agentic_sessions': 'agentic_sessions' in tables,
                    'has_agentic_messages': 'agentic_messages' in tables,
                    'has_learning_insights': 'learning_insights' in tables,
                    'has_user_analytics': 'user_analytics' in tables,
                    'has_schema_version': 'schema_version' in tables
                }
                
                # Check record counts after migration
                for table in ['agentic_sessions', 'agentic_messages', 'users']:
                    if table in tables:
                        cursor.execute(f"SELECT COUNT(*) FROM {table}")
                        verification[f'{table}_count'] = cursor.fetchone()[0]
                
                # Verify foreign key constraints work
                cursor.execute("PRAGMA foreign_keys = ON")
                cursor.execute("PRAGMA foreign_key_check")
                fk_violations = cursor.fetchall()
                verification['foreign_key_violations'] = len(fk_violations)
                
                if fk_violations:
                    verification['fk_violations'] = fk_violations
                
                return verification
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def run_full_fix(self) -> Dict[str, Any]:
        """Run complete database schema fix"""
        logger.info("Starting database schema consistency fix...")
        
        results = {
            'started_at': datetime.now().isoformat(),
            'steps_completed': []
        }
        
        # Step 1: Create backup
        if self.create_backup():
            results['steps_completed'].append('backup_created')
            results['backup_path'] = self.backup_path
        else:
            results['error'] = 'Backup creation failed'
            return results
        
        # Step 2: Analyze current schema  
        schema_info = self.check_current_schema()
        results['initial_schema'] = schema_info
        results['steps_completed'].append('schema_analyzed')
        
        # Step 3: Migrate existing data
        if self.migrate_existing_data():
            results['steps_completed'].append('data_migrated')
        else:
            results['error'] = 'Data migration failed'
            return results
        
        # Step 4: Create missing tables
        if self.create_missing_tables():
            results['steps_completed'].append('missing_tables_created')
        else:
            results['error'] = 'Missing table creation failed'
            return results
        
        # Step 5: Create performance indexes
        if self.create_performance_indexes():
            results['steps_completed'].append('indexes_created')
        else:
            results['error'] = 'Index creation failed'
            return results
        
        # Step 6: Create triggers
        if self.create_triggers():
            results['steps_completed'].append('triggers_created')
        else:
            results['error'] = 'Trigger creation failed'
            return results
        
        # Step 7: Verify fix
        verification = self.verify_fix()
        results['verification'] = verification
        results['steps_completed'].append('fix_verified')
        
        results['completed_at'] = datetime.now().isoformat()
        results['success'] = verification.get('success', False)
        
        logger.info("Database schema fix completed!")
        return results


def main():
    """Main execution function"""
    import sys
    
    database_path = "agent_system.db"
    if len(sys.argv) > 1:
        database_path = sys.argv[1]
    
    fixer = DatabaseSchemaFixer(database_path)
    results = fixer.run_full_fix()
    
    print("\n" + "="*60)
    print("DATABASE SCHEMA FIX RESULTS")
    print("="*60)
    print(json.dumps(results, indent=2))
    
    if results.get('success'):
        print("\n✅ Database schema fix completed successfully!")
        print(f"📁 Backup created at: {results.get('backup_path')}")
        
        verification = results.get('verification', {})
        print(f"📊 Tables verified: {len(verification.get('tables', []))}")
        print(f"📝 Agentic sessions: {verification.get('agentic_sessions_count', 0)} records")  
        print(f"💬 Agentic messages: {verification.get('agentic_messages_count', 0)} records")
        print(f"👥 Users: {verification.get('users_count', 0)} records")
        
        if verification.get('foreign_key_violations', 0) == 0:
            print("✅ No foreign key violations found")
        else:
            print(f"⚠️  {verification.get('foreign_key_violations')} foreign key violations found")
        
    else:
        print(f"\n❌ Database schema fix failed: {results.get('error')}")
        if 'backup_path' in results:
            print(f"📁 Backup is available at: {results['backup_path']}")
        
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
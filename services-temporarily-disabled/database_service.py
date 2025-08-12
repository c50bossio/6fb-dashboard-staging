#!/usr/bin/env python3
"""
Database Service for 6FB AI Agent System
SQLite-based persistent storage for agent sessions, conversations, and analytics
"""

import sqlite3
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class DatabaseService:
    """Enhanced database service for agent coordination system"""
    
    def __init__(self, db_path: str = "database/agent_system.db"):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(exist_ok=True)
        self.init_database()
    
    def init_database(self):
        """Initialize all database tables"""
        with sqlite3.connect(self.db_path) as conn:
            # Agent sessions table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    session_title TEXT,
                    business_objective TEXT,
                    business_domain TEXT DEFAULT 'general',
                    priority TEXT DEFAULT 'medium',
                    status TEXT DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP
                )
            """)
            
            # Agent conversations table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_conversations (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    agent_id TEXT NOT NULL,
                    agent_name TEXT,
                    message_type TEXT NOT NULL, -- 'user_request', 'agent_response', 'system'
                    content TEXT NOT NULL,
                    metadata TEXT, -- JSON string
                    confidence_score REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES agent_sessions (id)
                )
            """)
            
            # Agent coordination history
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_coordination_history (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    request_type TEXT NOT NULL,
                    primary_agent TEXT NOT NULL,
                    supporting_agents TEXT, -- JSON array
                    coordination_workflow TEXT,
                    complexity TEXT,
                    business_objective TEXT,
                    priority TEXT,
                    success BOOLEAN DEFAULT 1,
                    execution_time_ms INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES agent_sessions (id)
                )
            """)
            
            # Agent performance metrics
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_performance_metrics (
                    id TEXT PRIMARY KEY,
                    agent_id TEXT NOT NULL,
                    metric_type TEXT NOT NULL, -- 'usage', 'success_rate', 'avg_confidence'
                    metric_value REAL NOT NULL,
                    time_period TEXT, -- 'daily', 'weekly', 'monthly'
                    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Business objectives tracking
            conn.execute("""
                CREATE TABLE IF NOT EXISTS business_objectives (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    description TEXT NOT NULL,
                    priority TEXT DEFAULT 'medium',
                    target_metrics TEXT, -- JSON object
                    current_progress TEXT, -- JSON object
                    related_agents TEXT, -- JSON array
                    status TEXT DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES agent_sessions (id)
                )
            """)
            
            # Agent handoffs tracking
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_handoffs (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    from_agent TEXT NOT NULL,
                    to_agent TEXT NOT NULL,
                    handoff_reason TEXT,
                    context_data TEXT, -- JSON object
                    business_context TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES agent_sessions (id)
                )
            """)
            
            conn.commit()
            logger.info("Database initialized successfully")
    
    def create_session(self, user_id: str, business_domain: str = "general", 
                      session_title: str = None, business_objective: str = None) -> str:
        """Create a new agent session"""
        session_id = str(uuid.uuid4())
        expires_at = datetime.now() + timedelta(hours=24)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO agent_sessions 
                (id, user_id, session_title, business_objective, business_domain, expires_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (session_id, user_id, session_title, business_objective, business_domain, expires_at))
            conn.commit()
        
        logger.info(f"Created session {session_id} for user {user_id}")
        return session_id
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session by ID"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM agent_sessions WHERE id = ?", (session_id,))
            row = cursor.fetchone()
            
            if row:
                return dict(row)
            return None
    
    def add_conversation_message(self, session_id: str, agent_id: str, agent_name: str,
                               message_type: str, content: str, metadata: Dict[str, Any] = None,
                               confidence_score: float = None) -> str:
        """Add a conversation message"""
        message_id = str(uuid.uuid4())
        metadata_json = json.dumps(metadata) if metadata else None
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO agent_conversations 
                (id, session_id, agent_id, agent_name, message_type, content, metadata, confidence_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (message_id, session_id, agent_id, agent_name, message_type, content, 
                  metadata_json, confidence_score))
            conn.commit()
        
        return message_id
    
    def record_coordination(self, session_id: str, request_type: str, primary_agent: str,
                          supporting_agents: List[str], coordination_workflow: str = None,
                          complexity: str = "moderate", business_objective: str = None,
                          priority: str = "medium", success: bool = True,
                          execution_time_ms: int = None) -> str:
        """Record agent coordination history"""
        coordination_id = str(uuid.uuid4())
        supporting_agents_json = json.dumps(supporting_agents)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO agent_coordination_history 
                (id, session_id, request_type, primary_agent, supporting_agents, 
                 coordination_workflow, complexity, business_objective, priority, 
                 success, execution_time_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (coordination_id, session_id, request_type, primary_agent, supporting_agents_json,
                  coordination_workflow, complexity, business_objective, priority, success, execution_time_ms))
            conn.commit()
        
        return coordination_id
    
    def get_session_conversations(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get conversation history for a session"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM agent_conversations 
                WHERE session_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            """, (session_id, limit))
            
            rows = cursor.fetchall()
            conversations = []
            for row in rows:
                conv = dict(row)
                if conv['metadata']:
                    conv['metadata'] = json.loads(conv['metadata'])
                conversations.append(conv)
            
            return conversations
    
    def get_coordination_history(self, user_id: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get coordination history"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            if user_id:
                cursor.execute("""
                    SELECT ch.*, s.user_id FROM agent_coordination_history ch
                    JOIN agent_sessions s ON ch.session_id = s.id
                    WHERE s.user_id = ?
                    ORDER BY ch.created_at DESC
                    LIMIT ?
                """, (user_id, limit))
            else:
                cursor.execute("""
                    SELECT * FROM agent_coordination_history
                    ORDER BY created_at DESC
                    LIMIT ?
                """, (limit,))
            
            rows = cursor.fetchall()
            history = []
            for row in rows:
                coord = dict(row)
                if coord['supporting_agents']:
                    coord['supporting_agents'] = json.loads(coord['supporting_agents'])
                history.append(coord)
            
            return history
    
    def get_agent_usage_stats(self, days: int = 30) -> Dict[str, Any]:
        """Get agent usage statistics"""
        cutoff_date = datetime.now() - timedelta(days=days)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Primary agent usage
            cursor.execute("""
                SELECT primary_agent, COUNT(*) as usage_count
                FROM agent_coordination_history
                WHERE created_at > ?
                GROUP BY primary_agent
                ORDER BY usage_count DESC
            """, (cutoff_date,))
            primary_usage = dict(cursor.fetchall())
            
            # Supporting agent usage
            cursor.execute("""
                SELECT supporting_agents
                FROM agent_coordination_history
                WHERE created_at > ? AND supporting_agents IS NOT NULL
            """, (cutoff_date,))
            
            supporting_usage = {}
            for row in cursor.fetchall():
                agents = json.loads(row[0])
                for agent in agents:
                    supporting_usage[agent] = supporting_usage.get(agent, 0) + 1
            
            # Success rates
            cursor.execute("""
                SELECT primary_agent, 
                       AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END) as success_rate,
                       COUNT(*) as total_requests
                FROM agent_coordination_history
                WHERE created_at > ?
                GROUP BY primary_agent
            """, (cutoff_date,))
            success_rates = {row[0]: {"success_rate": row[1], "total_requests": row[2]} 
                           for row in cursor.fetchall()}
            
            # Complexity distribution
            cursor.execute("""
                SELECT complexity, COUNT(*) as count
                FROM agent_coordination_history
                WHERE created_at > ?
                GROUP BY complexity
            """, (cutoff_date,))
            complexity_dist = dict(cursor.fetchall())
            
            return {
                "primary_agent_usage": primary_usage,
                "supporting_agent_usage": supporting_usage,
                "success_rates": success_rates,
                "complexity_distribution": complexity_dist,
                "total_coordinations": sum(primary_usage.values()),
                "date_range_days": days
            }
    
    def cleanup_expired_sessions(self):
        """Clean up expired sessions and related data"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Get expired session IDs
            cursor.execute("""
                SELECT id FROM agent_sessions 
                WHERE expires_at < CURRENT_TIMESTAMP
            """)
            expired_sessions = [row[0] for row in cursor.fetchall()]
            
            if expired_sessions:
                placeholders = ','.join(['?'] * len(expired_sessions))
                
                # Delete related data
                cursor.execute(f"""
                    DELETE FROM agent_conversations 
                    WHERE session_id IN ({placeholders})
                """, expired_sessions)
                
                cursor.execute(f"""
                    DELETE FROM agent_coordination_history 
                    WHERE session_id IN ({placeholders})
                """, expired_sessions)
                
                cursor.execute(f"""
                    DELETE FROM business_objectives 
                    WHERE session_id IN ({placeholders})
                """, expired_sessions)
                
                cursor.execute(f"""
                    DELETE FROM agent_handoffs 
                    WHERE session_id IN ({placeholders})
                """, expired_sessions)
                
                # Delete expired sessions
                cursor.execute(f"""
                    DELETE FROM agent_sessions 
                    WHERE id IN ({placeholders})
                """, expired_sessions)
                
                conn.commit()
                logger.info(f"Cleaned up {len(expired_sessions)} expired sessions")
    
    def get_system_analytics(self) -> Dict[str, Any]:
        """Get comprehensive system analytics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Basic counts
            cursor.execute("SELECT COUNT(*) FROM agent_sessions")
            total_sessions = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM agent_conversations")
            total_conversations = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM agent_coordination_history")
            total_coordinations = cursor.fetchone()[0]
            
            # Active sessions
            cursor.execute("""
                SELECT COUNT(*) FROM agent_sessions 
                WHERE status = 'active' AND expires_at > CURRENT_TIMESTAMP
            """)
            active_sessions = cursor.fetchone()[0]
            
            # Recent activity (last 24 hours)
            cursor.execute("""
                SELECT COUNT(*) FROM agent_coordination_history
                WHERE created_at > datetime('now', '-1 day')
            """)
            recent_coordinations = cursor.fetchone()[0]
            
            return {
                "total_sessions": total_sessions,
                "active_sessions": active_sessions,
                "total_conversations": total_conversations,
                "total_coordinations": total_coordinations,
                "recent_coordinations_24h": recent_coordinations,
                "database_path": str(self.db_path),
                "last_updated": datetime.now().isoformat()
            }

# Global database service instance
db_service = DatabaseService()
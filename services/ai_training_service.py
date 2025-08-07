"""
AI Training Service for Custom Knowledge Integration
Allows training the AI with your specific barbershop data and methodologies
"""

import json
import os
from typing import List, Dict, Any
from datetime import datetime
import sqlite3
from contextlib import contextmanager

class AITrainingService:
    def __init__(self, db_path="data/6fb_agent_system.db"):
        self.db_path = db_path
        self.knowledge_dir = "data/knowledge"
        os.makedirs(self.knowledge_dir, exist_ok=True)
        self._init_training_tables()
    
    @contextmanager
    def get_db(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def _init_training_tables(self):
        """Initialize training data tables"""
        with self.get_db() as conn:
            # Custom knowledge base
            conn.execute("""
                CREATE TABLE IF NOT EXISTS knowledge_base (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    metadata TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Training examples from user interactions
            conn.execute("""
                CREATE TABLE IF NOT EXISTS training_examples (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    category TEXT,
                    effectiveness_score FLOAT DEFAULT 0.0,
                    verified BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Custom prompts and methodologies
            conn.execute("""
                CREATE TABLE IF NOT EXISTS custom_prompts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    agent_id TEXT NOT NULL,
                    prompt_type TEXT NOT NULL,
                    prompt_text TEXT NOT NULL,
                    active BOOLEAN DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
    
    def add_knowledge(self, category: str, title: str, content: str, metadata: Dict = None) -> int:
        """Add knowledge to the database"""
        with self.get_db() as conn:
            cursor = conn.execute(
                """INSERT INTO knowledge_base (category, title, content, metadata)
                   VALUES (?, ?, ?, ?)""",
                (category, title, content, json.dumps(metadata or {}))
            )
            conn.commit()
            return cursor.lastrowid
    
    def add_training_example(self, question: str, answer: str, category: str = None, 
                           user_id: int = None, effectiveness: float = 0.0) -> int:
        """Add a training example from successful interactions"""
        with self.get_db() as conn:
            cursor = conn.execute(
                """INSERT INTO training_examples 
                   (user_id, question, answer, category, effectiveness_score)
                   VALUES (?, ?, ?, ?, ?)""",
                (user_id, question, answer, category, effectiveness)
            )
            conn.commit()
            return cursor.lastrowid
    
    def get_relevant_knowledge(self, query: str, category: str = None, limit: int = 5) -> List[Dict]:
        """Retrieve relevant knowledge for a query"""
        with self.get_db() as conn:
            if category:
                cursor = conn.execute(
                    """SELECT * FROM knowledge_base 
                       WHERE category = ? 
                       ORDER BY updated_at DESC LIMIT ?""",
                    (category, limit)
                )
            else:
                # Simple keyword search - in production, use vector similarity
                cursor = conn.execute(
                    """SELECT * FROM knowledge_base 
                       WHERE content LIKE ? OR title LIKE ?
                       ORDER BY updated_at DESC LIMIT ?""",
                    (f"%{query}%", f"%{query}%", limit)
                )
            
            return [dict(row) for row in cursor.fetchall()]
    
    def get_training_examples(self, category: str = None, verified_only: bool = True) -> List[Dict]:
        """Get training examples for fine-tuning"""
        with self.get_db() as conn:
            query = "SELECT * FROM training_examples WHERE 1=1"
            params = []
            
            if category:
                query += " AND category = ?"
                params.append(category)
            
            if verified_only:
                query += " AND verified = 1"
            
            query += " ORDER BY effectiveness_score DESC"
            
            cursor = conn.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
    
    def update_custom_prompt(self, agent_id: str, prompt_type: str, prompt_text: str):
        """Update custom prompts for specific agents"""
        with self.get_db() as conn:
            # Deactivate old prompts
            conn.execute(
                """UPDATE custom_prompts 
                   SET active = 0 
                   WHERE agent_id = ? AND prompt_type = ?""",
                (agent_id, prompt_type)
            )
            
            # Add new prompt
            conn.execute(
                """INSERT INTO custom_prompts (agent_id, prompt_type, prompt_text)
                   VALUES (?, ?, ?)""",
                (agent_id, prompt_type, prompt_text)
            )
            conn.commit()
    
    def get_custom_prompt(self, agent_id: str, prompt_type: str = "system") -> str:
        """Get active custom prompt for an agent"""
        with self.get_db() as conn:
            cursor = conn.execute(
                """SELECT prompt_text FROM custom_prompts 
                   WHERE agent_id = ? AND prompt_type = ? AND active = 1
                   ORDER BY created_at DESC LIMIT 1""",
                (agent_id, prompt_type)
            )
            row = cursor.fetchone()
            return row["prompt_text"] if row else None
    
    def import_csv_knowledge(self, csv_path: str, category: str):
        """Import knowledge from CSV file"""
        import csv
        
        with open(csv_path, 'r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                self.add_knowledge(
                    category=category,
                    title=row.get('title', 'Imported Knowledge'),
                    content=json.dumps(row),
                    metadata={'source': 'csv_import', 'file': csv_path}
                )
    
    def export_training_data(self, output_path: str):
        """Export training data for fine-tuning"""
        examples = self.get_training_examples(verified_only=True)
        
        # Format for OpenAI fine-tuning
        training_data = []
        for example in examples:
            training_data.append({
                "messages": [
                    {"role": "system", "content": "You are a helpful barbershop business advisor."},
                    {"role": "user", "content": example['question']},
                    {"role": "assistant", "content": example['answer']}
                ]
            })
        
        with open(output_path, 'w') as f:
            for item in training_data:
                f.write(json.dumps(item) + '\n')
    
    def calculate_knowledge_stats(self) -> Dict:
        """Get statistics about the knowledge base"""
        with self.get_db() as conn:
            stats = {}
            
            # Knowledge base stats
            cursor = conn.execute("SELECT COUNT(*) as count, category FROM knowledge_base GROUP BY category")
            stats['knowledge_by_category'] = {row['category']: row['count'] for row in cursor.fetchall()}
            
            # Training examples stats
            cursor = conn.execute("SELECT COUNT(*) as total, AVG(effectiveness_score) as avg_score FROM training_examples")
            row = cursor.fetchone()
            stats['training_examples'] = {
                'total': row['total'],
                'average_effectiveness': round(row['avg_score'] or 0, 2)
            }
            
            # Custom prompts
            cursor = conn.execute("SELECT COUNT(*) as count FROM custom_prompts WHERE active = 1")
            stats['active_custom_prompts'] = cursor.fetchone()['count']
            
            return stats

# Example usage functions
def setup_barbershop_knowledge():
    """Example: Set up initial barbershop knowledge"""
    service = AITrainingService()
    
    # Add pricing knowledge
    service.add_knowledge(
        category="pricing",
        title="Standard Pricing Guide",
        content="""
        Basic Haircut: $25
        Beard Trim: $15
        Hair + Beard Combo: $35
        Premium Cut with Hot Towel: $40
        Kids Cut (under 12): $18
        Senior Discount: 10% off
        """,
        metadata={"type": "price_list", "version": "2024"}
    )
    
    # Add service standards
    service.add_knowledge(
        category="service_standards",
        title="Customer Service Protocol",
        content="""
        1. Greet customer within 30 seconds of entry
        2. Offer complimentary beverage
        3. Consult on desired style with visual aids
        4. Provide accurate wait times
        5. Follow up with aftercare instructions
        """,
        metadata={"type": "sop", "priority": "high"}
    )
    
    # Add marketing strategies
    service.add_knowledge(
        category="marketing",
        title="Proven Marketing Strategies",
        content="""
        - Tuesday/Wednesday promotions (20% off) to fill slow days
        - Loyalty card: 10th cut free
        - Referral program: $5 off for both parties
        - Social media: Before/after photos 3x weekly
        - Partner with local businesses for cross-promotion
        """,
        metadata={"type": "strategy", "success_rate": "high"}
    )
    
    # Update custom prompts
    service.update_custom_prompt(
        agent_id="business_coach",
        prompt_type="system",
        prompt_text="""You are an expert business coach specialized in barbershops. 
        You have access to specific knowledge about our pricing, service standards, and proven strategies.
        Always reference our actual prices and policies when giving advice.
        Our barbershop values: Quality, Community, and Consistency."""
    )

if __name__ == "__main__":
    # Initialize knowledge base
    setup_barbershop_knowledge()
    
    # Show stats
    service = AITrainingService()
    stats = service.calculate_knowledge_stats()
    print("Knowledge Base Statistics:", json.dumps(stats, indent=2))
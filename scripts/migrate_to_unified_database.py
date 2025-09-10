#!/usr/bin/env python3
"""
Database Migration Script: SQLite to Unified Supabase
Migrates all SQLite data to the unified Supabase PostgreSQL database
"""

import asyncio
import sqlite3
import json
import logging
import os
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional
import uuid

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from lib.supabase_client import get_supabase_client, DatabaseResult

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DatabaseMigrator:
    """Migrates data from SQLite databases to unified Supabase"""
    
    def __init__(self):
        self.supabase_client = get_supabase_client()
        self.migration_stats = {
            'ai_insights': {'migrated': 0, 'errors': 0},
            'insight_metrics': {'migrated': 0, 'errors': 0},
            'knowledge_documents': {'migrated': 0, 'errors': 0},
            'business_recommendations': {'migrated': 0, 'errors': 0}
        }
        
    async def run_full_migration(self):
        """Run the complete migration process"""
        logger.info("🚀 Starting full database migration to Supabase...")
        
        # Step 1: Deploy schema to Supabase (manual step - inform user)
        await self._inform_schema_deployment()
        
        # Step 2: Migrate AI insights data
        await self.migrate_ai_insights()
        
        # Step 3: Migrate knowledge documents  
        await self.migrate_knowledge_documents()
        
        # Step 4: Migrate business recommendations
        await self.migrate_business_recommendations()
        
        # Step 5: Initialize sample knowledge if empty
        await self.initialize_sample_knowledge()
        
        # Step 6: Summary
        self.print_migration_summary()
        
    async def _inform_schema_deployment(self):
        """Inform user about schema deployment requirement"""
        logger.info("📋 MANUAL STEP REQUIRED:")
        logger.info("   Before migrating data, deploy the unified schema to Supabase:")
        logger.info("   1. Open Supabase dashboard: https://supabase.com/dashboard")
        logger.info("   2. Go to SQL Editor")
        logger.info("   3. Run the schema file: database/unified-ai-schema.sql")
        logger.info("   4. Verify tables are created successfully")
        
        response = input("\n✅ Have you deployed the schema to Supabase? (y/N): ")
        if response.lower() != 'y':
            logger.info("⏸️  Migration paused. Please deploy the schema first.")
            exit(0)
            
    async def migrate_ai_insights(self):
        """Migrate AI insights from SQLite to Supabase"""
        logger.info("📊 Migrating AI insights...")
        
        sqlite_path = "./data/ai_insights.db"
        if not os.path.exists(sqlite_path):
            logger.warning(f"⚠️  AI insights database not found: {sqlite_path}")
            return
        
        try:
            conn = sqlite3.connect(sqlite_path)
            cursor = conn.cursor()
            
            # Get AI insights
            cursor.execute("SELECT * FROM ai_insights")
            rows = cursor.fetchall()
            columns = [description[0] for description in cursor.description]
            
            for row in rows:
                try:
                    data = dict(zip(columns, row))
                    
                    # Convert data format for Supabase
                    supabase_data = {
                        'barbershop_id': 'default-barbershop-id',  # Assign to default barbershop
                        'type': data['type'],
                        'title': data['title'],
                        'description': data['description'],
                        'recommendation': data['recommendation'],
                        'confidence': float(data['confidence']),
                        'impact_score': float(data['impact_score']),
                        'urgency': data['urgency'],
                        'data_points': json.loads(data['data_points']) if data['data_points'] else {},
                        'metadata': json.loads(data['metadata']) if data['metadata'] else {},
                        'is_active': bool(data['is_active']),
                        'expires_at': data['expires_at']
                    }
                    
                    result = await self.supabase_client.execute_query(
                        table_name='ai_insights',
                        operation='insert',
                        data=supabase_data
                    )
                    
                    if result.success:
                        self.migration_stats['ai_insights']['migrated'] += 1
                    else:
                        logger.error(f"Failed to migrate insight {data['id']}: {result.error}")
                        self.migration_stats['ai_insights']['errors'] += 1
                        
                except Exception as e:
                    logger.error(f"Error migrating insight: {e}")
                    self.migration_stats['ai_insights']['errors'] += 1
            
            # Migrate insight metrics
            cursor.execute("SELECT * FROM insight_metrics")
            metric_rows = cursor.fetchall()
            metric_columns = [description[0] for description in cursor.description]
            
            for row in metric_rows:
                try:
                    data = dict(zip(metric_columns, row))
                    
                    # Note: We'll need to map insight_id to the new UUID format
                    # For now, we'll skip metrics migration or create dummy entries
                    logger.warning(f"⚠️  Skipping insight metric migration (ID mapping required)")
                    
                except Exception as e:
                    logger.error(f"Error migrating insight metric: {e}")
                    self.migration_stats['insight_metrics']['errors'] += 1
            
            conn.close()
            logger.info(f"✅ AI insights migration completed: {self.migration_stats['ai_insights']['migrated']} migrated, {self.migration_stats['ai_insights']['errors']} errors")
            
        except Exception as e:
            logger.error(f"❌ AI insights migration failed: {e}")
    
    async def migrate_knowledge_documents(self):
        """Migrate knowledge documents from SQLite to Supabase"""
        logger.info("📚 Migrating knowledge documents...")
        
        sqlite_path = "./data/vector_knowledge.db"
        if not os.path.exists(sqlite_path):
            logger.warning(f"⚠️  Knowledge database not found: {sqlite_path}")
            return
        
        try:
            conn = sqlite3.connect(sqlite_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM knowledge_documents")
            rows = cursor.fetchall()
            columns = [description[0] for description in cursor.description]
            
            for row in rows:
                try:
                    data = dict(zip(columns, row))
                    
                    # Convert embedding from BLOB to list if present
                    embedding = None
                    if data['embedding']:
                        # Skip embedding for now - we'll regenerate them
                        logger.info(f"⚠️  Skipping embedding for {data['title']} - will regenerate")
                    
                    supabase_data = {
                        'title': data['title'],
                        'content': data['content'],
                        'knowledge_type': data['knowledge_type'],
                        'source': data['source'],
                        'metadata': json.loads(data['metadata']) if data['metadata'] else {},
                        'embedding': embedding,
                        'is_active': True
                    }
                    
                    result = await self.supabase_client.execute_query(
                        table_name='knowledge_documents',
                        operation='insert',
                        data=supabase_data
                    )
                    
                    if result.success:
                        self.migration_stats['knowledge_documents']['migrated'] += 1
                    else:
                        logger.error(f"Failed to migrate document {data['id']}: {result.error}")
                        self.migration_stats['knowledge_documents']['errors'] += 1
                        
                except Exception as e:
                    logger.error(f"Error migrating knowledge document: {e}")
                    self.migration_stats['knowledge_documents']['errors'] += 1
            
            conn.close()
            logger.info(f"✅ Knowledge documents migration completed: {self.migration_stats['knowledge_documents']['migrated']} migrated, {self.migration_stats['knowledge_documents']['errors']} errors")
            
        except Exception as e:
            logger.error(f"❌ Knowledge documents migration failed: {e}")
    
    async def migrate_business_recommendations(self):
        """Migrate business recommendations from SQLite to Supabase"""
        logger.info("💼 Migrating business recommendations...")
        
        sqlite_path = "./database/agent_system.db"
        if not os.path.exists(sqlite_path):
            logger.warning(f"⚠️  Agent system database not found: {sqlite_path}")
            return
        
        try:
            conn = sqlite3.connect(sqlite_path)
            cursor = conn.cursor()
            
            # Check if table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='business_recommendations'")
            if not cursor.fetchone():
                logger.warning("⚠️  No business_recommendations table found in agent_system.db")
                conn.close()
                return
            
            cursor.execute("SELECT * FROM business_recommendations")
            rows = cursor.fetchall()
            columns = [description[0] for description in cursor.description]
            
            for row in rows:
                try:
                    data = dict(zip(columns, row))
                    
                    supabase_data = {
                        'barbershop_id': data['barbershop_id'] or 'default-barbershop-id',
                        'agent_type': 'master_coach',  # Default agent type
                        'title': f"Business Recommendation {data['id']}",
                        'recommendations_data': json.loads(data['recommendations_data']) if data['recommendations_data'] else {},
                        'confidence_score': float(data.get('confidence_score', 0.8)),
                        'implementation_status': data.get('implementation_status', 'pending'),
                        'priority': 5,  # Default priority
                        'generated_at': data.get('created_at', datetime.now().isoformat())
                    }
                    
                    result = await self.supabase_client.execute_query(
                        table_name='business_recommendations',
                        operation='insert',
                        data=supabase_data
                    )
                    
                    if result.success:
                        self.migration_stats['business_recommendations']['migrated'] += 1
                    else:
                        logger.error(f"Failed to migrate recommendation {data['id']}: {result.error}")
                        self.migration_stats['business_recommendations']['errors'] += 1
                        
                except Exception as e:
                    logger.error(f"Error migrating business recommendation: {e}")
                    self.migration_stats['business_recommendations']['errors'] += 1
            
            conn.close()
            logger.info(f"✅ Business recommendations migration completed: {self.migration_stats['business_recommendations']['migrated']} migrated, {self.migration_stats['business_recommendations']['errors']} errors")
            
        except Exception as e:
            logger.error(f"❌ Business recommendations migration failed: {e}")
    
    async def initialize_sample_knowledge(self):
        """Initialize the knowledge base with sample documents if empty"""
        logger.info("📖 Checking if knowledge base needs sample data...")
        
        try:
            # Check if we have any knowledge documents
            result = await self.supabase_client.get_table_count('knowledge_documents')
            
            if result.success and result.count == 0:
                logger.info("📝 Knowledge base is empty, adding sample documents...")
                
                sample_documents = [
                    {
                        'title': 'Six Figure Barber Methodology Overview',
                        'content': """
                        The Six Figure Barber methodology focuses on premium service delivery, customer relationship building, and strategic business growth. 
                        Key principles include: 1) Excellence in craft execution, 2) Premium pricing strategies, 3) Customer lifetime value optimization, 
                        4) Operational efficiency, 5) Brand building and marketing.
                        """,
                        'knowledge_type': 'business_methodology',
                        'source': 'Six Figure Barber Core Manual',
                        'metadata': {'version': '2.0', 'category': 'foundational', 'priority': 'high'},
                        'is_active': True
                    },
                    {
                        'title': 'Customer Retention Best Practices',
                        'content': """
                        Effective customer retention strategies: 1) Personalized service experiences, 2) Consistent quality delivery, 
                        3) Follow-up communications, 4) Loyalty programs, 5) Feedback collection and implementation, 
                        6) Value-added services, 7) Relationship building beyond transactions.
                        """,
                        'knowledge_type': 'customer_service',
                        'source': 'Customer Success Playbook',
                        'metadata': {'version': '1.5', 'category': 'operations', 'priority': 'high'},
                        'is_active': True
                    },
                    {
                        'title': 'Revenue Optimization Strategies',
                        'content': """
                        Maximize barbershop revenue through: 1) Premium service upselling, 2) Product sales integration, 
                        3) Peak hour pricing, 4) Package deals and memberships, 5) Referral incentive programs, 
                        6) Seasonal promotions, 7) Corporate partnerships.
                        """,
                        'knowledge_type': 'financial_guideline',
                        'source': 'Financial Excellence Manual',
                        'metadata': {'version': '2.1', 'category': 'revenue', 'priority': 'high'},
                        'is_active': True
                    }
                ]
                
                for doc in sample_documents:
                    result = await self.supabase_client.execute_query(
                        table_name='knowledge_documents',
                        operation='insert',
                        data=doc
                    )
                    
                    if result.success:
                        logger.info(f"✅ Added sample document: {doc['title']}")
                    else:
                        logger.error(f"❌ Failed to add sample document: {result.error}")
            else:
                logger.info(f"📚 Knowledge base already has {result.count} documents")
                
        except Exception as e:
            logger.error(f"❌ Error initializing sample knowledge: {e}")
    
    def print_migration_summary(self):
        """Print migration summary"""
        logger.info("\n" + "="*60)
        logger.info("📊 MIGRATION SUMMARY")
        logger.info("="*60)
        
        total_migrated = sum(stats['migrated'] for stats in self.migration_stats.values())
        total_errors = sum(stats['errors'] for stats in self.migration_stats.values())
        
        for table, stats in self.migration_stats.items():
            status = "✅" if stats['errors'] == 0 else "⚠️"
            logger.info(f"{status} {table.replace('_', ' ').title()}: {stats['migrated']} migrated, {stats['errors']} errors")
        
        logger.info("-" * 60)
        logger.info(f"📈 TOTAL: {total_migrated} records migrated, {total_errors} errors")
        
        if total_errors == 0:
            logger.info("🎉 Migration completed successfully!")
        else:
            logger.info(f"⚠️  Migration completed with {total_errors} errors (check logs)")
        
        logger.info("\n🚀 Next Steps:")
        logger.info("1. Update services to use the Supabase versions")
        logger.info("2. Test the unified database architecture") 
        logger.info("3. Update documentation")
        logger.info("="*60)

    async def test_migration_results(self):
        """Test the migrated data in Supabase"""
        logger.info("🧪 Testing migrated data...")
        
        try:
            # Test AI insights
            insights_result = await self.supabase_client.get_table_count('ai_insights')
            logger.info(f"✅ AI insights count: {insights_result.count}")
            
            # Test knowledge documents
            docs_result = await self.supabase_client.get_table_count('knowledge_documents')
            logger.info(f"✅ Knowledge documents count: {docs_result.count}")
            
            # Test business recommendations
            recs_result = await self.supabase_client.get_table_count('business_recommendations')
            logger.info(f"✅ Business recommendations count: {recs_result.count}")
            
            logger.info("🎯 Migration test completed!")
            
        except Exception as e:
            logger.error(f"❌ Migration test failed: {e}")

async def main():
    """Main migration function"""
    try:
        migrator = DatabaseMigrator()
        
        # Test Supabase connection first
        health = await migrator.supabase_client.health_check()
        if not health.success:
            logger.error(f"❌ Supabase connection failed: {health.error}")
            return
        
        logger.info("✅ Supabase connection verified")
        
        # Run migration
        await migrator.run_full_migration()
        
        # Test results
        await migrator.test_migration_results()
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())
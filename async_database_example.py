#!/usr/bin/env python3
"""
Example usage of the production-ready async database connection pool system.
Demonstrates proper connection management, repository usage, and error handling.
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, Any

# Import database components
from database import (
    ConnectionPoolConfig,
    initialize_database,
    health_check_database,
    get_database_info,
    optimize_database,
    get_user_repository,
    get_session_repository,
    get_message_repository,
    get_insights_repository,
    database_transaction
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def demonstrate_connection_pool():
    """Demonstrate async database connection pool initialization and configuration"""
    print("\n🔧 === Database Connection Pool Demo ===")
    
    # Configure connection pool with production settings
    config = ConnectionPoolConfig(
        database_path="demo_agent_system.db",
        max_connections=10,
        min_connections=3,
        connection_timeout=30.0,
        idle_timeout=300.0,
        enable_wal=True,
        enable_foreign_keys=True,
        journal_mode="WAL",
        synchronous="NORMAL",
        cache_size=-32000,  # 32MB cache for demo
        busy_timeout=15000  # 15 seconds
    )
    
    # Initialize database with connection pool
    print("Initializing database with connection pool...")
    success = await initialize_database("demo_agent_system.db", config)
    
    if success:
        print("✅ Database initialized successfully")
        
        # Get database info
        db_info = await get_database_info("demo_agent_system.db")
        print(f"📊 Database size: {db_info.get('file_size_mb', 0)} MB")
        print(f"📄 Journal mode: {db_info.get('journal_mode', 'unknown')}")
        print(f"🔢 Total tables: {len(db_info.get('tables', {}))}")
        
        # Health check
        health = await health_check_database("demo_agent_system.db")
        print(f"❤️  Database healthy: {health.get('healthy', False)}")
        print(f"⏱️  Response time: {health.get('response_time_seconds', 0):.3f}s")
        
    else:
        print("❌ Database initialization failed")
        return False
    
    return True


async def demonstrate_user_operations():
    """Demonstrate async user repository operations"""
    print("\n👤 === User Repository Demo ===")
    
    user_repo = await get_user_repository()
    
    # Create a test user
    print("Creating test user...")
    create_result = await user_repo.create_user(
        email="demo@barbershop.com",
        hashed_password="hashed_password_123",
        full_name="Demo Barber",
        barbershop_name="Demo Barbershop"
    )
    
    if create_result.success:
        user_id = create_result.last_insert_id
        print(f"✅ User created with ID: {user_id}")
        
        # Get user by email
        email_result = await user_repo.get_user_by_email("demo@barbershop.com")
        if email_result.success:
            user_data = email_result.data
            print(f"📧 Retrieved user: {user_data['full_name']} ({user_data['email']})")
            print(f"🏪 Barbershop: {user_data['barbershop_name']}")
            print(f"🆔 Barbershop ID: {user_data['barbershop_id']}")
        
        # Update user
        update_result = await user_repo.update_user(user_id, {"full_name": "Updated Demo Barber"})
        if update_result.success:
            print("✅ User updated successfully")
        
        # Get all active users
        all_users_result = await user_repo.get_all_active_users()
        if all_users_result.success:
            print(f"👥 Total active users: {len(all_users_result.data)}")
        
        return user_id
    else:
        print(f"❌ User creation failed: {create_result.error}")
        return None


async def demonstrate_session_operations(user_id: int):
    """Demonstrate async session repository operations"""
    print("\n💬 === Session Repository Demo ===")
    
    session_repo = await get_session_repository()
    message_repo = await get_message_repository()
    
    session_id = f"demo_session_{int(datetime.now().timestamp())}"
    
    # Create shop context
    shop_context = {
        "shop_id": f"shop_{user_id}",
        "owner_name": "Demo Barber",
        "shop_name": "Demo Barbershop",
        "business_stage": "GROWTH",
        "monthly_revenue": 15000.0,
        "staff_count": 3,
        "location_type": "urban"
    }
    
    # Create session
    print("Creating agentic session...")
    session_result = await session_repo.create_or_update_session(
        session_id=session_id,
        user_id=user_id,
        shop_context=shop_context,
        conversation_history=[],
        ongoing_projects=["Increase customer retention", "Optimize scheduling"],
        goals=["Grow revenue by 20%", "Hire additional staff"],
        pain_points=["Slow periods during weekdays", "Customer no-shows"]
    )
    
    if session_result.success:
        print(f"✅ Session created: {session_id}")
        
        # Add some messages
        messages = [
            ("user", "How can I improve my barbershop's revenue?"),
            ("assistant", "Based on your shop context, I recommend focusing on customer retention and optimizing your pricing strategy."),
            ("user", "What about marketing strategies?"),
            ("assistant", "Consider implementing a referral program and improving your online presence through social media marketing.")
        ]
        
        print("Adding conversation messages...")
        for role, content in messages:
            message_result = await message_repo.save_message(
                session_id=session_id,
                role=role,
                content=content,
                domains_addressed=["revenue_optimization", "marketing"] if role == "assistant" else None,
                confidence=0.85 if role == "assistant" else None,
                urgency="medium" if role == "assistant" else None,
                requires_data=False
            )
            
            if message_result.success:
                print(f"💬 Added {role} message")
        
        # Get conversation history
        history_result = await message_repo.get_session_messages(session_id)
        if history_result.success:
            print(f"📚 Retrieved {len(history_result.data)} messages from conversation")
        
        return session_id
    else:
        print(f"❌ Session creation failed: {session_result.error}")
        return None


async def demonstrate_learning_insights():
    """Demonstrate async learning insights operations"""
    print("\n🧠 === Learning Insights Demo ===")
    
    insights_repo = await get_insights_repository()
    
    # Save some learning insights
    insights_data = [
        {
            "shop_profile": "urban_growth_3staff",
            "question_domain": "revenue_optimization",
            "question_pattern": "revenue improvement strategies",
            "recommendation_success": {"strategy": "referral_program", "success_rate": 0.78},
            "conversation_context": {"shop_size": "medium", "location": "urban"}
        },
        {
            "shop_profile": "urban_growth_3staff", 
            "question_domain": "marketing",
            "question_pattern": "social media marketing",
            "recommendation_success": {"strategy": "instagram_promotion", "success_rate": 0.65},
            "conversation_context": {"target_audience": "young_professionals"}
        }
    ]
    
    print("Saving learning insights...")
    for insight in insights_data:
        result = await insights_repo.save_insight(**insight)
        if result.success:
            print(f"🧠 Saved insight for {insight['question_domain']}")
    
    # Retrieve insights by profile
    profile_insights = await insights_repo.get_insights_by_profile("urban_growth_3staff")
    if profile_insights.success:
        print(f"📊 Found {len(profile_insights.data)} insights for shop profile")
    
    # Retrieve insights by domain
    domain_insights = await insights_repo.get_insights_by_domain("revenue_optimization")
    if domain_insights.success:
        print(f"💰 Found {len(domain_insights.data)} revenue optimization insights")


async def demonstrate_transaction_usage():
    """Demonstrate database transactions with multiple repositories"""
    print("\n🔄 === Database Transaction Demo ===")
    
    try:
        async with database_transaction() as repos:
            print("Starting transaction with multiple repositories...")
            
            # Create user
            user_result = await repos['users'].create_user(
                email="transaction@demo.com",
                hashed_password="hashed_pass",
                full_name="Transaction Demo User",
                barbershop_name="Transaction Demo Shop"
            )
            
            if not user_result.success:
                raise Exception(f"User creation failed: {user_result.error}")
            
            user_id = user_result.last_insert_id
            session_id = f"transaction_demo_{user_id}"
            
            # Create session
            session_result = await repos['sessions'].create_or_update_session(
                session_id=session_id,
                user_id=user_id,
                shop_context={"shop_id": f"shop_{user_id}", "demo": True},
                conversation_history=[]
            )
            
            if not session_result.success:
                raise Exception(f"Session creation failed: {session_result.error}")
            
            # Add message
            message_result = await repos['messages'].save_message(
                session_id=session_id,
                role="user",
                content="This is a transaction demo message"
            )
            
            if not message_result.success:
                raise Exception(f"Message save failed: {message_result.error}")
            
            # Save learning insight  
            insight_result = await repos['insights'].save_insight(
                shop_profile="demo_transaction",
                question_domain="demo",
                question_pattern="transaction_test"
            )
            
            if not insight_result.success:
                raise Exception(f"Insight save failed: {insight_result.error}")
            
            print("✅ Transaction completed successfully")
            print(f"   - Created user ID: {user_id}")
            print(f"   - Created session: {session_id}")
            print("   - Added message and insight")
            
    except Exception as e:
        print(f"❌ Transaction failed: {e}")


async def demonstrate_connection_pool_stats():
    """Demonstrate connection pool monitoring and statistics"""
    print("\n📊 === Connection Pool Statistics ===")
    
    try:
        from database.async_connection_pool import get_connection_pool
        
        pool = get_connection_pool()
        
        # Get pool statistics
        stats = pool.get_stats()
        print(f"🔗 Pool size: {stats['pool_size']}")
        print(f"📈 Connections created: {stats['connections_created']}")
        print(f"📉 Connections destroyed: {stats['connections_destroyed']}")
        print(f"⚡ Connections in use: {stats['connections_in_use']}")
        print(f"📊 Total queries: {stats['total_queries']}")
        print(f"❌ Failed queries: {stats['failed_queries']}")
        print(f"⏳ Pool waits: {stats['pool_waits']}")
        
        # Health check
        health = await pool.health_check()
        print(f"❤️  Pool healthy: {health['healthy']}")
        print(f"🔢 Healthy connections: {health['healthy_connections']}/{health['total_connections']}")
        
    except Exception as e:
        print(f"❌ Could not get pool stats: {e}")


async def demonstrate_database_optimization():
    """Demonstrate database optimization features"""
    print("\n⚡ === Database Optimization Demo ===")
    
    # Optimize database
    print("Running database optimization...")
    optimization_result = await optimize_database("demo_agent_system.db")
    
    if optimization_result.get('success', False):
        print("✅ Database optimization completed")
        operations = optimization_result.get('operations', {})
        for operation, status in operations.items():
            print(f"   - {operation}: {status}")
    else:
        print(f"❌ Optimization failed: {optimization_result.get('error', 'unknown')}")


async def cleanup_demo():
    """Clean up demo resources"""
    print("\n🧹 === Cleanup ===")
    
    try:
        from database.async_connection_pool import close_connection_pool
        await close_connection_pool()
        print("✅ Connection pool closed")
        
        # Remove demo database file
        import os
        if os.path.exists("demo_agent_system.db"):
            os.remove("demo_agent_system.db")
            print("✅ Demo database file removed")
            
    except Exception as e:
        print(f"⚠️  Cleanup warning: {e}")


async def main():
    """Run the complete async database demonstration"""
    print("🚀 === Async Database Connection Pool Demo ===")
    print("Demonstrating production-ready async database operations with:")
    print("  - SQLite WAL mode")
    print("  - Connection pooling")
    print("  - Repository pattern")
    print("  - Transaction management")
    print("  - Health monitoring")
    print("  - Performance optimization")
    
    try:
        # Initialize database
        if not await demonstrate_connection_pool():
            return
        
        # User operations
        user_id = await demonstrate_user_operations()
        if user_id is None:
            return
        
        # Session operations
        session_id = await demonstrate_session_operations(user_id)
        
        # Learning insights
        await demonstrate_learning_insights()
        
        # Transactions
        await demonstrate_transaction_usage()
        
        # Pool statistics
        await demonstrate_connection_pool_stats()
        
        # Database optimization
        await demonstrate_database_optimization()
        
        print("\n✅ === Demo Completed Successfully ===")
        print("The async database system is ready for production use!")
        
    except Exception as e:
        print(f"\n❌ Demo failed: {e}")
        logger.exception("Demo error")
    
    finally:
        # Cleanup
        await cleanup_demo()


if __name__ == "__main__":
    # Run the demonstration
    asyncio.run(main())
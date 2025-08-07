#!/usr/bin/env python3
"""
Setup demo customers for testing SMS/Email blast functionality
"""

import asyncio
import sqlite3
import os
from datetime import datetime, timedelta

async def setup_demo_customers():
    """Create demo customers for testing"""
    
    # Demo customers data
    demo_customers = [
        {
            "name": "John Smith", 
            "phone": "+1234567890",  # Replace with your phone number for testing
            "email": "john.smith@example.com",  # Replace with your email for testing
            "segment": "regular",
            "last_visit": datetime.now() - timedelta(days=15),
            "total_visits": 8
        },
        {
            "name": "Sarah Johnson", 
            "phone": "+1234567891", 
            "email": "sarah.johnson@example.com", 
            "segment": "vip",
            "last_visit": datetime.now() - timedelta(days=5),
            "total_visits": 15
        },
        {
            "name": "Mike Wilson", 
            "phone": "+1234567892", 
            "email": "mike.wilson@example.com", 
            "segment": "lapsed",
            "last_visit": datetime.now() - timedelta(days=75),
            "total_visits": 3
        },
        {
            "name": "Emma Davis", 
            "phone": "+1234567893", 
            "email": "emma.davis@example.com", 
            "segment": "new",
            "last_visit": datetime.now() - timedelta(days=3),
            "total_visits": 1
        }
    ]
    
    # Database path
    db_path = "databases/marketing_campaigns_default_barbershop.db"
    
    # Create databases directory if it doesn't exist
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    # Add customers to database
    with sqlite3.connect(db_path) as conn:
        # Create table if it doesn't exist
        conn.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                barbershop_id TEXT NOT NULL,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                last_visit DATETIME,
                total_visits INTEGER DEFAULT 0,
                preferred_contact TEXT DEFAULT 'both',
                segment TEXT DEFAULT 'regular',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Clear existing demo customers
        conn.execute("DELETE FROM customers WHERE barbershop_id = 'default_barbershop'")
        
        # Insert demo customers
        for customer in demo_customers:
            conn.execute("""
                INSERT INTO customers (barbershop_id, name, phone, email, segment, last_visit, total_visits)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                "default_barbershop",
                customer["name"],
                customer["phone"],
                customer["email"],
                customer["segment"],
                customer["last_visit"].isoformat(),
                customer["total_visits"]
            ))
        
        # Get count of inserted customers
        count = conn.execute("SELECT COUNT(*) FROM customers WHERE barbershop_id = 'default_barbershop'").fetchone()[0]
        
        print(f"✅ Added {count} demo customers to database")
        
        # Show the customers
        customers = conn.execute("""
            SELECT name, phone, email, segment, last_visit, total_visits 
            FROM customers 
            WHERE barbershop_id = 'default_barbershop'
            ORDER BY segment, name
        """).fetchall()
        
        print("\n📋 Demo Customers:")
        for customer in customers:
            name, phone, email, segment, last_visit, total_visits = customer
            print(f"  • {name} ({segment}) - {phone} / {email} - {total_visits} visits")

if __name__ == "__main__":
    asyncio.run(setup_demo_customers())
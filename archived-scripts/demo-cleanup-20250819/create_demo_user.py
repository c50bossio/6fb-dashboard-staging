#!/usr/bin/env python3
"""
Create demo user for 6FB AI Agent System
"""
import sqlite3
import hashlib
import os
from datetime import datetime

DATABASE_PATH = "data/agent_system.db"

def hash_password(password: str) -> str:
    """Hash password with salt"""
    salt = "6fb-salt"  # Same salt as in fastapi_backend.py
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()

def create_demo_user():
    """Create demo user if it doesn't exist"""
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    
    conn = sqlite3.connect(DATABASE_PATH)
    try:
        # Check if demo user exists
        cursor = conn.execute("SELECT id FROM users WHERE email = ?", ("demo@barbershop.com",))
        existing_user = cursor.fetchone()
        
        if existing_user:
            print("✅ Demo user already exists")
            return
        
        # Create demo user
        password_hash = hash_password("demo123")
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, shop_name, is_active) VALUES (?, ?, ?, ?)",
            ("demo@barbershop.com", password_hash, "Demo Barbershop", 1)
        )
        conn.commit()
        
        print("✅ Demo user created successfully!")
        print("   Email: demo@barbershop.com")
        print("   Password: demo123")
        
    finally:
        conn.close()

if __name__ == "__main__":
    create_demo_user()
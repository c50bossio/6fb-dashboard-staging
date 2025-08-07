#!/usr/bin/env python3
"""
Simple FastAPI backend for 6FB AI Agent System - minimal dependencies
"""
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional
import hashlib
import secrets
import sqlite3
import os
from contextlib import contextmanager

app = FastAPI(title="6FB AI Agent System API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:9999", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DATABASE_PATH = "data/agent_system.db"

@contextmanager
def get_db():
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                shop_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1
            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        conn.commit()

# Models
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# Helper functions
def hash_password(password: str) -> str:
    salt = "6fb-salt"
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()

def create_token(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    with get_db() as conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+7 days'))",
            (token, user_id)
        )
        conn.commit()
    return token

# Initialize DB and create demo user
def create_demo_user():
    with get_db() as conn:
        cursor = conn.execute("SELECT id FROM users WHERE email = ?", ("demo@barbershop.com",))
        if not cursor.fetchone():
            password_hash = hash_password("demo123")
            conn.execute(
                "INSERT INTO users (email, password_hash, shop_name, is_active) VALUES (?, ?, ?, ?)",
                ("demo@barbershop.com", password_hash, "Demo Barbershop", 1)
            )
            conn.commit()
            print("✅ Demo user created")

@app.on_event("startup")
async def startup_event():
    init_db()
    create_demo_user()
    print("✅ Database initialized")

@app.get("/")
async def root():
    return {"message": "6FB AI Agent System Backend", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/api/v1/auth/login", response_model=TokenResponse)
async def login(user: UserLogin):
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT id, email, password_hash, shop_name FROM users WHERE email = ?",
            (user.email,)
        )
        db_user = cursor.fetchone()
    
    if not db_user or hash_password(user.password) != db_user["password_hash"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    token = create_token(db_user["id"])
    
    return {
        "access_token": token,
        "user": {
            "id": db_user["id"],
            "email": db_user["email"],
            "shop_name": db_user["shop_name"]
        }
    }

@app.get("/api/v1/auth/me")
async def get_current_user():
    # For now, return a simple user object
    # In production, this would validate the token from the Authorization header
    return {
        "id": 1,
        "email": "demo@barbershop.com",
        "shop_name": "Demo Barbershop"
    }
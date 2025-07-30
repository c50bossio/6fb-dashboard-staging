#!/usr/bin/env python3
"""
Simple test server for customer authentication testing
"""

import uvicorn
from fastapi import FastAPI, HTTPException, Depends, status
from pydantic import BaseModel
import sqlite3
import jwt
import bcrypt
from datetime import datetime, timedelta
import os

app = FastAPI(title="Customer Authentication Test Server")

class UserRegister(BaseModel):
    name: str
    email: str
    phone: str = None
    password: str
    role: str = 'CLIENT'

class UserLogin(BaseModel):
    email: str
    password: str

SECRET_KEY = 'test-secret-key-for-6fb-ai-agent-system'

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({'exp': expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm='HS256')

@app.post('/api/v1/auth/customer/register')
async def register_customer(user: UserRegister):
    """Register a new customer account"""
    try:
        conn = sqlite3.connect('test_customers.db')
        cursor = conn.cursor()
        
        # Create table if not exists
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'CLIENT',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Check if user exists
        cursor.execute('SELECT email FROM users WHERE email = ?', (user.email,))
        if cursor.fetchone():
            conn.close()
            return {'success': False, 'error': 'Email already registered'}
        
        # Hash password and insert user
        hashed_password = hash_password(user.password)
        cursor.execute('''
            INSERT INTO users (name, email, phone, password_hash, role)
            VALUES (?, ?, ?, ?, ?)
        ''', (user.name, user.email, user.phone, hashed_password, user.role))
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Create JWT token
        token = create_access_token({'user_id': user_id, 'email': user.email})
        
        return {
            'success': True,
            'access_token': token,
            'token_type': 'bearer',
            'user': {
                'id': user_id,
                'name': user.name,
                'email': user.email,
                'phone': user.phone,
                'role': user.role
            }
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}

@app.post('/api/v1/auth/customer/login')
async def login_customer(user: UserLogin):
    """Login with email and password"""
    try:
        conn = sqlite3.connect('test_customers.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, name, email, phone, password_hash, role 
            FROM users WHERE email = ?
        ''', (user.email,))
        
        user_data = cursor.fetchone()
        conn.close()
        
        if not user_data or not verify_password(user.password, user_data[4]):
            return {'success': False, 'error': 'Invalid credentials'}
        
        # Create JWT token
        token = create_access_token({'user_id': user_data[0], 'email': user_data[2]})
        
        return {
            'success': True,
            'access_token': token,
            'token_type': 'bearer',
            'user': {
                'id': user_data[0],
                'name': user_data[1],
                'email': user_data[2],
                'phone': user_data[3],
                'role': user_data[5]
            }
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}

@app.get('/api/v1/auth/me')
async def get_current_user():
    """Get current user info (simplified for testing)"""
    return {
        'id': 1,
        'name': 'Test User',
        'email': 'test@example.com',
        'role': 'CLIENT'
    }

@app.get('/api/v1/auth/google/customer')
async def google_auth_customer():
    """Google OAuth endpoint (mock for testing)"""
    return {
        'message': 'Google OAuth flow would start here',
        'redirect_url': 'https://accounts.google.com/oauth/authorize'
    }

@app.get('/')
async def root():
    return {
        'message': 'Customer Authentication Test Server',
        'version': '1.0.0',
        'status': 'active',
        'endpoints': {
            'register': '/api/v1/auth/customer/register',
            'login': '/api/v1/auth/customer/login',
            'me': '/api/v1/auth/me',
            'google_oauth': '/api/v1/auth/google/customer'
        }
    }

if __name__ == '__main__':
    print("🚀 Starting Customer Authentication Test Server...")
    print("📝 SQLite database: test_customers.db")
    print("🔐 JWT authentication enabled")
    print("🌐 Running on http://localhost:8001")
    
    uvicorn.run(app, host='0.0.0.0', port=8001)
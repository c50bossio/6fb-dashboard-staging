#!/usr/bin/env python3
"""
WebSocket-enabled FastAPI backend for 6FB AI Agent System
Supports real-time chat with AI agents
"""

import os
import json
import secrets
import hashlib
import sqlite3
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from contextlib import contextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import openai

# Configure OpenAI API (optional - will use mock responses if not set)
openai.api_key = os.getenv("OPENAI_API_KEY", "")

app = FastAPI(title="6FB AI Agent System", version="2.1.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:9999", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_sessions: Dict[str, str] = {}  # websocket_id -> user_id

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        connection_id = f"{user_id}_{datetime.now().timestamp()}"
        self.active_connections[connection_id] = websocket
        self.user_sessions[connection_id] = user_id
        return connection_id

    def disconnect(self, connection_id: str):
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
            del self.user_sessions[connection_id]

    async def send_personal_message(self, message: str, connection_id: str):
        if connection_id in self.active_connections:
            await self.active_connections[connection_id].send_text(message)

    async def broadcast_to_user(self, message: str, user_id: str):
        """Send message to all connections for a specific user"""
        for conn_id, uid in self.user_sessions.items():
            if uid == user_id:
                await self.send_personal_message(message, conn_id)

manager = ConnectionManager()

# Database functions (same as before)
DB_PATH = "data/6fb_agent_system.db"

@contextmanager
def get_db():
    """Get database connection context manager"""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    """Initialize database tables"""
    with get_db() as conn:
        # Users table
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
        
        # Sessions table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # Chat history table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                agent_id TEXT NOT NULL,
                message TEXT NOT NULL,
                response TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        # AI conversations table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ai_conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_id TEXT NOT NULL,
                agent_id TEXT NOT NULL,
                messages TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        conn.commit()

# AI Agent logic
class AIAgent:
    """AI Agent handler with real OpenAI integration or mock responses"""
    
    def __init__(self, agent_id: str, name: str, system_prompt: str):
        self.agent_id = agent_id
        self.name = name
        self.system_prompt = system_prompt
        self.use_openai = bool(openai.api_key)
    
    async def generate_response(self, message: str, conversation_history: List[dict] = None) -> dict:
        """Generate AI response using OpenAI or mock responses"""
        
        if self.use_openai:
            try:
                # Build messages for OpenAI
                messages = [{"role": "system", "content": self.system_prompt}]
                
                # Add conversation history
                if conversation_history:
                    for msg in conversation_history[-10:]:  # Last 10 messages
                        messages.append({
                            "role": msg.get("role", "user"),
                            "content": msg.get("content", "")
                        })
                
                # Add current message
                messages.append({"role": "user", "content": message})
                
                # Call OpenAI API
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=messages,
                    temperature=0.7,
                    max_tokens=500
                )
                
                ai_response = response.choices[0].message.content
                
                return {
                    "response": ai_response,
                    "agent_id": self.agent_id,
                    "agent_name": self.name,
                    "timestamp": datetime.now().isoformat(),
                    "model": "gpt-3.5-turbo"
                }
                
            except Exception as e:
                print(f"OpenAI API error: {e}")
                # Fall back to mock response
        
        # Mock responses based on agent type
        return self._generate_mock_response(message)
    
    def _generate_mock_response(self, message: str) -> dict:
        """Generate mock responses when OpenAI is not available"""
        
        responses = {
            "business_coach": {
                "greeting": "Hello! I'm your AI Business Coach. I'm here to help you grow your barbershop business. What challenges are you facing today?",
                "revenue": "To increase revenue, consider: 1) Implementing a loyalty program for repeat customers, 2) Offering package deals for regular services, 3) Upselling premium services like beard treatments or hot towel shaves.",
                "marketing": "For marketing your barbershop: 1) Use social media to showcase before/after photos, 2) Partner with local businesses for cross-promotion, 3) Implement a referral program with incentives.",
                "default": "That's an interesting question about your barbershop. Let me think about the best strategies for you. Can you provide more details about your specific situation?"
            },
            "marketing_expert": {
                "greeting": "Hi! I'm your Marketing Expert AI. I'll help you attract more customers and build your brand. What marketing goals do you have?",
                "social": "For social media success: 1) Post consistently 3-4 times per week, 2) Use hashtags like #barbershop #mensgrooming #[yourcity], 3) Share customer testimonials and transformations.",
                "campaigns": "Effective campaign ideas: 1) 'First Visit' discounts for new customers, 2) Father & Son packages, 3) Monthly membership programs with exclusive perks.",
                "default": "Great marketing question! To give you the best advice, tell me more about your target audience and current marketing efforts."
            },
            "financial_advisor": {
                "greeting": "Welcome! I'm your Financial Advisor AI. I'll help you optimize profits and manage expenses. What financial aspects concern you most?",
                "pricing": "For pricing strategy: 1) Research competitor prices in your area, 2) Consider value-based pricing for premium services, 3) Implement dynamic pricing for peak/off-peak hours.",
                "expenses": "To reduce expenses: 1) Buy supplies in bulk, 2) Negotiate with suppliers for better rates, 3) Track utility usage and optimize scheduling.",
                "default": "That's an important financial consideration. Could you share more details about your current financial situation or specific concerns?"
            }
        }
        
        # Get agent-specific responses
        agent_responses = responses.get(self.agent_id, responses["business_coach"])
        
        # Determine response type based on message content
        message_lower = message.lower()
        
        if any(word in message_lower for word in ["hello", "hi", "help", "start"]):
            response_text = agent_responses["greeting"]
        elif any(word in message_lower for word in ["revenue", "money", "earn", "profit"]):
            response_text = agent_responses.get("revenue", agent_responses["default"])
        elif any(word in message_lower for word in ["market", "customer", "attract", "promote"]):
            response_text = agent_responses.get("marketing", agent_responses["default"])
        elif any(word in message_lower for word in ["social", "instagram", "facebook"]):
            response_text = agent_responses.get("social", agent_responses["default"])
        elif any(word in message_lower for word in ["price", "cost", "charge"]):
            response_text = agent_responses.get("pricing", agent_responses["default"])
        elif any(word in message_lower for word in ["expense", "save", "reduce"]):
            response_text = agent_responses.get("expenses", agent_responses["default"])
        else:
            response_text = agent_responses["default"]
        
        return {
            "response": response_text,
            "agent_id": self.agent_id,
            "agent_name": self.name,
            "timestamp": datetime.now().isoformat(),
            "model": "mock"
        }

# Initialize AI agents
ai_agents = {
    "business_coach": AIAgent(
        "business_coach",
        "Business Coach",
        "You are an expert business coach for barbershops. Provide strategic advice on growing the business, improving operations, and increasing customer satisfaction."
    ),
    "marketing_expert": AIAgent(
        "marketing_expert",
        "Marketing Expert",
        "You are a marketing expert specializing in barbershops and salons. Help with social media strategies, promotional campaigns, and customer acquisition."
    ),
    "financial_advisor": AIAgent(
        "financial_advisor",
        "Financial Advisor",
        "You are a financial advisor for barbershop businesses. Provide guidance on pricing, expense management, revenue optimization, and financial planning."
    )
}

# Authentication helpers (same as before)
def hash_password(password: str) -> str:
    """Hash password with salt"""
    salt = "6fb-salt"
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()

def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == password_hash

def create_token(user_id: int) -> str:
    """Create session token"""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now() + timedelta(days=7)
    
    with get_db() as conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
            (token, user_id, expires_at)
        )
        conn.commit()
    
    return token

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from token"""
    token = credentials.credentials
    
    with get_db() as conn:
        cursor = conn.execute(
            """SELECT u.* FROM users u 
               JOIN sessions s ON u.id = s.user_id 
               WHERE s.token = ? AND s.expires_at > datetime('now')""",
            (token,)
        )
        user = cursor.fetchone()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    return dict(user)

# Pydantic models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    shop_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# Routes
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()
    print("✅ Database initialized")
    print(f"✅ OpenAI integration: {'Enabled' if openai.api_key else 'Disabled (using mock responses)'}")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "6FB AI Agent System Backend",
        "status": "running",
        "version": "2.1.0",
        "features": {
            "websocket": "enabled",
            "ai_agents": list(ai_agents.keys()),
            "openai": bool(openai.api_key)
        }
    }

# Authentication endpoints (same as before)
@app.post("/api/v1/auth/register", response_model=TokenResponse)
async def register(user: UserRegister):
    """Register new user"""
    with get_db() as conn:
        cursor = conn.execute("SELECT id FROM users WHERE email = ?", (user.email,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        password_hash = hash_password(user.password)
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, shop_name) VALUES (?, ?, ?)",
            (user.email, password_hash, user.shop_name)
        )
        user_id = cursor.lastrowid
        conn.commit()
    
    token = create_token(user_id)
    
    return {
        "access_token": token,
        "user": {
            "id": user_id,
            "email": user.email,
            "shop_name": user.shop_name
        }
    }

@app.post("/api/v1/auth/login", response_model=TokenResponse)
async def login(user: UserLogin):
    """Login user"""
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT id, email, password_hash, shop_name FROM users WHERE email = ?",
            (user.email,)
        )
        db_user = cursor.fetchone()
    
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
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

# WebSocket endpoint for real-time chat
@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """WebSocket endpoint for real-time AI chat"""
    
    # Verify token and get user
    with get_db() as conn:
        cursor = conn.execute(
            """SELECT u.* FROM users u 
               JOIN sessions s ON u.id = s.user_id 
               WHERE s.token = ? AND s.expires_at > datetime('now')""",
            (token,)
        )
        user = cursor.fetchone()
    
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    user_dict = dict(user)
    connection_id = await manager.connect(websocket, str(user_dict["id"]))
    
    # Send welcome message
    welcome_msg = {
        "type": "connection",
        "status": "connected",
        "user_id": user_dict["id"],
        "message": "Connected to AI Agent System"
    }
    await manager.send_personal_message(json.dumps(welcome_msg), connection_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Handle different message types
            if message_data.get("type") == "chat":
                agent_id = message_data.get("agent_id", "business_coach")
                user_message = message_data.get("message", "")
                session_id = message_data.get("session_id", str(user_dict["id"]))
                
                # Get AI agent
                agent = ai_agents.get(agent_id)
                if not agent:
                    error_msg = {
                        "type": "error",
                        "message": f"Unknown agent: {agent_id}"
                    }
                    await manager.send_personal_message(json.dumps(error_msg), connection_id)
                    continue
                
                # Send typing indicator
                typing_msg = {
                    "type": "typing",
                    "agent_id": agent_id,
                    "agent_name": agent.name
                }
                await manager.send_personal_message(json.dumps(typing_msg), connection_id)
                
                # Get conversation history
                conversation_history = []
                with get_db() as conn:
                    cursor = conn.execute(
                        """SELECT messages FROM ai_conversations 
                           WHERE user_id = ? AND session_id = ? AND agent_id = ?
                           ORDER BY updated_at DESC LIMIT 1""",
                        (user_dict["id"], session_id, agent_id)
                    )
                    row = cursor.fetchone()
                    if row:
                        conversation_history = json.loads(row["messages"])
                
                # Generate AI response
                ai_response = await agent.generate_response(user_message, conversation_history)
                
                # Update conversation history
                conversation_history.append({"role": "user", "content": user_message})
                conversation_history.append({"role": "assistant", "content": ai_response["response"]})
                
                # Save to database
                with get_db() as conn:
                    cursor = conn.execute(
                        """SELECT id FROM ai_conversations 
                           WHERE user_id = ? AND session_id = ? AND agent_id = ?""",
                        (user_dict["id"], session_id, agent_id)
                    )
                    conv_row = cursor.fetchone()
                    
                    if conv_row:
                        # Update existing conversation
                        conn.execute(
                            """UPDATE ai_conversations 
                               SET messages = ?, updated_at = CURRENT_TIMESTAMP
                               WHERE id = ?""",
                            (json.dumps(conversation_history), conv_row["id"])
                        )
                    else:
                        # Create new conversation
                        conn.execute(
                            """INSERT INTO ai_conversations 
                               (user_id, session_id, agent_id, messages)
                               VALUES (?, ?, ?, ?)""",
                            (user_dict["id"], session_id, agent_id, json.dumps(conversation_history))
                        )
                    
                    # Save to chat history
                    conn.execute(
                        "INSERT INTO chat_history (user_id, agent_id, message, response) VALUES (?, ?, ?, ?)",
                        (user_dict["id"], agent_id, user_message, json.dumps(ai_response))
                    )
                    conn.commit()
                
                # Send response
                response_msg = {
                    "type": "response",
                    "agent_id": agent_id,
                    "agent_name": agent.name,
                    "message": ai_response["response"],
                    "timestamp": ai_response["timestamp"],
                    "model": ai_response["model"]
                }
                await manager.send_personal_message(json.dumps(response_msg), connection_id)
            
            elif message_data.get("type") == "ping":
                # Handle ping/pong for connection keep-alive
                pong_msg = {"type": "pong", "timestamp": datetime.now().isoformat()}
                await manager.send_personal_message(json.dumps(pong_msg), connection_id)
    
    except WebSocketDisconnect:
        manager.disconnect(connection_id)
        print(f"Client {connection_id} disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(connection_id)

# REST endpoints for AI agents
@app.get("/api/v1/agents")
async def get_agents():
    """Get available AI agents"""
    return [
        {
            "id": agent_id,
            "name": agent.name,
            "description": f"AI-powered {agent.name} for your barbershop",
            "status": "active",
            "ai_enabled": agent.use_openai
        }
        for agent_id, agent in ai_agents.items()
    ]

@app.get("/api/v1/conversations/{session_id}")
async def get_conversation(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get conversation history for a session"""
    with get_db() as conn:
        cursor = conn.execute(
            """SELECT * FROM ai_conversations 
               WHERE user_id = ? AND session_id = ?
               ORDER BY updated_at DESC""",
            (current_user["id"], session_id)
        )
        conversations = []
        for row in cursor.fetchall():
            conv = dict(row)
            conv["messages"] = json.loads(conv["messages"])
            conversations.append(conv)
    
    return {"session_id": session_id, "conversations": conversations}

# Notification endpoint
@app.post("/api/v1/notifications/send")
async def send_notification(
    notification: dict,
    current_user: dict = Depends(get_current_user)
):
    """Send real-time notification to user"""
    notification_msg = {
        "type": "notification",
        "title": notification.get("title", "Notification"),
        "message": notification.get("message", ""),
        "timestamp": datetime.now().isoformat()
    }
    
    await manager.broadcast_to_user(
        json.dumps(notification_msg),
        str(current_user["id"])
    )
    
    return {"status": "sent", "user_id": current_user["id"]}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True)
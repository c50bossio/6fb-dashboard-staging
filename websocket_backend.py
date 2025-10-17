#!/usr/bin/env python3
"""
WebSocket-enabled FastAPI backend for 6FB AI Agent System
Supports real-time chat with AI agents and Supabase integration
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

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from openai import AsyncOpenAI
import sys
sys.path.append('services')
from ai_training_service import AITrainingService

try:
    from supabase import create_client, Client
    from supabase.lib.client_options import ClientOptions
    SUPABASE_AVAILABLE = True
except ImportError:
    print("Warning: Supabase not available. Install with: pip install supabase")
    SUPABASE_AVAILABLE = False

# Configure OpenAI API (optional - will use mock responses if not set)
openai_client = AsyncOpenAI(
    api_key=os.getenv("OPENAI_API_KEY", "")
) if os.getenv("OPENAI_API_KEY") else None

# Configure Supabase (optional - will use SQLite if not available)
supabase_client = None
if SUPABASE_AVAILABLE and os.getenv("NEXT_PUBLIC_SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
    try:
        supabase_client = create_client(
            os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
            options=ClientOptions(
                auto_refresh_token=True,
                persist_session=True
            )
        )
        print("✅ Supabase client initialized")
    except Exception as e:
        print(f"Warning: Failed to initialize Supabase client: {e}")
        supabase_client = None

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

# Enhanced WebSocket connection manager with real-time features
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_sessions: Dict[str, str] = {}  # websocket_id -> user_id
        self.user_connections: Dict[str, List[str]] = {}  # user_id -> [connection_ids]
        self.room_subscriptions: Dict[str, List[str]] = {}  # room -> [connection_ids]
        self.connection_metadata: Dict[str, Dict] = {}  # connection_id -> metadata
        
    async def connect(self, websocket: WebSocket, user_id: str, metadata: Dict = None):
        await websocket.accept()
        connection_id = f"{user_id}_{datetime.now().timestamp()}_{secrets.token_hex(4)}"
        
        # Store connection
        self.active_connections[connection_id] = websocket
        self.user_sessions[connection_id] = user_id
        self.connection_metadata[connection_id] = metadata or {}
        
        # Track user connections
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(connection_id)
        
        # Notify Supabase of connection if available
        if supabase_client:
            try:
                await self.log_connection_event(user_id, "connected", metadata)
            except Exception as e:
                print(f"Failed to log connection event: {e}")
        
        return connection_id

    def disconnect(self, connection_id: str):
        if connection_id in self.active_connections:
            user_id = self.user_sessions[connection_id]
            
            # Remove from all data structures
            del self.active_connections[connection_id]
            del self.user_sessions[connection_id]
            del self.connection_metadata[connection_id]
            
            # Remove from user connections
            if user_id in self.user_connections:
                self.user_connections[user_id].remove(connection_id)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]
            
            # Remove from room subscriptions
            for room, connections in list(self.room_subscriptions.items()):
                if connection_id in connections:
                    connections.remove(connection_id)
                    if not connections:
                        del self.room_subscriptions[room]
            
            # Log disconnection
            if supabase_client:
                try:
                    asyncio.create_task(self.log_connection_event(user_id, "disconnected"))
                except Exception as e:
                    print(f"Failed to log disconnection event: {e}")

    async def send_personal_message(self, message: str, connection_id: str):
        if connection_id in self.active_connections:
            try:
                await self.active_connections[connection_id].send_text(message)
                return True
            except Exception as e:
                print(f"Failed to send message to {connection_id}: {e}")
                # Connection is dead, clean it up
                self.disconnect(connection_id)
                return False
        return False

    async def broadcast_to_user(self, message: str, user_id: str):
        """Send message to all connections for a specific user"""
        if user_id in self.user_connections:
            success_count = 0
            for conn_id in list(self.user_connections[user_id]):
                if await self.send_personal_message(message, conn_id):
                    success_count += 1
            return success_count
        return 0
    
    async def broadcast_to_room(self, message: str, room: str):
        """Send message to all connections in a room"""
        if room in self.room_subscriptions:
            success_count = 0
            for conn_id in list(self.room_subscriptions[room]):
                if await self.send_personal_message(message, conn_id):
                    success_count += 1
            return success_count
        return 0
    
    def subscribe_to_room(self, connection_id: str, room: str):
        """Subscribe connection to a room for broadcasts"""
        if room not in self.room_subscriptions:
            self.room_subscriptions[room] = []
        if connection_id not in self.room_subscriptions[room]:
            self.room_subscriptions[room].append(connection_id)
    
    def unsubscribe_from_room(self, connection_id: str, room: str):
        """Unsubscribe connection from a room"""
        if room in self.room_subscriptions:
            if connection_id in self.room_subscriptions[room]:
                self.room_subscriptions[room].remove(connection_id)
            if not self.room_subscriptions[room]:
                del self.room_subscriptions[room]
    
    def get_connection_stats(self):
        """Get connection statistics"""
        return {
            "total_connections": len(self.active_connections),
            "unique_users": len(self.user_connections),
            "active_rooms": len(self.room_subscriptions),
            "connections_per_room": {
                room: len(connections) 
                for room, connections in self.room_subscriptions.items()
            }
        }
    
    async def log_connection_event(self, user_id: str, event: str, metadata: Dict = None):
        """Log connection events to Supabase"""
        if not supabase_client:
            return
        
        try:
            supabase_client.table('websocket_events').insert({
                'user_id': user_id,
                'event': event,
                'metadata': metadata or {},
                'timestamp': datetime.now().isoformat()
            }).execute()
        except Exception as e:
            print(f"Failed to log connection event: {e}")
    
    async def broadcast_notification(self, notification_type: str, data: Dict, user_ids: List[str] = None):
        """Broadcast notifications to users or all connections"""
        message = json.dumps({
            "type": "notification",
            "notification_type": notification_type,
            "data": data,
            "timestamp": datetime.now().isoformat()
        })
        
        if user_ids:
            for user_id in user_ids:
                await self.broadcast_to_user(message, user_id)
        else:
            # Broadcast to all connections
            for conn_id in list(self.active_connections.keys()):
                await self.send_personal_message(message, conn_id)

manager = ConnectionManager()

# Enhanced database functions with Supabase support
DB_PATH = "data/6fb_agent_system.db"

class DatabaseManager:
    """Unified database manager for both SQLite and Supabase"""
    
    def __init__(self):
        self.use_supabase = bool(supabase_client)
    
    @contextmanager
    def get_sqlite_db(self):
        """Get SQLite database connection"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    async def save_chat_message(self, user_id: str, agent_id: str, message: str, response: str):
        """Save chat message to appropriate database"""
        if self.use_supabase:
            try:
                supabase_client.table('ai_chat_history').insert({
                    'user_id': user_id,
                    'agent_id': agent_id,
                    'message': message,
                    'response': response,
                    'created_at': datetime.now().isoformat()
                }).execute()
                return True
            except Exception as e:
                print(f"Failed to save to Supabase, falling back to SQLite: {e}")
        
        # Fallback to SQLite
        with self.get_sqlite_db() as conn:
            conn.execute(
                "INSERT INTO chat_history (user_id, agent_id, message, response) VALUES (?, ?, ?, ?)",
                (user_id, agent_id, message, response)
            )
            conn.commit()
        return True
    
    async def save_conversation(self, user_id: str, session_id: str, agent_id: str, messages: List[dict]):
        """Save conversation to appropriate database"""
        if self.use_supabase:
            try:
                # Check if conversation exists
                existing = supabase_client.table('ai_conversations').select('id').eq('user_id', user_id).eq('session_id', session_id).eq('agent_id', agent_id).execute()
                
                if existing.data:
                    # Update existing
                    supabase_client.table('ai_conversations').update({
                        'messages': json.dumps(messages),
                        'updated_at': datetime.now().isoformat()
                    }).eq('id', existing.data[0]['id']).execute()
                else:
                    # Create new
                    supabase_client.table('ai_conversations').insert({
                        'user_id': user_id,
                        'session_id': session_id,
                        'agent_id': agent_id,
                        'messages': json.dumps(messages),
                        'created_at': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat()
                    }).execute()
                return True
            except Exception as e:
                print(f"Failed to save conversation to Supabase, falling back to SQLite: {e}")
        
        # Fallback to SQLite
        with self.get_sqlite_db() as conn:
            cursor = conn.execute(
                """SELECT id FROM ai_conversations 
                   WHERE user_id = ? AND session_id = ? AND agent_id = ?""",
                (user_id, session_id, agent_id)
            )
            conv_row = cursor.fetchone()
            
            if conv_row:
                conn.execute(
                    """UPDATE ai_conversations 
                       SET messages = ?, updated_at = CURRENT_TIMESTAMP
                       WHERE id = ?""",
                    (json.dumps(messages), conv_row["id"])
                )
            else:
                conn.execute(
                    """INSERT INTO ai_conversations 
                       (user_id, session_id, agent_id, messages)
                       VALUES (?, ?, ?, ?)""",
                    (user_id, session_id, agent_id, json.dumps(messages))
                )
            conn.commit()
        return True
    
    async def get_conversation(self, user_id: str, session_id: str, agent_id: str):
        """Get conversation from appropriate database"""
        if self.use_supabase:
            try:
                result = supabase_client.table('ai_conversations').select('messages').eq('user_id', user_id).eq('session_id', session_id).eq('agent_id', agent_id).order('updated_at', desc=True).limit(1).execute()
                
                if result.data:
                    return json.loads(result.data[0]['messages'])
                return []
            except Exception as e:
                print(f"Failed to get conversation from Supabase, falling back to SQLite: {e}")
        
        # Fallback to SQLite
        with self.get_sqlite_db() as conn:
            cursor = conn.execute(
                """SELECT messages FROM ai_conversations 
                   WHERE user_id = ? AND session_id = ? AND agent_id = ?
                   ORDER BY updated_at DESC LIMIT 1""",
                (user_id, session_id, agent_id)
            )
            row = cursor.fetchone()
            return json.loads(row["messages"]) if row else []
    
    async def authenticate_user(self, token: str):
        """Authenticate user with token"""
        if self.use_supabase:
            try:
                # Get user from Supabase auth
                user_response = supabase_client.auth.get_user(token)
                if user_response.user:
                    return {
                        'id': user_response.user.id,
                        'email': user_response.user.email,
                        'shop_name': user_response.user.user_metadata.get('shop_name')
                    }
                return None
            except Exception as e:
                print(f"Supabase auth failed, falling back to SQLite: {e}")
        
        # Fallback to SQLite
        with self.get_sqlite_db() as conn:
            cursor = conn.execute(
                """SELECT u.* FROM users u 
                   JOIN sessions s ON u.id = s.user_id 
                   WHERE s.token = ? AND s.expires_at > datetime('now')""",
                (token,)
            )
            user = cursor.fetchone()
            return dict(user) if user else None
    
    async def broadcast_realtime_update(self, table: str, event: str, data: dict, user_id: str = None):
        """Broadcast real-time updates"""
        message = {
            "type": "realtime_update",
            "table": table,
            "event": event,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
        
        if user_id:
            await manager.broadcast_to_user(json.dumps(message), user_id)
        else:
            await manager.broadcast_notification("database_update", message)

db_manager = DatabaseManager()

@contextmanager
def get_db():
    """Legacy function for backwards compatibility"""
    return db_manager.get_sqlite_db()

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
        self.use_openai = bool(openai_client)
    
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
                
                # Call OpenAI API with modern async client
                response = await openai_client.chat.completions.create(
                    model="gpt-4o-mini",  # Use latest cost-efficient model
                    messages=messages,
                    temperature=0.7,
                    max_tokens=500,
                    timeout=15.0  # Add timeout for reliability
                )
                
                ai_response = response.choices[0].message.content
                
                return {
                    "response": ai_response,
                    "agent_id": self.agent_id,
                    "agent_name": self.name,
                    "timestamp": datetime.now().isoformat(),
                    "model": "gpt-4o-mini",
                    "usage": {
                        "prompt_tokens": response.usage.prompt_tokens,
                        "completion_tokens": response.usage.completion_tokens,
                        "total_tokens": response.usage.total_tokens
                    }
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
    """Initialize enhanced backend with real-time features"""
    init_db()
    print("✅ Database initialized")
    print(f"✅ OpenAI integration: {'Enabled' if openai_client else 'Disabled (using mock responses)'}")
    print(f"✅ Supabase integration: {'Enabled' if supabase_client else 'Disabled (using SQLite)'}")
    print("✅ Enhanced WebSocket manager initialized")
    print("✅ Real-time notifications enabled")
    print("✅ Live data synchronization enabled")
    print("🚀 6FB AI Agent System ready with full real-time capabilities")

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
            "openai": bool(openai_client)
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

# Enhanced WebSocket endpoint with real-time features
@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """Enhanced WebSocket endpoint for real-time AI chat and notifications"""
    
    # Verify token and get user
    user_dict = await db_manager.authenticate_user(token)
    
    if not user_dict:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    # Get connection metadata
    user_agent = websocket.headers.get('user-agent', 'Unknown')
    client_ip = websocket.headers.get('x-forwarded-for', 'Unknown')
    
    connection_metadata = {
        'user_agent': user_agent,
        'client_ip': client_ip,
        'connection_time': datetime.now().isoformat()
    }
    
    connection_id = await manager.connect(websocket, str(user_dict["id"]), connection_metadata)
    
    # Subscribe to user-specific room
    user_room = f"user_{user_dict['id']}"
    manager.subscribe_to_room(connection_id, user_room)
    
    # Subscribe to shop-specific room if user has shop
    if user_dict.get('shop_name'):
        shop_room = f"shop_{user_dict['shop_name']}"
        manager.subscribe_to_room(connection_id, shop_room)
    
    # Send welcome message with enhanced info
    welcome_msg = {
        "type": "connection",
        "status": "connected",
        "user_id": user_dict["id"],
        "connection_id": connection_id,
        "features": {
            "ai_agents": True,
            "real_time_notifications": True,
            "live_data_sync": bool(supabase_client),
            "room_subscriptions": [user_room] + ([shop_room] if user_dict.get('shop_name') else [])
        },
        "message": "Connected to enhanced 6FB AI Agent System"
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
                
                # Get conversation history using enhanced database manager
                conversation_history = await db_manager.get_conversation(user_dict["id"], session_id, agent_id)
                
                # Generate AI response
                ai_response = await agent.generate_response(user_message, conversation_history)
                
                # Update conversation history
                conversation_history.append({"role": "user", "content": user_message})
                conversation_history.append({"role": "assistant", "content": ai_response["response"]})
                
                # Save to database using enhanced manager
                await db_manager.save_conversation(user_dict["id"], session_id, agent_id, conversation_history)
                await db_manager.save_chat_message(user_dict["id"], agent_id, user_message, json.dumps(ai_response))
                
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
                
                # Broadcast real-time update if enabled
                await db_manager.broadcast_realtime_update(
                    "ai_conversations", "chat_message", 
                    {"agent_id": agent_id, "user_id": user_dict["id"], "message_preview": user_message[:50]}
                )
            
            elif message_data.get("type") == "subscribe":
                # Subscribe to additional rooms/channels
                room = message_data.get("room")
                if room and room.startswith(("shop_", "user_", "barbershop_", "calendar_")):
                    manager.subscribe_to_room(connection_id, room)
                    await manager.send_personal_message(
                        json.dumps({"type": "subscribed", "room": room}), connection_id
                    )
            
            elif message_data.get("type") == "unsubscribe":
                # Unsubscribe from rooms/channels
                room = message_data.get("room")
                if room:
                    manager.unsubscribe_from_room(connection_id, room)
                    await manager.send_personal_message(
                        json.dumps({"type": "unsubscribed", "room": room}), connection_id
                    )
            
            elif message_data.get("type") == "live_data_request":
                # Request live data updates
                table = message_data.get("table")
                filters = message_data.get("filters", {})
                
                if supabase_client and table:
                    try:
                        # Get current data from Supabase
                        query = supabase_client.table(table).select('*')
                        for key, value in filters.items():
                            query = query.eq(key, value)
                        result = query.execute()
                        
                        live_data_msg = {
                            "type": "live_data",
                            "table": table,
                            "data": result.data,
                            "timestamp": datetime.now().isoformat()
                        }
                        await manager.send_personal_message(json.dumps(live_data_msg), connection_id)
                        
                        # Subscribe to real-time updates for this table
                        table_room = f"table_{table}"
                        manager.subscribe_to_room(connection_id, table_room)
                        
                    except Exception as e:
                        error_msg = {
                            "type": "error", 
                            "message": f"Failed to get live data: {str(e)}"
                        }
                        await manager.send_personal_message(json.dumps(error_msg), connection_id)
            
            elif message_data.get("type") == "dashboard_metrics":
                # Request real-time dashboard metrics
                metrics_type = message_data.get("metrics_type", "overview")
                
                # This would integrate with your analytics system
                metrics_data = {
                    "type": "dashboard_metrics",
                    "metrics_type": metrics_type,
                    "data": {
                        "connections": manager.get_connection_stats(),
                        "timestamp": datetime.now().isoformat()
                    }
                }
                await manager.send_personal_message(json.dumps(metrics_data), connection_id)
            
            elif message_data.get("type") == "ping":
                # Handle ping/pong for connection keep-alive
                pong_msg = {
                    "type": "pong", 
                    "timestamp": datetime.now().isoformat(),
                    "connection_id": connection_id
                }
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

# Enhanced notification endpoints
@app.post("/api/v1/notifications/send")
async def send_notification(
    notification: dict,
    current_user: dict = Depends(get_current_user)
):
    """Send real-time notification to user"""
    notification_type = notification.get("type", "info")
    title = notification.get("title", "Notification")
    message = notification.get("message", "")
    priority = notification.get("priority", "normal")
    
    notification_msg = {
        "type": "notification",
        "notification_type": notification_type,
        "title": title,
        "message": message,
        "priority": priority,
        "timestamp": datetime.now().isoformat(),
        "user_id": current_user["id"]
    }
    
    # Send to specific user
    sent_count = await manager.broadcast_to_user(
        json.dumps(notification_msg),
        str(current_user["id"])
    )
    
    # Log to database if Supabase available
    if supabase_client:
        try:
            supabase_client.table('notifications').insert({
                'user_id': current_user["id"],
                'type': notification_type,
                'title': title,
                'message': message,
                'priority': priority,
                'sent_at': datetime.now().isoformat()
            }).execute()
        except Exception as e:
            print(f"Failed to log notification: {e}")
    
    return {
        "status": "sent", 
        "user_id": current_user["id"],
        "connections_reached": sent_count,
        "notification_id": f"notif_{int(datetime.now().timestamp())}"
    }

@app.post("/api/v1/notifications/broadcast")
async def broadcast_notification(
    notification: dict,
    current_user: dict = Depends(get_current_user)
):
    """Broadcast notification to all connected users or specific groups"""
    notification_type = notification.get("type", "broadcast")
    title = notification.get("title", "System Notification")
    message = notification.get("message", "")
    target_groups = notification.get("target_groups", [])  # e.g., ["shop_mybarbershop", "user_123"]
    
    notification_msg = {
        "type": "notification",
        "notification_type": notification_type,
        "title": title,
        "message": message,
        "from_user": current_user["id"],
        "timestamp": datetime.now().isoformat()
    }
    
    if target_groups:
        # Broadcast to specific groups/rooms
        total_sent = 0
        for group in target_groups:
            sent_count = await manager.broadcast_to_room(json.dumps(notification_msg), group)
            total_sent += sent_count
    else:
        # Broadcast to all connections
        await manager.broadcast_notification(notification_type, {
            "title": title,
            "message": message,
            "from_user": current_user["id"]
        })
        total_sent = len(manager.active_connections)
    
    return {
        "status": "broadcast_sent",
        "connections_reached": total_sent,
        "broadcast_id": f"broadcast_{int(datetime.now().timestamp())}"
    }

@app.get("/api/v1/realtime/stats")
async def get_realtime_stats(current_user: dict = Depends(get_current_user)):
    """Get real-time connection and usage statistics"""
    return {
        "connection_stats": manager.get_connection_stats(),
        "database_type": "supabase" if supabase_client else "sqlite",
        "ai_integration": "enabled" if openai_client else "mock",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/v1/realtime/booking-update")
async def broadcast_booking_update(
    booking_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Broadcast booking status updates to relevant users"""
    booking_id = booking_data.get("booking_id")
    status = booking_data.get("status")
    customer_id = booking_data.get("customer_id")
    barber_id = booking_data.get("barber_id")
    shop_id = booking_data.get("shop_id")
    
    update_msg = {
        "type": "booking_update",
        "booking_id": booking_id,
        "status": status,
        "data": booking_data,
        "timestamp": datetime.now().isoformat()
    }
    
    # Notify relevant parties
    notifications_sent = 0
    
    # Notify customer
    if customer_id:
        notifications_sent += await manager.broadcast_to_user(
            json.dumps(update_msg), str(customer_id)
        )
    
    # Notify barber
    if barber_id:
        notifications_sent += await manager.broadcast_to_user(
            json.dumps(update_msg), str(barber_id)
        )
    
    # Notify shop
    if shop_id:
        notifications_sent += await manager.broadcast_to_room(
            json.dumps(update_msg), f"shop_{shop_id}"
        )
    
    # Log update to database
    await db_manager.broadcast_realtime_update(
        "bookings", "status_update", booking_data, customer_id
    )
    
    return {
        "status": "booking_update_sent",
        "booking_id": booking_id,
        "notifications_sent": notifications_sent
    }

@app.post("/api/v1/realtime/live-metrics")
async def send_live_metrics(
    metrics_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Send live dashboard metrics to connected users"""
    metrics_msg = {
        "type": "live_metrics",
        "metrics": metrics_data,
        "timestamp": datetime.now().isoformat(),
        "source": "dashboard_update"
    }
    
    # Broadcast to all users in the same shop
    shop_room = f"shop_{current_user.get('shop_name', 'default')}"
    sent_count = await manager.broadcast_to_room(json.dumps(metrics_msg), shop_room)
    
    return {
        "status": "metrics_sent",
        "room": shop_room,
        "connections_reached": sent_count
    }

# AI Training endpoints
training_service = AITrainingService()

@app.post("/api/v1/ai/knowledge")
async def add_knowledge(
    knowledge: dict,
    current_user: dict = Depends(get_current_user)
):
    """Add knowledge to AI training database"""
    try:
        knowledge_id = training_service.add_knowledge(
            category=knowledge.get("category"),
            title=knowledge.get("title"),
            content=knowledge.get("content"),
            metadata={
                "user_id": current_user["id"],
                "shop_name": current_user.get("shop_name")
            }
        )
        
        return {
            "status": "success",
            "knowledge_id": knowledge_id,
            "message": "Knowledge added successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/v1/ai/knowledge")
async def get_knowledge(
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get knowledge from database"""
    knowledge = training_service.get_relevant_knowledge(
        query="",
        category=category,
        limit=20
    )
    return {"knowledge": knowledge}

@app.post("/api/v1/ai/training-example")
async def add_training_example(
    example: dict,
    current_user: dict = Depends(get_current_user)
):
    """Add successful conversation as training example"""
    example_id = training_service.add_training_example(
        question=example.get("question"),
        answer=example.get("answer"),
        category=example.get("category"),
        user_id=current_user["id"],
        effectiveness=example.get("effectiveness", 1.0)
    )
    
    return {
        "status": "success",
        "example_id": example_id,
        "message": "Training example added"
    }

@app.post("/api/v1/ai/custom-prompt")
async def update_custom_prompt(
    prompt_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update custom prompts for AI agents"""
    training_service.update_custom_prompt(
        agent_id=prompt_data.get("agent_id"),
        prompt_type=prompt_data.get("prompt_type", "system"),
        prompt_text=prompt_data.get("prompt_text")
    )
    
    return {
        "status": "success",
        "message": "Custom prompt updated"
    }

@app.get("/api/v1/ai/stats")
async def get_training_stats(current_user: dict = Depends(get_current_user)):
    """Get AI training statistics"""
    stats = training_service.calculate_knowledge_stats()
    return stats

@app.post("/api/v1/ai/import-csv")
async def import_csv_knowledge(
    file: UploadFile = File(...),
    category: str = "general",
    current_user: dict = Depends(get_current_user)
):
    """Import knowledge from CSV file"""
    # Save uploaded file temporarily
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    try:
        training_service.import_csv_knowledge(temp_path, category)
        os.remove(temp_path)  # Clean up
        
        return {
            "status": "success",
            "message": f"CSV knowledge imported to {category} category"
        }
    except Exception as e:
        os.remove(temp_path)  # Clean up
        raise HTTPException(status_code=400, detail=str(e))

# Enhanced AI Agent with custom knowledge
class EnhancedAIAgent(AIAgent):
    """AI Agent that uses custom training data"""
    
    def __init__(self, agent_id: str, name: str, system_prompt: str):
        super().__init__(agent_id, name, system_prompt)
        self.training_service = AITrainingService()
    
    async def generate_response(self, message: str, conversation_history: List[dict] = None) -> dict:
        """Generate response using custom knowledge"""
        
        # Get custom prompt if available
        custom_prompt = self.training_service.get_custom_prompt(self.agent_id)
        if custom_prompt:
            self.system_prompt = custom_prompt
        
        # Get relevant knowledge
        relevant_knowledge = self.training_service.get_relevant_knowledge(message, limit=3)
        
        # Add knowledge to context
        knowledge_context = ""
        if relevant_knowledge:
            knowledge_context = "\n\nRelevant business knowledge:\n"
            for k in relevant_knowledge:
                knowledge_context += f"- {k['title']}: {k['content']}\n"
        
        # Enhanced prompt with knowledge
        enhanced_message = message
        if knowledge_context:
            enhanced_message = f"{message}\n{knowledge_context}"
        
        # Get base response
        response = await super().generate_response(enhanced_message, conversation_history)
        
        # Store successful interaction for future training
        if response.get("response"):
            self.training_service.add_training_example(
                question=message,
                answer=response["response"],
                category=self.agent_id,
                effectiveness=0.8  # Default score
            )
        
        return response

# Replace standard agents with enhanced versions
ai_agents = {
    "business_coach": EnhancedAIAgent(
        "business_coach",
        "Business Coach",
        "You are an expert business coach for barbershops. Provide strategic advice on growing the business, improving operations, and increasing customer satisfaction."
    ),
    "marketing_expert": EnhancedAIAgent(
        "marketing_expert",
        "Marketing Expert",
        "You are a marketing expert specializing in barbershops and salons. Help with social media strategies, promotional campaigns, and customer acquisition."
    ),
    "financial_advisor": EnhancedAIAgent(
        "financial_advisor",
        "Financial Advisor",
        "You are a financial advisor for barbershop businesses. Provide guidance on pricing, expense management, revenue optimization, and financial planning."
    )
}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True)
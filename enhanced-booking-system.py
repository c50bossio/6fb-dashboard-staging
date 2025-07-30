#!/usr/bin/env python3
"""
Enhanced Intelligent Booking System
Barber-first selection with AI-powered behavioral learning and Google Calendar integration
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from enum import Enum
import uvicorn
import asyncio
import json
import jwt
import bcrypt
import sqlite3
import os
import uuid

app = FastAPI(title="6FB Enhanced Booking System", description="Intelligent booking system with barber-first selection and AI learning")

# Authentication Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "your-jwt-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Security
security = HTTPBearer()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:9999"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enums
class UserRole(str, Enum):
    BARBER = "barber"
    MANAGER = "manager" 
    ADMIN = "admin"
    CUSTOMER = "customer"

class AuthProvider(str, Enum):
    EMAIL = "email"
    GOOGLE = "google"
    APPLE = "apple"
    FACEBOOK = "facebook"

class BookingStatus(str, Enum):
    CONFIRMED = "confirmed"
    PENDING = "pending"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"

class WaitlistStatus(str, Enum):
    ACTIVE = "active"
    NOTIFIED = "notified"
    EXPIRED = "expired"
    BOOKED = "booked"

# Database setup with enhanced schema
def init_booking_database():
    """Initialize SQLite database with enhanced booking system schema"""
    conn = sqlite3.connect('booking_system.db')
    cursor = conn.cursor()
    
    # Users table with enhanced authentication
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT,
            full_name TEXT NOT NULL,
            phone TEXT,
            role TEXT NOT NULL DEFAULT 'customer',
            auth_provider TEXT NOT NULL DEFAULT 'email',
            social_id TEXT,
            profile_image_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE
        )
    ''')
    
    # Locations table for multi-location support
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS locations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            google_calendar_id TEXT,
            timezone TEXT DEFAULT 'America/New_York',
            business_hours TEXT, -- JSON
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE
        )
    ''')
    
    # Barbers table with location assignment and role-based access
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS barbers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            location_id INTEGER,
            display_name TEXT NOT NULL,
            bio TEXT,
            profile_image_url TEXT,
            google_calendar_id TEXT UNIQUE,
            is_available BOOLEAN DEFAULT TRUE,
            hourly_rate DECIMAL(5,2),
            commission_rate DECIMAL(3,2),
            specialties TEXT, -- JSON array
            years_experience INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (location_id) REFERENCES locations (id)
        )
    ''')
    
    # Services table with barber-specific customization
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            base_price DECIMAL(5,2) NOT NULL,
            base_duration INTEGER NOT NULL, -- minutes
            category TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Barber services - customizable duration and pricing per barber
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS barber_services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            barber_id INTEGER,
            service_id INTEGER,
            custom_price DECIMAL(5,2),
            custom_duration INTEGER, -- minutes
            buffer_time INTEGER DEFAULT 5, -- minutes
            is_available BOOLEAN DEFAULT TRUE,
            FOREIGN KEY (barber_id) REFERENCES barbers (id),
            FOREIGN KEY (service_id) REFERENCES services (id),
            UNIQUE(barber_id, service_id)
        )
    ''')
    
    # Appointments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            barber_id INTEGER,
            service_id INTEGER,
            location_id INTEGER,
            appointment_datetime TIMESTAMP NOT NULL,
            duration INTEGER NOT NULL, -- minutes
            price DECIMAL(5,2) NOT NULL,
            status TEXT NOT NULL DEFAULT 'confirmed',
            notes TEXT,
            google_calendar_event_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES users (id),
            FOREIGN KEY (barber_id) REFERENCES barbers (id),
            FOREIGN KEY (service_id) REFERENCES services (id),
            FOREIGN KEY (location_id) REFERENCES locations (id)
        )
    ''')
    
    # Customer behavior learning table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS customer_behavior (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            barber_preferences TEXT, -- JSON: preferred barber IDs with weights
            service_patterns TEXT, -- JSON: service history and patterns
            timing_preferences TEXT, -- JSON: preferred days, times, frequency
            communication_preferences TEXT, -- JSON: SMS vs email, timing, etc
            booking_behavior TEXT, -- JSON: advance booking patterns, cancellation history
            seasonal_patterns TEXT, -- JSON: seasonal service variations
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES users (id),
            UNIQUE(customer_id)
        )
    ''')
    
    # Waitlist table with FIFO ordering
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS waitlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER,
            barber_id INTEGER, -- NULL for "any barber"
            service_id INTEGER,
            location_id INTEGER,
            preferred_datetime TIMESTAMP,
            alternative_datetimes TEXT, -- JSON array of alternative times
            status TEXT NOT NULL DEFAULT 'active',
            queue_position INTEGER,
            notification_sent_at TIMESTAMP,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES users (id),
            FOREIGN KEY (barber_id) REFERENCES barbers (id),
            FOREIGN KEY (service_id) REFERENCES services (id),
            FOREIGN KEY (location_id) REFERENCES locations (id)
        )
    ''')
    
    # Google Calendar integration tracking
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS calendar_sync (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            barber_id INTEGER,
            google_calendar_id TEXT NOT NULL,
            access_token TEXT NOT NULL,
            refresh_token TEXT NOT NULL,
            token_expires_at TIMESTAMP,
            last_sync_at TIMESTAMP,
            sync_status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (barber_id) REFERENCES barbers (id),
            UNIQUE(barber_id)
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_booking_database()

# Pydantic models
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER

class UserRegister(UserBase):
    password: Optional[str] = None
    auth_provider: AuthProvider = AuthProvider.EMAIL
    social_id: Optional[str] = None

class UserResponse(UserBase):
    id: int
    auth_provider: AuthProvider
    profile_image_url: Optional[str] = None
    created_at: datetime
    is_active: bool

class LocationCreate(BaseModel):
    name: str
    address: str
    phone: Optional[str] = None
    email: Optional[str] = None
    timezone: str = "America/New_York"
    business_hours: Optional[Dict[str, Any]] = None

class LocationResponse(LocationCreate):
    id: int
    google_calendar_id: Optional[str] = None
    created_at: datetime
    is_active: bool

class BarberCreate(BaseModel):
    user_id: int
    location_id: int
    display_name: str
    bio: Optional[str] = None
    specialties: Optional[List[str]] = None
    years_experience: Optional[int] = None
    hourly_rate: Optional[float] = None

class BarberResponse(BarberCreate):
    id: int
    profile_image_url: Optional[str] = None
    google_calendar_id: Optional[str] = None
    is_available: bool
    created_at: datetime

class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    base_price: float
    base_duration: int  # minutes
    category: Optional[str] = None

class ServiceResponse(ServiceCreate):
    id: int
    is_active: bool
    created_at: datetime

class BarberServiceCustomization(BaseModel):
    barber_id: int
    service_id: int
    custom_price: Optional[float] = None
    custom_duration: Optional[int] = None
    buffer_time: int = 5
    is_available: bool = True

class BarberServiceResponse(BarberServiceCustomization):
    id: int
    service_name: str
    service_description: Optional[str] = None
    final_price: float
    final_duration: int

class AppointmentCreate(BaseModel):
    customer_id: int
    barber_id: int
    service_id: int
    location_id: int
    appointment_datetime: datetime
    notes: Optional[str] = None

class AppointmentResponse(AppointmentCreate):
    id: int
    duration: int
    price: float
    status: BookingStatus
    google_calendar_event_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class WaitlistCreate(BaseModel):
    customer_id: int
    barber_id: Optional[int] = None  # None for "any barber"
    service_id: int
    location_id: int
    preferred_datetime: datetime
    alternative_datetimes: Optional[List[datetime]] = None

class WaitlistResponse(WaitlistCreate):
    id: int
    status: WaitlistStatus
    queue_position: int
    notification_sent_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

class CustomerBehaviorData(BaseModel):
    customer_id: int
    barber_preferences: Dict[str, float]  # barber_id -> preference weight
    service_patterns: Dict[str, Any]
    timing_preferences: Dict[str, Any]
    communication_preferences: Dict[str, Any]
    booking_behavior: Dict[str, Any]
    seasonal_patterns: Dict[str, Any]

# Authentication utilities (keeping existing system)
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserResponse:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    # Get user from database
    conn = sqlite3.connect('booking_system.db')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()
    
    if row is None:
        raise credentials_exception
    
    return UserResponse(
        id=row[0],
        email=row[1],
        full_name=row[3],
        phone=row[4],
        role=UserRole(row[5]),
        auth_provider=AuthProvider(row[6]),
        profile_image_url=row[8],
        created_at=datetime.fromisoformat(row[9]),
        is_active=row[11]
    )

# API Endpoints
@app.post("/api/v1/auth/register", response_model=dict)
async def register_user(user: UserRegister):
    """Register a new user with multiple authentication providers"""
    try:
        conn = sqlite3.connect('booking_system.db')
        cursor = conn.cursor()
        
        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE email = ?", (user.email,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password if provided (for email auth)
        hashed_password = None
        if user.password:
            hashed_password = get_password_hash(user.password)
        
        # Insert new user
        cursor.execute("""
            INSERT INTO users (email, hashed_password, full_name, phone, role, auth_provider, social_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (user.email, hashed_password, user.full_name, user.phone, 
              user.role.value, user.auth_provider.value, user.social_id))
        
        conn.commit()
        conn.close()
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )

# Multi-Authentication System Endpoints

class EmailRegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    phone: Optional[str] = None
    role: str = "customer"

class EmailLoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/v1/auth/email/register")
async def register_email_user(request: EmailRegisterRequest):
    """Register user with email and password"""
    try:
        user_role = UserRole(request.role)
        result = multi_auth_system.register_email_user(
            email=request.email,
            password=request.password,
            full_name=request.full_name,
            phone=request.phone,
            role=user_role
        )
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error_message)
        
        return {
            "success": True,
            "access_token": result.access_token,
            "refresh_token": result.refresh_token,
            "token_type": "bearer",
            "user": result.user_info
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid role: {request.role}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/auth/email/login")
async def login_email_user(request: EmailLoginRequest):
    """Authenticate user with email and password"""
    result = multi_auth_system.authenticate_email_user(request.email, request.password)
    
    if not result.success:
        raise HTTPException(status_code=401, detail=result.error_message)
    
    return {
        "success": True,
        "access_token": result.access_token,  
        "refresh_token": result.refresh_token,
        "token_type": "bearer",
        "user": result.user_info
    }

@app.get("/api/v1/auth/{provider}/authorize")
async def get_social_auth_url(provider: str, state: Optional[str] = None):
    """Get social authentication URL"""
    try:
        auth_provider = AuthProvider(provider)
        auth_url = multi_auth_system.get_social_auth_url(auth_provider, state)
        
        return {
            "success": True,
            "authorization_url": auth_url,
            "provider": provider
        }
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/auth/{provider}/callback")
async def handle_social_callback(provider: str, code: str, state: str):
    """Handle social authentication callback"""
    try:
        auth_provider = AuthProvider(provider)
        result = multi_auth_system.handle_social_callback(auth_provider, code, state)
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error_message)
        
        return {
            "success": True,
            "access_token": result.access_token,
            "refresh_token": result.refresh_token,
            "token_type": "bearer",
            "user": result.user_info
        }
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class RefreshTokenRequest(BaseModel):
    refresh_token: str

@app.post("/api/v1/auth/refresh")
async def refresh_token(request: RefreshTokenRequest):
    """Refresh access token"""
    result = multi_auth_system.refresh_access_token(request.refresh_token)
    
    if not result.success:
        raise HTTPException(status_code=401, detail=result.error_message)
    
    return {
        "success": True,
        "access_token": result.access_token,
        "refresh_token": result.refresh_token,
        "token_type": "bearer",
        "user": result.user_info
    }

@app.get("/api/v1/auth/methods")
async def get_user_auth_methods(current_user: UserResponse = Depends(get_current_user)):
    """Get all authentication methods for current user"""
    auth_methods = multi_auth_system.get_user_auth_methods(current_user.id)
    
    return {
        "success": True,
        "user_id": current_user.id,
        "auth_methods": auth_methods
    }

@app.post("/api/v1/auth/{provider}/link")
async def link_social_account(
    provider: str,
    authorization_code: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Link additional social account to current user"""
    try:
        auth_provider = AuthProvider(provider)
        result = multi_auth_system.link_social_account(
            current_user.id, auth_provider, authorization_code
        )
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error_message)
        
        return {
            "success": True,
            "message": result.user_info.get("message"),
            "provider": provider
        }
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/v1/auth/{provider}/unlink")
async def unlink_social_account(
    provider: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Unlink social account from current user"""
    try:
        auth_provider = AuthProvider(provider)
        success = multi_auth_system.unlink_social_account(current_user.id, auth_provider)
        
        if not success:
            raise HTTPException(status_code=404, detail=f"No {provider} account linked")
        
        return {
            "success": True,
            "message": f"{provider.title()} account unlinked successfully"
        }
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/locations", response_model=List[LocationResponse])
async def get_locations(current_user: UserResponse = Depends(get_current_user)):
    """Get all locations (filtered by role)"""
    conn = sqlite3.connect('booking_system.db')
    cursor = conn.cursor()
    
    if current_user.role == UserRole.ADMIN:
        cursor.execute("SELECT * FROM locations WHERE is_active = TRUE")
    elif current_user.role == UserRole.MANAGER:
        # Managers can only see their assigned locations
        cursor.execute("""
            SELECT l.* FROM locations l
            JOIN barbers b ON l.id = b.location_id
            WHERE b.user_id = ? AND l.is_active = TRUE
        """, (current_user.id,))
    else:
        cursor.execute("SELECT * FROM locations WHERE is_active = TRUE")
    
    rows = cursor.fetchall()
    conn.close()
    
    locations = []
    for row in rows:
        business_hours = json.loads(row[7]) if row[7] else None
        locations.append(LocationResponse(
            id=row[0],
            name=row[1],
            address=row[2],
            phone=row[3],
            email=row[4],
            google_calendar_id=row[5],
            timezone=row[6],
            business_hours=business_hours,
            created_at=datetime.fromisoformat(row[8]),
            is_active=row[9]
        ))
    
    return locations

@app.get("/api/v1/barbers", response_model=List[BarberResponse])
async def get_barbers(
    location_id: Optional[int] = None,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get barbers (filtered by location and role)"""
    conn = sqlite3.connect('booking_system.db')
    cursor = conn.cursor()
    
    query = "SELECT * FROM barbers WHERE is_available = TRUE"
    params = []
    
    if location_id:
        query += " AND location_id = ?"
        params.append(location_id)
    
    # Role-based filtering
    if current_user.role == UserRole.MANAGER:
        # Managers see barbers at their locations only
        query += " AND location_id IN (SELECT location_id FROM barbers WHERE user_id = ?)"
        params.append(current_user.id)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    barbers = []
    for row in rows:
        specialties = json.loads(row[10]) if row[10] else []
        barbers.append(BarberResponse(
            id=row[0],
            user_id=row[1],
            location_id=row[2],
            display_name=row[3],
            bio=row[4],
            profile_image_url=row[5],
            google_calendar_id=row[6],
            is_available=row[7],
            hourly_rate=row[8],
            specialties=specialties,
            years_experience=row[11],
            created_at=datetime.fromisoformat(row[12])
        ))
    
    return barbers

@app.get("/api/v1/barbers/{barber_id}/services", response_model=List[BarberServiceResponse])
async def get_barber_services(barber_id: int):
    """Get services offered by specific barber with custom pricing/duration"""
    conn = sqlite3.connect('booking_system.db')
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT bs.*, s.name, s.description, s.base_price, s.base_duration
        FROM barber_services bs
        JOIN services s ON bs.service_id = s.id
        WHERE bs.barber_id = ? AND bs.is_available = TRUE AND s.is_active = TRUE
    """, (barber_id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    services = []
    for row in rows:
        final_price = row[3] if row[3] else row[9]  # custom_price or base_price
        final_duration = row[4] if row[4] else row[10]  # custom_duration or base_duration
        
        services.append(BarberServiceResponse(
            id=row[0],
            barber_id=row[1],
            service_id=row[2],
            custom_price=row[3],
            custom_duration=row[4],
            buffer_time=row[5],
            is_available=row[6],
            service_name=row[7],
            service_description=row[8],
            final_price=final_price,
            final_duration=final_duration
        ))
    
    return services

@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "6FB Enhanced Booking System",
        "version": "1.0.0",
        "features": [
            "barber_first_selection",
            "ai_behavioral_learning", 
            "role_based_access",
            "google_calendar_integration",
            "intelligent_waitlist"
        ],
        "timestamp": datetime.now().isoformat()
    }

# Import enhanced modules
from google_calendar_integration import calendar_service
from ai_behavioral_learning import behavior_analyzer
from intelligent_waitlist import waitlist_manager
from role_based_calendar_manager import role_calendar_manager
from multi_auth_system import multi_auth_system, AuthProvider

# Enhanced API Endpoints

@app.post("/api/v1/appointments", response_model=AppointmentResponse)
async def create_appointment(
    appointment: AppointmentCreate,
    current_user: UserResponse = Depends(get_current_user)
):
    """Create new appointment with Google Calendar sync and behavior learning"""
    try:
        conn = sqlite3.connect('booking_system.db')
        cursor = conn.cursor()
        
        # Get service details and calculate final price/duration
        cursor.execute("""
            SELECT bs.custom_price, bs.custom_duration, bs.buffer_time,
                   s.base_price, s.base_duration, s.name
            FROM barber_services bs
            JOIN services s ON bs.service_id = s.id
            WHERE bs.barber_id = ? AND bs.service_id = ? AND bs.is_available = TRUE
        """, (appointment.barber_id, appointment.service_id))
        
        service_data = cursor.fetchone()
        if not service_data:
            raise HTTPException(status_code=404, detail="Service not available for this barber")
        
        custom_price, custom_duration, buffer_time, base_price, base_duration, service_name = service_data
        final_price = custom_price or base_price
        final_duration = custom_duration or base_duration
        
        # Check Google Calendar availability
        is_available = calendar_service.check_availability(
            appointment.barber_id,
            appointment.appointment_datetime,
            final_duration + buffer_time
        )
        
        if not is_available:
            raise HTTPException(status_code=409, detail="Time slot not available")
        
        # Create appointment in database
        cursor.execute("""
            INSERT INTO appointments 
            (customer_id, barber_id, service_id, location_id, appointment_datetime,
             duration, price, status, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """, (appointment.customer_id, appointment.barber_id, appointment.service_id,
              appointment.location_id, appointment.appointment_datetime.isoformat(),
              final_duration, final_price, BookingStatus.CONFIRMED.value, appointment.notes))
        
        appointment_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Sync to Google Calendar
        calendar_service.sync_appointment_to_calendar(appointment_id)
        
        # Update customer behavior learning
        behavior_analyzer.analyze_customer_behavior(appointment.customer_id)
        
        return AppointmentResponse(
            id=appointment_id,
            customer_id=appointment.customer_id,
            barber_id=appointment.barber_id,
            service_id=appointment.service_id,
            location_id=appointment.location_id,
            appointment_datetime=appointment.appointment_datetime,
            duration=final_duration,
            price=final_price,
            status=BookingStatus.CONFIRMED,
            notes=appointment.notes,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating appointment: {str(e)}"
        )

@app.get("/api/v1/barbers/{barber_id}/availability")
async def get_barber_availability(
    barber_id: int,
    date: str,  # YYYY-MM-DD format
    service_id: int
):
    """Get available time slots for barber on specific date"""
    try:
        # Parse date
        target_date = datetime.strptime(date, "%Y-%m-%d")
        
        # Get service duration
        conn = sqlite3.connect('booking_system.db')
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT bs.custom_duration, s.base_duration
            FROM barber_services bs
            JOIN services s ON bs.service_id = s.id
            WHERE bs.barber_id = ? AND bs.service_id = ?
        """, (barber_id, service_id))
        
        duration_data = cursor.fetchone()
        conn.close()
        
        if not duration_data:
            raise HTTPException(status_code=404, detail="Service not available for this barber")
        
        custom_duration, base_duration = duration_data
        service_duration = custom_duration or base_duration
        
        # Get available slots from Google Calendar
        available_slots = calendar_service.get_available_slots(barber_id, target_date, service_duration)
        
        return {
            "barber_id": barber_id,
            "date": date,
            "service_duration": service_duration,
            "available_slots": [slot.isoformat() for slot in available_slots]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting availability: {str(e)}"
        )

@app.post("/api/v1/waitlist")
async def add_to_waitlist(
    request: WaitlistCreate,
    current_user: UserResponse = Depends(get_current_user)
):
    """Add customer to waitlist for specific appointment slot"""
    result = waitlist_manager.add_to_waitlist(
        customer_id=request.customer_id,
        barber_id=request.barber_id,
        service_id=request.service_id,
        location_id=request.location_id,
        preferred_datetime=request.preferred_datetime,
        alternative_datetimes=request.alternative_datetimes
    )
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['message'])
    
    return result

@app.delete("/api/v1/waitlist/{waitlist_id}")
async def remove_from_waitlist(
    waitlist_id: int,
    current_user: UserResponse = Depends(get_current_user)
):
    """Remove customer from waitlist"""
    result = waitlist_manager.remove_from_waitlist(waitlist_id, current_user.id)
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['message'])
    
    return result

@app.get("/api/v1/customers/{customer_id}/waitlist")
async def get_customer_waitlist_status(
    customer_id: int,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get customer's current waitlist entries"""
    # Verify customer access
    if current_user.role == UserRole.CUSTOMER and current_user.id != customer_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return waitlist_manager.get_customer_waitlist_status(customer_id)

@app.post("/api/v1/waitlist/{waitlist_id}/book")
async def book_from_waitlist(
    waitlist_id: int,
    current_user: UserResponse = Depends(get_current_user)
):
    """Book appointment from waitlist notification"""
    result = waitlist_manager.book_from_waitlist(waitlist_id, current_user.id)
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['message'])
    
    return result

@app.get("/api/v1/customers/{customer_id}/behavior-analysis")
async def get_customer_behavior_analysis(
    customer_id: int,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get AI behavior analysis for customer"""
    # Verify access permissions
    if (current_user.role == UserRole.CUSTOMER and current_user.id != customer_id) or \
       (current_user.role == UserRole.BARBER):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return behavior_analyzer.analyze_customer_behavior(customer_id)

@app.get("/api/v1/customers/{customer_id}/rebooking-suggestion")
async def get_rebooking_suggestion(
    customer_id: int,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get intelligent rebooking suggestion for customer"""
    suggestion = behavior_analyzer.get_rebooking_suggestion(customer_id)
    
    if not suggestion:
        return {"message": "No rebooking suggestion available yet"}
    
    return suggestion

@app.get("/api/v1/auth/google/authorize/{barber_id}")
async def google_calendar_authorize(
    barber_id: int,
    current_user: UserResponse = Depends(get_current_user)
):
    """Initiate Google Calendar OAuth for barber"""
    # Verify barber can authorize their own calendar
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        # Check if user is the barber
        conn = sqlite3.connect('booking_system.db')
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM barbers WHERE id = ?", (barber_id,))
        barber_user_id = cursor.fetchone()
        conn.close()
        
        if not barber_user_id or barber_user_id[0] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    auth_url = calendar_service.get_authorization_url(barber_id)
    return {"authorization_url": auth_url}

@app.get("/api/v1/analytics/waitlist")
async def get_waitlist_analytics(
    location_id: Optional[int] = None,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get waitlist analytics for business intelligence"""
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return waitlist_manager.get_waitlist_analytics(location_id)

# Role-Based Calendar Management Endpoints

@app.get("/api/v1/calendar/access")
async def get_user_calendar_access(
    current_user: UserResponse = Depends(get_current_user)
):
    """Get user's calendar access permissions and available barbers"""
    try:
        access = role_calendar_manager.get_user_calendar_access(current_user.id)
        accessible_barbers = role_calendar_manager.get_accessible_barber_calendars(current_user.id)
        
        return {
            "user_id": current_user.id,
            "role": access.role,
            "permissions": access.permissions,
            "can_modify": access.can_modify,
            "can_book_for_others": access.can_book_for_others,
            "accessible_locations": access.accessible_locations,
            "accessible_barbers": accessible_barbers
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving calendar access: {str(e)}")

@app.post("/api/v1/calendar/barbers/{barber_id}/authorize")
async def authorize_barber_calendar(
    barber_id: int,
    current_user: UserResponse = Depends(get_current_user)
):
    """Initiate Google Calendar authorization for a barber"""
    result = role_calendar_manager.authorize_barber_calendar(current_user.id, barber_id)
    
    if not result['success']:
        raise HTTPException(status_code=403, detail=result['message'])
    
    return result

@app.get("/api/v1/calendar/barbers/{barber_id}/availability")
async def get_barber_calendar_availability(
    barber_id: int,
    date: str,  # YYYY-MM-DD format
    service_duration: int,
    current_user: UserResponse = Depends(get_current_user)
):
    """Get barber availability with role-based access control"""
    try:
        target_date = datetime.strptime(date, "%Y-%m-%d")
        result = role_calendar_manager.get_barber_availability(
            current_user.id, barber_id, target_date, service_duration
        )
        
        if not result['success']:
            raise HTTPException(status_code=403, detail=result['message'])
        
        return result
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving availability: {str(e)}")

@app.post("/api/v1/calendar/appointments")
async def create_appointment_with_calendar_sync(
    appointment_data: Dict[str, Any],
    current_user: UserResponse = Depends(get_current_user)
):
    """Create appointment with calendar sync and role validation"""
    
    # Parse appointment datetime
    if isinstance(appointment_data.get('appointment_datetime'), str):
        appointment_data['appointment_datetime'] = datetime.fromisoformat(appointment_data['appointment_datetime'])
    
    result = role_calendar_manager.create_appointment_with_calendar(
        current_user.id, appointment_data
    )
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['message'])
    
    return result

@app.get("/api/v1/calendar/locations/{location_id}/summary")
async def get_location_calendar_summary(
    location_id: int,
    start_date: str,  # YYYY-MM-DD format
    end_date: str,    # YYYY-MM-DD format
    current_user: UserResponse = Depends(get_current_user)
):
    """Get calendar summary for a location (Manager/Admin only)"""
    try:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        
        result = role_calendar_manager.get_location_calendar_summary(
            current_user.id, location_id, (start_dt, end_dt)
        )
        
        if not result['success']:
            raise HTTPException(status_code=403, detail=result['message'])
        
        return result
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving calendar summary: {str(e)}")

@app.delete("/api/v1/calendar/barbers/{barber_id}/disconnect")
async def disconnect_barber_calendar(
    barber_id: int,
    current_user: UserResponse = Depends(get_current_user)
):
    """Disconnect barber's Google Calendar (Admin/Manager only)"""
    result = role_calendar_manager.disconnect_barber_calendar(current_user.id, barber_id)
    
    if not result['success']:
        raise HTTPException(status_code=403, detail=result['message'])
    
    return result

if __name__ == "__main__":
    print("🚀 Starting 6FB Enhanced Booking System...")
    print("🎯 Barber-First Selection: Active")
    print("🧠 AI Behavioral Learning: Enabled")
    print("👥 Role-Based Access: Admin/Manager/Barber/Customer")
    print("📅 Google Calendar Integration: Ready")
    print("⏳ FIFO Waitlist System: Active")
    print("🔐 Multi-Auth Support: Google/Apple/Facebook/Email")
    print("🤖 Intelligent Rebooking: AI-Powered")
    print("📊 Business Analytics: Real-time")
    
    uvicorn.run(
        "enhanced-booking-system:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        access_log=True
    )
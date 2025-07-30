#!/usr/bin/env python3
"""
Simple SQLite-based FastAPI Server for 6FB AI Agent System Demo
Quick demo version to test the booking flow without Docker/PostgreSQL
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import sqlite3
import json
from datetime import datetime, timedelta
import uuid

app = FastAPI(title="6FB AI Agent System - Demo", description="Simple booking system demo")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:9999", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SQLite database
def init_db():
    conn = sqlite3.connect('booking_demo.db')
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS barbershops (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            address TEXT,
            city TEXT,
            state TEXT,
            phone TEXT,
            email TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT,
            role TEXT DEFAULT 'BARBER'
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS services (
            id TEXT PRIMARY KEY,
            barbershop_id TEXT,
            name TEXT NOT NULL,
            description TEXT,
            base_duration_minutes INTEGER,
            base_price REAL,
            category TEXT
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS barber_services (
            id TEXT PRIMARY KEY,
            barber_id TEXT,
            service_id TEXT,
            barbershop_id TEXT,
            duration_minutes INTEGER,
            price REAL,
            skill_level TEXT,
            specialty_notes TEXT
        )
    ''')
    
    # Insert sample data
    barbershop_id = "550e8400-e29b-41d4-a716-446655440000"
    
    cursor.execute('''
        INSERT OR REPLACE INTO barbershops 
        (id, name, address, city, state, phone, email)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (barbershop_id, "Development Shop", "123 Main St", "San Francisco", "CA", "(555) 123-4567", "dev@6fb.local"))
    
    # Insert barbers
    mike_id = str(uuid.uuid4())
    no_pref_id = "no-preference"
    
    cursor.execute('''
        INSERT OR REPLACE INTO users (id, name, email, role)
        VALUES (?, ?, ?, ?)
    ''', (mike_id, "Mike Barber", "mike@example.com", "BARBER"))
    
    cursor.execute('''
        INSERT OR REPLACE INTO users (id, name, email, role)
        VALUES (?, ?, ?, ?)
    ''', (no_pref_id, "No Preference", "", "BARBER"))
    
    # Insert base services
    haircut_id = str(uuid.uuid4())
    beard_id = str(uuid.uuid4())
    
    cursor.execute('''
        INSERT OR REPLACE INTO services 
        (id, barbershop_id, name, description, base_duration_minutes, base_price, category)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (haircut_id, barbershop_id, "Classic Haircut", "Traditional men's haircut", 30, 35.00, "haircut"))
    
    cursor.execute('''
        INSERT OR REPLACE INTO services 
        (id, barbershop_id, name, description, base_duration_minutes, base_price, category)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (beard_id, barbershop_id, "Beard Trim", "Professional beard shaping", 15, 20.00, "beard"))
    
    # Insert barber-specific services
    cursor.execute('''
        INSERT OR REPLACE INTO barber_services 
        (id, barber_id, service_id, barbershop_id, duration_minutes, price, skill_level, specialty_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (str(uuid.uuid4()), mike_id, haircut_id, barbershop_id, 25, 35.00, "expert", "Specializes in modern and classic styles"))
    
    cursor.execute('''
        INSERT OR REPLACE INTO barber_services 
        (id, barber_id, service_id, barbershop_id, duration_minutes, price, skill_level, specialty_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (str(uuid.uuid4()), mike_id, beard_id, barbershop_id, 12, 20.00, "expert", "Master of beard sculpting"))
    
    # No preference barber services (default timing)
    cursor.execute('''
        INSERT OR REPLACE INTO barber_services 
        (id, barber_id, service_id, barbershop_id, duration_minutes, price, skill_level, specialty_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (str(uuid.uuid4()), no_pref_id, haircut_id, barbershop_id, 30, 35.00, "standard", "Any available barber"))
    
    cursor.execute('''
        INSERT OR REPLACE INTO barber_services 
        (id, barber_id, service_id, barbershop_id, duration_minutes, price, skill_level, specialty_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (str(uuid.uuid4()), no_pref_id, beard_id, barbershop_id, 15, 20.00, "standard", "Any available barber"))
    
    conn.commit()
    conn.close()

# Pydantic models
class BarbershopResponse(BaseModel):
    id: str
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class ServiceInfo(BaseModel):
    id: str
    service_id: str
    name: str
    description: Optional[str] = None
    duration_minutes: int
    price: float
    skill_level: Optional[str] = None
    specialty_notes: Optional[str] = None
    category: Optional[str] = None

class BarberResponse(BaseModel):
    id: str
    name: str
    specialty: Optional[str] = None
    experience: Optional[str] = None
    bio: Optional[str] = None
    services: List[ServiceInfo] = []

class AvailabilitySlot(BaseModel):
    start_time: str
    end_time: str
    duration_minutes: int
    available: bool = True

# API Endpoints
@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy", "message": "6FB AI Agent System is running"}

@app.get("/api/v1/public/barbershops", response_model=List[BarbershopResponse])
async def list_public_barbershops():
    conn = sqlite3.connect('booking_demo.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM barbershops")
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

@app.get("/api/v1/public/barbershops/{barbershop_id}")
async def get_barbershop(barbershop_id: str):
    conn = sqlite3.connect('booking_demo.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM barbershops WHERE id = ?", (barbershop_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Barbershop not found")
    
    return dict(row)

@app.get("/api/v1/public/barbershops/{barbershop_id}/barbers", response_model=List[BarberResponse])
async def get_barbershop_barbers(barbershop_id: str):
    conn = sqlite3.connect('booking_demo.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get barbers with their services
    cursor.execute('''
        SELECT DISTINCT u.id, u.name 
        FROM users u
        JOIN barber_services bs ON u.id = bs.barber_id
        WHERE bs.barbershop_id = ?
    ''', (barbershop_id,))
    
    barbers = []
    for row in cursor.fetchall():
        barber = dict(row)
        
        # Get services for this barber
        cursor.execute('''
            SELECT bs.id, bs.service_id, s.name, s.description, bs.duration_minutes, 
                   bs.price, bs.skill_level, bs.specialty_notes, s.category
            FROM barber_services bs
            JOIN services s ON bs.service_id = s.id
            WHERE bs.barber_id = ? AND bs.barbershop_id = ?
        ''', (barber['id'], barbershop_id))
        
        services = []
        for service_row in cursor.fetchall():
            services.append(dict(service_row))
        
        barber['services'] = services
        barber['specialty'] = "Professional Barber"
        barber['experience'] = "5+ years experience"
        barber['bio'] = f"Expert barber specializing in {len(services)} services"
        
        barbers.append(barber)
    
    conn.close()
    return barbers

@app.get("/api/v1/public/barbers/{barber_id}/availability")
async def get_public_barber_availability(
    barber_id: str,
    barbershop_id: str,
    start_date: str,
    end_date: str,
    service_duration_minutes: int = 30
):
    # Generate mock availability slots
    slots = []
    try:
        start = datetime.fromisoformat(start_date.replace('Z', ''))
        end = datetime.fromisoformat(end_date.replace('Z', ''))
    except ValueError:
        # Fallback to current date if parsing fails
        start = datetime.now()
        end = start + timedelta(days=7)
    
    # Start from tomorrow to ensure we have future slots
    current = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    end_limit = current + timedelta(days=7)  # Generate slots for next week
    
    while current < end_limit and len(slots) < 20:
        # Skip Sundays
        if current.weekday() == 6:
            current += timedelta(days=1)
            continue
            
        # Business hours: 9 AM - 6 PM
        for hour in range(9, 18):
            for minute in [0, 30]:
                slot_time = current.replace(hour=hour, minute=minute, second=0, microsecond=0)
                
                # Add slots (skip some randomly to simulate bookings)
                if len(slots) < 20 and (len(slots) % 3 != 0):  # Skip every 3rd slot
                    end_time = slot_time + timedelta(minutes=service_duration_minutes)
                    slots.append({
                        "start_time": slot_time.isoformat(),
                        "end_time": end_time.isoformat(),
                        "duration_minutes": service_duration_minutes,
                        "available": True
                    })
                
                if len(slots) >= 20:
                    break
            if len(slots) >= 20:
                break
        
        current += timedelta(days=1)
    
    return {"availability_slots": slots[:20]}  # Return first 20 slots

@app.on_event("startup")
async def startup_event():
    init_db()
    print("✅ SQLite database initialized with sample data")

if __name__ == "__main__":
    print("🚀 Starting 6FB AI Agent System - Simple Demo")
    print("💾 Using SQLite database for quick testing")
    print("🔗 API Endpoints: /api/v1/public/barbershops, /api/v1/health")
    print("🌐 CORS: Configured for Next.js integration")
    
    uvicorn.run(
        "simple-backend:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        access_log=True
    )
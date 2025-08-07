#!/usr/bin/env python3
"""
Initialize analytics database with sample data for testing
"""

import sqlite3
import os
from datetime import datetime, timedelta
import random
import uuid

DATABASE_PATH = "database/agent_system.db"

def create_tables():
    """Create necessary tables for analytics"""
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS barbershops (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        role TEXT DEFAULT 'CLIENT',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price DECIMAL(10,2),
        duration_minutes INTEGER
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        barbershop_id TEXT,
        client_id TEXT,
        barber_id TEXT,
        service_id TEXT,
        scheduled_at TIMESTAMP,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        status TEXT DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (barbershop_id) REFERENCES barbershops(id),
        FOREIGN KEY (client_id) REFERENCES users(id),
        FOREIGN KEY (barber_id) REFERENCES users(id),
        FOREIGN KEY (service_id) REFERENCES services(id)
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        appointment_id TEXT,
        amount DECIMAL(10,2),
        payment_type TEXT DEFAULT 'service',
        status TEXT DEFAULT 'COMPLETED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (appointment_id) REFERENCES appointments(id)
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS barbershop_barbers (
        barbershop_id TEXT,
        barber_id TEXT,
        PRIMARY KEY (barbershop_id, barber_id),
        FOREIGN KEY (barbershop_id) REFERENCES barbershops(id),
        FOREIGN KEY (barber_id) REFERENCES users(id)
    )
    """)
    
    conn.commit()
    conn.close()
    
    print("✅ Created database tables")

def insert_sample_data():
    """Insert sample data for analytics testing"""
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Sample barbershop
    barbershop_id = str(uuid.uuid4())
    cursor.execute(
        "INSERT OR REPLACE INTO barbershops (id, name, location) VALUES (?, ?, ?)",
        (barbershop_id, "Elite Cuts Barbershop", "Downtown Main St")
    )
    
    # Sample services
    services = [
        (str(uuid.uuid4()), "Classic Cut", 30.00, 30),
        (str(uuid.uuid4()), "Beard Trim", 20.00, 20),
        (str(uuid.uuid4()), "Full Service", 50.00, 60),
        (str(uuid.uuid4()), "Kids Cut", 25.00, 25),
        (str(uuid.uuid4()), "Straight Razor Shave", 35.00, 45),
    ]
    
    cursor.executemany(
        "INSERT OR REPLACE INTO services (id, name, price, duration_minutes) VALUES (?, ?, ?, ?)",
        services
    )
    
    # Sample users (clients and barbers)
    clients = []
    barbers = []
    
    # Create barbers
    for i, barber_name in enumerate(["Mike Johnson", "Carlos Rodriguez", "Anthony Williams", "Steve Davis"]):
        barber_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT OR REPLACE INTO users (id, email, full_name, role) VALUES (?, ?, ?, ?)",
            (barber_id, f"barber{i+1}@elitecuts.com", barber_name, "BARBER")
        )
        barbers.append(barber_id)
        
        # Link barbers to barbershop
        cursor.execute(
            "INSERT OR REPLACE INTO barbershop_barbers (barbershop_id, barber_id) VALUES (?, ?)",
            (barbershop_id, barber_id)
        )
    
    # Create clients
    client_names = [
        "John Smith", "Michael Brown", "David Wilson", "James Garcia",
        "Robert Miller", "William Davis", "Richard Martinez", "Charles Anderson",
        "Joseph Taylor", "Thomas Thomas", "Christopher Jackson", "Daniel White",
        "Matthew Harris", "Anthony Clark", "Mark Lewis", "Steven Walker",
        "Paul Hall", "Andrew Allen", "Joshua Young", "Kenneth King",
        "Kevin Wright", "Brian Lopez", "George Hill", "Edward Scott",
        "Ronald Green", "Timothy Adams", "Jason Baker", "Jeffrey Gonzalez",
        "Ryan Nelson", "Jacob Carter", "Nicholas Mitchell", "Jonathan Perez",
        "Justin Roberts", "Sandra Turner", "Deborah Phillips", "Nancy Campbell",
        "Dorothy Parker", "Lisa Evans", "Betty Edwards", "Helen Collins",
        "Sandra Stewart", "Donna Sanchez", "Carol Morris", "Ruth Murphy",
        "Sharon Cook", "Michelle Bailey", "Laura Rivera", "Sarah Cooper",
        "Kimberly Richardson", "Deborah Cox", "Dorothy Howard", "Lisa Ward"
    ]
    
    for i, client_name in enumerate(client_names):
        client_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT OR REPLACE INTO users (id, email, full_name, role, created_at) VALUES (?, ?, ?, ?, ?)",
            (client_id, f"client{i+1}@example.com", client_name, "CLIENT", 
             (datetime.now() - timedelta(days=random.randint(1, 365))).isoformat())
        )
        clients.append(client_id)
    
    print(f"✅ Created {len(clients)} clients and {len(barbers)} barbers")
    
    # Create appointments over the last 90 days
    appointments = []
    service_ids = [s[0] for s in services]
    
    for day in range(90):
        appointment_date = datetime.now() - timedelta(days=day)
        
        # Skip some days (Sundays, random closures)
        if appointment_date.weekday() == 6 or random.random() < 0.1:
            continue
        
        # More appointments on weekends (Friday, Saturday)
        if appointment_date.weekday() in [4, 5]:
            daily_appointments = random.randint(12, 18)
        else:
            daily_appointments = random.randint(6, 12)
        
        for _ in range(daily_appointments):
            appointment_id = str(uuid.uuid4())
            client_id = random.choice(clients)
            barber_id = random.choice(barbers)
            service_id = random.choice(service_ids)
            
            # Appointment time during business hours (9 AM - 7 PM)
            hour = random.randint(9, 18)
            minute = random.choice([0, 15, 30, 45])
            scheduled_time = appointment_date.replace(hour=hour, minute=minute)
            
            # Service duration
            service_duration = next(s[3] for s in services if s[0] == service_id)
            end_time = scheduled_time + timedelta(minutes=service_duration)
            
            # Status distribution
            status_weights = [
                ('COMPLETED', 0.85),
                ('CANCELLED', 0.08),
                ('NO_SHOW', 0.04),
                ('CONFIRMED', 0.02),
                ('PENDING', 0.01)
            ]
            status = random.choices(
                [s[0] for s in status_weights], 
                weights=[s[1] for s in status_weights]
            )[0]
            
            appointments.append((
                appointment_id, barbershop_id, client_id, barber_id, service_id,
                scheduled_time.isoformat(), scheduled_time.isoformat(),
                end_time.isoformat(), status, scheduled_time.isoformat()
            ))
    
    cursor.executemany(
        """INSERT OR REPLACE INTO appointments 
           (id, barbershop_id, client_id, barber_id, service_id, 
            scheduled_at, start_time, end_time, status, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        appointments
    )
    
    print(f"✅ Created {len(appointments)} appointments")
    
    # Create payments for completed appointments
    payments = []
    
    for appointment_id, _, _, _, service_id, _, _, _, status, _ in appointments:
        if status == 'COMPLETED':
            # Service payment
            service_price = next(s[2] for s in services if s[0] == service_id)
            payment_id = str(uuid.uuid4())
            payments.append((payment_id, appointment_id, service_price, 'service', 'COMPLETED'))
            
            # Random tip (60% chance)
            if random.random() < 0.6:
                tip_amount = random.choice([5, 8, 10, 12, 15, 20])
                tip_id = str(uuid.uuid4())
                payments.append((tip_id, appointment_id, tip_amount, 'tip', 'COMPLETED'))
    
    cursor.executemany(
        "INSERT OR REPLACE INTO payments (id, appointment_id, amount, payment_type, status) VALUES (?, ?, ?, ?, ?)",
        payments
    )
    
    print(f"✅ Created {len(payments)} payments")
    
    conn.commit()
    conn.close()

def show_summary():
    """Show database summary"""
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Get counts
    tables = {
        'barbershops': 'SELECT COUNT(*) FROM barbershops',
        'users': 'SELECT COUNT(*) FROM users',
        'services': 'SELECT COUNT(*) FROM services',
        'appointments': 'SELECT COUNT(*) FROM appointments',
        'payments': 'SELECT COUNT(*) FROM payments'
    }
    
    print("\n📊 Database Summary:")
    for table, query in tables.items():
        cursor.execute(query)
        count = cursor.fetchone()[0]
        print(f"   {table}: {count}")
    
    # Revenue summary
    cursor.execute("SELECT SUM(amount) FROM payments WHERE status = 'COMPLETED'")
    total_revenue = cursor.fetchone()[0] or 0
    
    cursor.execute("""
    SELECT SUM(amount) FROM payments 
    WHERE status = 'COMPLETED' 
    AND date(created_at) >= date('now', 'start of month')
    """)
    monthly_revenue = cursor.fetchone()[0] or 0
    
    cursor.execute("SELECT COUNT(*) FROM appointments WHERE status = 'COMPLETED'")
    completed_appointments = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(DISTINCT client_id) FROM appointments")
    unique_customers = cursor.fetchone()[0]
    
    print(f"\n💰 Financial Summary:")
    print(f"   Total Revenue: ${total_revenue:.2f}")
    print(f"   Monthly Revenue: ${monthly_revenue:.2f}")
    print(f"   Completed Appointments: {completed_appointments}")
    print(f"   Unique Customers: {unique_customers}")
    
    conn.close()

if __name__ == "__main__":
    print("🚀 Initializing Analytics Database with Sample Data")
    print("=" * 60)
    
    # Ensure database directory exists
    os.makedirs("database", exist_ok=True)
    
    try:
        create_tables()
        insert_sample_data()
        show_summary()
        
        print("\n🎉 Analytics database initialized successfully!")
        print("\n💡 Next steps:")
        print("   • Run: python test_analytics_integration.py")
        print("   • Start servers: ./docker-dev-start.sh")
        print("   • Test AI responses with real data")
        
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        exit(1)
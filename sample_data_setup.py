#!/usr/bin/env python3
"""
Sample Data Setup for Enhanced Booking System
Creates realistic test data for barber-first booking system
"""

import sqlite3
import json
from datetime import datetime, timedelta

def setup_sample_data():
    """Create comprehensive sample data for testing"""
    
    conn = sqlite3.connect('booking_system.db')
    cursor = conn.cursor()
    
    try:
        # Create sample location
        cursor.execute("""
            INSERT OR REPLACE INTO locations (id, name, address, phone, email, timezone, business_hours)
            VALUES (1, 'Downtown Barbershop', '123 Main St, Downtown', '555-0123', 'info@downtown-barbershop.com', 'America/New_York', ?)
        """, (json.dumps({
            "monday": {"open": "09:00", "close": "18:00"},
            "tuesday": {"open": "09:00", "close": "18:00"},
            "wednesday": {"open": "09:00", "close": "18:00"},
            "thursday": {"open": "09:00", "close": "18:00"},
            "friday": {"open": "09:00", "close": "19:00"},
            "saturday": {"open": "08:00", "close": "17:00"},
            "sunday": {"closed": True}
        }),))
        
        # Create sample users (barbers and customers)
        sample_users = [
            (1, 'mike@barbershop.com', 'Mike Johnson', '555-0101', 'barber'),
            (2, 'sarah@barbershop.com', 'Sarah Wilson', '555-0102', 'barber'),
            (3, 'james@barbershop.com', 'James Brown', '555-0103', 'barber'),
            (4, 'customer1@email.com', 'John Smith', '555-0201', 'customer'),
            (5, 'customer2@email.com', 'Emily Davis', '555-0202', 'customer'),
            (6, 'manager@barbershop.com', 'Alex Manager', '555-0301', 'manager')
        ]
        
        for user_id, email, name, phone, role in sample_users:
            cursor.execute("""
                INSERT OR REPLACE INTO users (id, email, hashed_password, full_name, phone, role)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (user_id, email, '$2b$12$dummy.hash.for.testing', name, phone, role))
        
        # Create sample barbers
        sample_barbers = [
            (1, 1, 1, 'Mike "The Fade Master" Johnson', 'Specializes in modern fades, classic cuts, and beard grooming. 8 years experience.', json.dumps(['fades', 'classic_cuts', 'beard_grooming']), 8),
            (2, 2, 1, 'Sarah "Style Guru" Wilson', 'Expert in trendy styles, scissor cuts, and hair design. 6 years experience.', json.dumps(['trendy_styles', 'scissor_cuts', 'hair_design']), 6),
            (3, 3, 1, 'James "The Traditionalist" Brown', 'Master of traditional barbering, straight razor shaves, and vintage styles. 12 years experience.', json.dumps(['traditional_cuts', 'straight_razor', 'vintage_styles']), 12)
        ]
        
        for barber_id, user_id, location_id, display_name, bio, specialties, years in sample_barbers:
            cursor.execute("""
                INSERT OR REPLACE INTO barbers (id, user_id, location_id, display_name, bio, specialties, years_experience, is_available, hourly_rate)
                VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, 45.00)
            """, (barber_id, user_id, location_id, display_name, bio, specialties, years))
        
        # Create sample services
        sample_services = [
            (1, 'Classic Haircut', 'Traditional haircut with scissor and clipper work', 35.00, 30, 'haircut'),
            (2, 'Modern Fade', 'Contemporary fade with blending and styling', 40.00, 35, 'haircut'),
            (3, 'Beard Trim', 'Professional beard trimming and shaping', 20.00, 15, 'beard'),
            (4, 'Hot Towel Shave', 'Traditional straight razor shave with hot towel', 45.00, 45, 'shave'),
            (5, 'Hair & Beard Combo', 'Complete grooming package', 55.00, 50, 'combo'),
            (6, 'Kids Cut', 'Haircut for children under 12', 25.00, 25, 'haircut')
        ]
        
        for service_id, name, description, price, duration, category in sample_services:
            cursor.execute("""
                INSERT OR REPLACE INTO services (id, name, description, base_price, base_duration, category)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (service_id, name, description, price, duration, category))
        
        # Create barber-specific service customizations
        barber_services = [
            # Mike (fast and efficient)
            (1, 1, 1, None, 25, 5),  # Classic cut - 25 min
            (2, 1, 2, None, 30, 5),  # Modern fade - 30 min
            (3, 1, 3, None, 12, 3),  # Beard trim - 12 min
            (4, 1, 5, None, 40, 5),  # Combo - 40 min
            
            # Sarah (detailed and precise)
            (5, 2, 1, None, 35, 5),  # Classic cut - 35 min
            (6, 2, 2, 45.00, 40, 5), # Modern fade - premium pricing, 40 min
            (7, 2, 6, None, 30, 5),  # Kids cut - 30 min
            
            # James (traditional and thorough)
            (8, 3, 1, None, 40, 10), # Classic cut - 40 min with 10 min buffer
            (9, 3, 4, None, 50, 10), # Hot towel shave - 50 min
            (10, 3, 5, 65.00, 60, 10) # Premium combo - 60 min
        ]
        
        for bs_id, barber_id, service_id, custom_price, custom_duration, buffer_time in barber_services:
            cursor.execute("""
                INSERT OR REPLACE INTO barber_services (id, barber_id, service_id, custom_price, custom_duration, buffer_time)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (bs_id, barber_id, service_id, custom_price, custom_duration, buffer_time))
        
        # Create sample appointment history for behavior learning
        base_date = datetime.now() - timedelta(days=90)
        sample_appointments = []
        
        # John Smith - regular customer, prefers Mike, every 3 weeks
        for i in range(4):
            appointment_date = base_date + timedelta(days=21*i)
            sample_appointments.append((
                4, 1, 2, 1,  # customer_id, barber_id, service_id, location_id
                appointment_date, 30, 40.00, 'completed'
            ))
        
        # Emily Davis - occasional customer, tries different barbers
        appointment_dates = [base_date + timedelta(days=45), base_date + timedelta(days=75)]
        barber_ids = [2, 3]
        for i, (date, barber_id) in enumerate(zip(appointment_dates, barber_ids)):
            sample_appointments.append((
                5, barber_id, 1, 1,  # customer_id, barber_id, service_id, location_id
                date, 35, 35.00, 'completed'
            ))
        
        for customer_id, barber_id, service_id, location_id, date, duration, price, status in sample_appointments:
            cursor.execute("""
                INSERT INTO appointments 
                (customer_id, barber_id, service_id, location_id, appointment_datetime, duration, price, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (customer_id, barber_id, service_id, location_id, date.isoformat(), 
                  duration, price, status, date.isoformat(), date.isoformat()))
        
        conn.commit()
        print("✅ Sample data created successfully!")
        
        # Print summary
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM barbers")
        barber_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM services")
        service_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM barber_services")
        barber_service_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM appointments")
        appointment_count = cursor.fetchone()[0]
        
        print(f"📊 Data Summary:")
        print(f"   👤 Users: {user_count}")
        print(f"   💇 Barbers: {barber_count}")
        print(f"   🎯 Services: {service_count}")
        print(f"   ⚙️  Barber-Service Customizations: {barber_service_count}")
        print(f"   📅 Sample Appointments: {appointment_count}")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error creating sample data: {str(e)}")
    finally:
        conn.close()

if __name__ == "__main__":
    setup_sample_data()
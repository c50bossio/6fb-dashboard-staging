#!/usr/bin/env python3
"""
Seed database with sample business data for testing
"""

import sqlite3
import random
from datetime import datetime, timedelta
import uuid

def generate_id():
    """Generate a unique ID"""
    return str(uuid.uuid4())

def seed_database():
    """Seed the database with sample data"""
    
    conn = sqlite3.connect('data/agent_system.db')
    cursor = conn.cursor()
    
    try:
        # Seed services
        services = [
            ('Classic Cut', 'Traditional haircut with styling', 35.00, 30),
            ('Beard Trim', 'Professional beard shaping and trim', 25.00, 20),
            ('Full Service', 'Haircut + beard trim + hot towel', 55.00, 45),
            ('Kids Cut', 'Children haircut (under 12)', 20.00, 20),
            ('Senior Cut', 'Senior citizen special', 25.00, 25),
            ('Buzz Cut', 'Quick buzz cut', 15.00, 15),
            ('Hair Design', 'Custom hair design and patterns', 45.00, 40),
            ('Shave', 'Traditional hot towel shave', 30.00, 30),
        ]
        
        service_ids = []
        for name, desc, price, duration in services:
            service_id = generate_id()
            service_ids.append((service_id, name, price))
            cursor.execute('''
                INSERT INTO services (id, name, description, price, duration_minutes, category, is_active)
                VALUES (?, ?, ?, ?, ?, 'STANDARD', 1)
            ''', (service_id, name, desc, price, duration))
        
        # Seed barbers (using existing users or creating new ones)
        barber_names = [
            ('Mike Johnson', 'mike@barbershop.com', 5, 0.65),
            ('Sarah Williams', 'sarah@barbershop.com', 3, 0.60),
            ('James Brown', 'james@barbershop.com', 7, 0.70),
            ('Lisa Davis', 'lisa@barbershop.com', 2, 0.55),
        ]
        
        barber_ids = []
        for name, email, experience, commission in barber_names:
            user_id = generate_id()
            barber_id = generate_id()
            barber_ids.append((barber_id, user_id, name))
            
            # Create user (using auto-increment ID)
            cursor.execute('''
                INSERT OR IGNORE INTO users (email, password_hash, shop_name)
                VALUES (?, 'hashed_password', ?)
            ''', (email, name))
            
            # Get the user_id
            cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
            result = cursor.fetchone()
            if result:
                user_id = str(result[0])
            
            # Create barber profile
            cursor.execute('''
                INSERT INTO barbers (id, user_id, specialty, experience_years, commission_rate, rating, is_available)
                VALUES (?, ?, 'General', ?, ?, ?, 1)
            ''', (barber_id, user_id, experience, commission, random.uniform(4.0, 5.0)))
        
        # Seed customers
        customer_names = [
            'John Smith', 'Emma Johnson', 'Michael Davis', 'Olivia Brown', 'William Jones',
            'Sophia Garcia', 'James Miller', 'Isabella Martinez', 'Robert Wilson', 'Mia Anderson',
            'David Taylor', 'Charlotte Thomas', 'Joseph Jackson', 'Amelia White', 'Charles Harris',
            'Harper Martin', 'Thomas Thompson', 'Evelyn Lewis', 'Christopher Lee', 'Abigail Walker',
            'Daniel Hall', 'Emily Allen', 'Matthew Young', 'Elizabeth King', 'Andrew Wright',
            'Avery Scott', 'Jackson Green', 'Sofia Baker', 'Lucas Adams', 'Aria Nelson',
        ]
        
        customers = []
        for i, name in enumerate(customer_names):
            customer_id = generate_id()
            email = f"{name.lower().replace(' ', '.')}@email.com"
            phone = f"555-{random.randint(1000, 9999)}"
            
            cursor.execute('''
                INSERT INTO customers (id, email, name, phone, total_visits, total_spent, loyalty_points, is_active)
                VALUES (?, ?, ?, ?, 0, 0, 0, 1)
            ''', (customer_id, email, name, phone))
            
            customers.append((customer_id, name))
        
        # Seed appointments and payments for the last 90 days
        now = datetime.now()
        appointment_count = 0
        total_revenue = 0
        
        for days_ago in range(90, -1, -1):
            date = now - timedelta(days=days_ago)
            
            # Generate 5-15 appointments per day
            daily_appointments = random.randint(5, 15)
            
            for _ in range(daily_appointments):
                appointment_id = generate_id()
                payment_id = generate_id()
                
                # Random customer and barber
                customer_id, customer_name = random.choice(customers)
                barber_id, user_id, barber_name = random.choice(barber_ids)
                
                # Random service
                service_id, service_name, base_price = random.choice(service_ids)
                
                # Random time slot (9 AM to 6 PM)
                hour = random.randint(9, 17)
                minute = random.choice([0, 15, 30, 45])
                scheduled_at = date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                
                # Random status (most should be completed)
                if days_ago > 0:
                    status = random.choices(
                        ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
                        weights=[85, 10, 5]
                    )[0]
                else:
                    status = random.choices(
                        ['PENDING', 'CONFIRMED', 'COMPLETED'],
                        weights=[20, 30, 50]
                    )[0]
                
                # Calculate amounts
                service_price = base_price * random.uniform(0.9, 1.1)  # ±10% variation
                tip_amount = random.choice([0, 5, 10, 15, 20]) if status == 'COMPLETED' else 0
                total_amount = service_price + tip_amount
                
                # Platform fee (15-20%)
                platform_fee = service_price * random.uniform(0.15, 0.20)
                
                # Barber commission (60-70% of remaining)
                remaining = service_price - platform_fee
                barber_commission = remaining * random.uniform(0.60, 0.70)
                
                # Shop earnings
                shop_earnings = remaining - barber_commission
                
                # Insert appointment (barber_id should be the user_id from users table)
                cursor.execute('''
                    INSERT INTO appointments (
                        id, customer_id, barber_id, service_id, scheduled_at, 
                        duration_minutes, status, service_name, service_price, 
                        tip_amount, total_amount, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    appointment_id, customer_id, user_id, service_id, scheduled_at.isoformat(),
                    30, status, service_name, service_price,
                    tip_amount, total_amount, scheduled_at.isoformat()
                ))
                
                # Insert payment if completed
                if status == 'COMPLETED':
                    payment_status = 'COMPLETED'
                    appointment_count += 1
                    total_revenue += total_amount
                    
                    cursor.execute('''
                        INSERT INTO payments (
                            id, appointment_id, customer_id, amount, service_amount,
                            tip_amount, platform_fee, barber_commission, shop_earnings,
                            payment_method, payment_status, processed_at, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        payment_id, appointment_id, customer_id, total_amount, service_price,
                        tip_amount, platform_fee, barber_commission, shop_earnings,
                        random.choice(['CASH', 'CARD', 'ONLINE']), payment_status,
                        scheduled_at.isoformat(), scheduled_at.isoformat()
                    ))
                    
                    # Update customer stats
                    cursor.execute('''
                        UPDATE customers 
                        SET total_visits = total_visits + 1,
                            total_spent = total_spent + ?,
                            last_visit_date = ?
                        WHERE id = ?
                    ''', (total_amount, scheduled_at.isoformat(), customer_id))
                    
                    # Update barber stats
                    cursor.execute('''
                        UPDATE barbers 
                        SET total_appointments = total_appointments + 1,
                            total_revenue = total_revenue + ?
                        WHERE user_id = ?
                    ''', (total_amount, user_id))
        
        conn.commit()
        print(f"✅ Database seeded successfully!")
        print(f"   - {len(services)} services created")
        print(f"   - {len(barber_ids)} barbers created")
        print(f"   - {len(customers)} customers created")
        print(f"   - {appointment_count} completed appointments")
        print(f"   - ${total_revenue:.2f} total revenue generated")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    seed_database()
-- Add missing business tables for real data
-- This migration adds appointments, customers, and payments tables

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    notes TEXT,
    first_visit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_visit_date TIMESTAMP,
    total_visits INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    loyalty_points INTEGER DEFAULT 0,
    preferred_barber_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    customer_id TEXT NOT NULL,
    barber_id TEXT NOT NULL,
    service_id TEXT,
    scheduled_at TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
    service_name TEXT,
    service_price REAL DEFAULT 0,
    add_ons_price REAL DEFAULT 0,
    tip_amount REAL DEFAULT 0,
    total_amount REAL DEFAULT 0,
    notes TEXT,
    cancelled_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (barber_id) REFERENCES users(id)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    appointment_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    amount REAL NOT NULL,
    service_amount REAL NOT NULL,
    tip_amount REAL DEFAULT 0,
    platform_fee REAL DEFAULT 0,
    barber_commission REAL DEFAULT 0,
    shop_earnings REAL DEFAULT 0,
    payment_method TEXT DEFAULT 'CASH' CHECK(payment_method IN ('CASH', 'CARD', 'ONLINE', 'APP')),
    payment_status TEXT DEFAULT 'PENDING' CHECK(payment_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    transaction_id TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    category TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff/Barbers table (extends users)
CREATE TABLE IF NOT EXISTS barbers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    specialty TEXT,
    experience_years INTEGER DEFAULT 0,
    commission_rate REAL DEFAULT 0.60,
    rating REAL DEFAULT 0,
    total_appointments INTEGER DEFAULT 0,
    total_revenue REAL DEFAULT 0,
    is_available BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_payments_appointment ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active);
# Supabase Database Setup Guide

## Quick Setup Instructions

Since automated SQL execution has some permissions limitations, here's how to manually set up your Supabase database:

### Step 1: Open Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in and navigate to your project: `dfhqjdoydihajmjxniee`
3. Click on "SQL Editor" in the left sidebar

### Step 2: Create Database Schema
1. In the SQL Editor, click "New query"
2. Copy the entire contents of `database/setup-calendar-tables.sql` 
3. Paste it into the SQL editor
4. Click "Run" to execute all the SQL statements

This will create all the necessary tables:
- `barbershops` - Store information about barbershops
- `barbers` - Individual barbers working at barbershops  
- `services` - Services offered (haircuts, beard trims, etc.)
- `clients` - Customer information and preferences
- `appointments` - Main booking table with full business logic
- `appointment_history` - Audit trail for changes
- `barber_availability` - Special availability overrides
- `booking_preferences` - Customer booking preferences

### Step 3: Generate Test Data
Once the tables are created, run:
```bash
node scripts/create-test-data.js
```

This will create realistic test data including:
- 3 barbershops with different locations
- 6-12 barbers across all shops
- 18-27 services per shop
- 36-57 clients per shop  
- 90+ appointments over the next 30 days

### Step 4: Test the Calendar
Visit: http://localhost:9999/dashboard/calendar

You should now see real appointment data in the calendar interface.

## Manual SQL Execution (If Needed)

If you prefer to run the SQL statements one by one, here are the key ones:

### 1. Enable Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### 2. Create Core Tables
```sql
-- Barbershops
CREATE TABLE IF NOT EXISTS barbershops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    address TEXT,
    city VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Barbers
CREATE TABLE IF NOT EXISTS barbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbershop_id UUID NOT NULL REFERENCES barbershops(id),
    client_id UUID REFERENCES clients(id),
    barber_id UUID NOT NULL REFERENCES barbers(id),
    service_id UUID NOT NULL REFERENCES services(id),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    client_name VARCHAR(255),
    client_phone VARCHAR(20),
    service_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'CONFIRMED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Troubleshooting

### If Tables Already Exist
If you get "relation already exists" errors, that's normal - the tables are already created.

### If Permissions Issues
Make sure you're using the Service Role Key in your environment variables, not the Anonymous Key.

### If Foreign Key Errors
Make sure to create tables in this order:
1. barbershops
2. barbers  
3. services
4. clients
5. appointments

### Cleanup (If Needed)
To start fresh, you can delete all data:
```bash
node scripts/cleanup-test-data.js
```

## Next Steps After Setup
1. ✅ Database tables created
2. ✅ Test data generated  
3. ✅ Calendar integration working
4. 🔄 Test the full booking flow
5. 🔄 Configure Row Level Security (optional for development)
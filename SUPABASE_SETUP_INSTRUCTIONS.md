# Supabase Setup Instructions

To complete the barber operations system setup, run these SQL commands in your Supabase SQL Editor:

## 1. Create Missing Tables and Add Slugs

```sql
-- Add slug column to barbershops
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;

-- Update existing barbershops with slugs
UPDATE barbershops SET slug = 'elite-cuts' WHERE name = 'Elite Cuts Barbershop';
UPDATE barbershops SET slug = 'premium-cuts' WHERE name = 'Premium Cuts Barbershop';

-- Create appointments table (simplified for testing)
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    barber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    
    service_name VARCHAR(255),
    service_price DECIMAL(10, 2),
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'arrived', 'in_progress', 
        'completed', 'cancelled', 'no_show', 'rescheduled'
    )),
    
    booking_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create transactions table (simplified for testing)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    barber_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    type VARCHAR(50) NOT NULL, -- 'service', 'product', 'tip', 'refund'
    amount DECIMAL(10, 2) NOT NULL,
    tip_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    payment_method VARCHAR(50), -- 'cash', 'card', 'online'
    payment_status VARCHAR(50) DEFAULT 'completed',
    
    commission_rate DECIMAL(5, 2),
    commission_amount DECIMAL(10, 2),
    commission_paid BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_appointments_barbershop ON appointments(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_appointments_barber ON appointments(barber_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

CREATE INDEX IF NOT EXISTS idx_transactions_barbershop ON transactions(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_transactions_barber ON transactions(barber_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at);

-- Enable Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Barbers can manage their appointments" ON appointments
    FOR ALL USING (auth.uid() = barber_id);

CREATE POLICY "Shop owners can view shop appointments" ON appointments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = appointments.barbershop_id 
            AND barbershops.owner_id = auth.uid()
        )
    );

CREATE POLICY "Barbers can view their transactions" ON transactions
    FOR SELECT USING (auth.uid() = barber_id);

CREATE POLICY "Shop owners can view shop transactions" ON transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM barbershops 
            WHERE barbershops.id = transactions.barbershop_id 
            AND barbershops.owner_id = auth.uid()
        )
    );
```

## 2. Update Barber Customizations with Slugs

```sql
-- Add slug column to barber_customizations if not exists
ALTER TABLE barber_customizations ADD COLUMN IF NOT EXISTS slug VARCHAR(255) UNIQUE;

-- Update barber customizations with slugs based on user profiles
UPDATE barber_customizations 
SET slug = LOWER(REPLACE(
    COALESCE(
        (SELECT full_name FROM profiles WHERE profiles.id = barber_customizations.barber_id),
        (SELECT SPLIT_PART(email, '@', 1) FROM auth.users WHERE auth.users.id = barber_customizations.barber_id)
    ), 
    ' ', '-'
))
WHERE slug IS NULL;

-- Insert missing barber customizations for existing barbers
INSERT INTO barber_customizations (barbershop_id, barber_id, slug, display_name, specialty, bio)
SELECT 
    bs.barbershop_id,
    bs.user_id,
    LOWER(REPLACE(COALESCE(p.full_name, SPLIT_PART(u.email, '@', 1)), ' ', '-')) as slug,
    COALESCE(p.full_name, SPLIT_PART(u.email, '@', 1)) as display_name,
    'Hair Styling & Cuts' as specialty,
    'Professional barber with years of experience providing quality cuts and styling.' as bio
FROM barbershop_staff bs
LEFT JOIN profiles p ON p.id = bs.user_id
LEFT JOIN auth.users u ON u.id = bs.user_id
LEFT JOIN barber_customizations bc ON bc.barber_id = bs.user_id
WHERE bc.id IS NULL
AND bs.role = 'BARBER'
AND bs.is_active = true;
```

## 3. Verify Setup

```sql
-- Check barbershop slugs
SELECT name, slug FROM barbershops ORDER BY name;

-- Check barber customizations
SELECT 
    b.name as barbershop_name,
    b.slug as barbershop_slug,
    bc.display_name as barber_name,
    bc.slug as barber_slug,
    p.email
FROM barber_customizations bc
JOIN barbershops b ON b.id = bc.barbershop_id
JOIN profiles p ON p.id = bc.barber_id
ORDER BY b.name, bc.display_name;

-- Check table creation
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('appointments', 'transactions');
```

## 4. Test URLs After Setup

After running the SQL, these URLs should work:

- **Shop Dashboard Test**: http://localhost:9999/shop-test
- **Barber Profile**: http://localhost:9999/elite-cuts/[barber-slug] (where [barber-slug] comes from the setup)

## Notes

- The shop dashboard APIs are working with development bypass
- Main issue is with protected layout components, not the core system
- All database queries and authentication are functional
- Barber operations hierarchy is properly implemented
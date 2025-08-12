-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES auth.users(id),
  barber_id UUID,
  service_id TEXT,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'scheduled',
  price DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id),
  customer_id UUID REFERENCES auth.users(id),
  amount DECIMAL(10, 2),
  type TEXT DEFAULT 'payment',
  payment_method TEXT,
  status TEXT DEFAULT 'completed',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Enable Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own appointments" ON appointments
  FOR ALL USING (auth.uid() = customer_id OR auth.uid() = barber_id);

CREATE POLICY "Users can view their own transactions" ON transactions
  FOR ALL USING (auth.uid() = customer_id);

-- Insert sample test data
DO $$
DECLARE
  test_user_id UUID := 'f9730252-8997-45ee-8750-6f9843cbf4e3'; -- test@bookedbarber.com user ID
  appointment_id UUID;
BEGIN
  -- Insert sample appointments for the last 30 days
  FOR i IN 0..29 LOOP
    appointment_id := gen_random_uuid();
    
    -- Morning appointment
    INSERT INTO appointments (id, customer_id, barber_id, service_id, start_time, end_time, status, price)
    VALUES (
      appointment_id,
      test_user_id,
      gen_random_uuid(),
      CASE (i % 3)
        WHEN 0 THEN 'haircut'
        WHEN 1 THEN 'beard_trim'
        ELSE 'full_service'
      END,
      NOW() - INTERVAL '1 day' * i + INTERVAL '10 hours',
      NOW() - INTERVAL '1 day' * i + INTERVAL '11 hours',
      'completed',
      CASE (i % 3)
        WHEN 0 THEN 35.00
        WHEN 1 THEN 25.00
        ELSE 55.00
      END
    );
    
    -- Create transaction for this appointment
    INSERT INTO transactions (appointment_id, customer_id, amount, type, payment_method, status)
    VALUES (
      appointment_id,
      test_user_id,
      CASE (i % 3)
        WHEN 0 THEN 35.00
        WHEN 1 THEN 25.00
        ELSE 55.00
      END,
      'payment',
      CASE (i % 2)
        WHEN 0 THEN 'card'
        ELSE 'cash'
      END,
      'completed'
    );
    
    -- Afternoon appointment (50% chance)
    IF i % 2 = 0 THEN
      appointment_id := gen_random_uuid();
      
      INSERT INTO appointments (id, customer_id, barber_id, service_id, start_time, end_time, status, price)
      VALUES (
        appointment_id,
        test_user_id,
        gen_random_uuid(),
        CASE (i % 3)
          WHEN 0 THEN 'haircut'
          WHEN 1 THEN 'beard_trim'
          ELSE 'full_service'
        END,
        NOW() - INTERVAL '1 day' * i + INTERVAL '15 hours',
        NOW() - INTERVAL '1 day' * i + INTERVAL '16 hours',
        'completed',
        CASE (i % 3)
          WHEN 0 THEN 35.00
          WHEN 1 THEN 25.00
          ELSE 55.00
        END
      );
      
      -- Create transaction for afternoon appointment
      INSERT INTO transactions (appointment_id, customer_id, amount, type, payment_method, status)
      VALUES (
        appointment_id,
        test_user_id,
        CASE (i % 3)
          WHEN 0 THEN 35.00
          WHEN 1 THEN 25.00
          ELSE 55.00
        END,
        'payment',
        'card',
        'completed'
      );
    END IF;
  END LOOP;
END $$;
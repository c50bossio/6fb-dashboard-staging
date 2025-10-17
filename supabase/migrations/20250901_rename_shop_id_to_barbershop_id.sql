-- Rename shop_id to barbershop_id in schedule_exceptions table
-- This aligns the database schema with the JavaScript code after the nuclear migration

-- Step 1: Rename the column
ALTER TABLE public.schedule_exceptions 
RENAME COLUMN shop_id TO barbershop_id;

-- Step 2: Update the index name to match
DROP INDEX IF EXISTS idx_schedule_exceptions_shop_date;
CREATE INDEX idx_schedule_exceptions_barbershop_date 
ON public.schedule_exceptions(barbershop_id, date);

-- Step 3: Drop and recreate RLS policies with correct column name
DROP POLICY IF EXISTS "Shop owners can manage shop exceptions" ON public.schedule_exceptions;
DROP POLICY IF EXISTS "Shop owners can manage their shop exceptions" ON public.schedule_exceptions;
DROP POLICY IF EXISTS "Barbers can manage their own exceptions" ON public.schedule_exceptions;
DROP POLICY IF EXISTS "Public can view exceptions for booking" ON public.schedule_exceptions;

-- Recreate policies with barbershop_id
CREATE POLICY "Shop owners can manage their shop exceptions" ON public.schedule_exceptions
  FOR ALL USING (
    barbershop_id IN (
      SELECT p.barbershop_id FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.barbershop_id IS NOT NULL
    )
  )
  WITH CHECK (
    barbershop_id IN (
      SELECT p.barbershop_id FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.barbershop_id IS NOT NULL
    )
  );

-- Barbers can manage their own exceptions
CREATE POLICY "Barbers can manage their own exceptions" ON public.schedule_exceptions
  FOR ALL USING (
    barber_id = auth.uid() OR
    (
      auth.uid() IN (
        SELECT user_id FROM public.barbershop_staff bs
        WHERE bs.barbershop_id = schedule_exceptions.barbershop_id
        AND bs.user_id = auth.uid()
        AND bs.is_active = true
      )
    )
  )
  WITH CHECK (
    barber_id = auth.uid() OR
    (
      auth.uid() IN (
        SELECT user_id FROM public.barbershop_staff bs
        WHERE bs.barbershop_id = schedule_exceptions.barbershop_id
        AND bs.user_id = auth.uid()
        AND bs.is_active = true
      )
    )
  );

-- Public can view exceptions for booking
CREATE POLICY "Public can view exceptions for booking" ON public.schedule_exceptions
  FOR SELECT USING (true);

-- Update column comment
COMMENT ON COLUMN public.schedule_exceptions.barbershop_id IS 'Reference to the barbershop (replaces shop_id after nuclear migration)';
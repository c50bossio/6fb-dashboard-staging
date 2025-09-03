-- Fix RLS policies to use correct column name from profiles table
-- The profiles table has 'shop_id' not 'barbershop_id', causing RLS to block inserts

-- Drop existing policies that use incorrect barbershop_id from profiles
DROP POLICY IF EXISTS "Shop owners can manage their shop exceptions" ON public.schedule_exceptions;
DROP POLICY IF EXISTS "Barbers can manage their own exceptions" ON public.schedule_exceptions;
DROP POLICY IF EXISTS "Public can view exceptions for booking" ON public.schedule_exceptions;

-- Recreate policies using shop_id from profiles (which is what actually exists)
CREATE POLICY "Shop owners can manage their shop exceptions" ON public.schedule_exceptions
  FOR ALL USING (
    barbershop_id IN (
      SELECT p.shop_id FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.shop_id IS NOT NULL
    )
    OR
    barbershop_id IN (
      SELECT p.barbershop_id FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.barbershop_id IS NOT NULL
    )
  )
  WITH CHECK (
    barbershop_id IN (
      SELECT p.shop_id FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.shop_id IS NOT NULL
    )
    OR
    barbershop_id IN (
      SELECT p.barbershop_id FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.barbershop_id IS NOT NULL
    )
  );

-- Barbers can manage their own exceptions or shop-wide exceptions if they're staff
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

-- Add helpful comment
COMMENT ON TABLE public.schedule_exceptions IS 'Schedule exceptions (holidays, special hours, time off) with RLS policies that check both shop_id and barbershop_id from profiles';
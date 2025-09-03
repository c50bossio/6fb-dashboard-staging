-- Add recurring holiday support to schedule_exceptions table
-- This enables holidays that repeat annually without manual re-entry

-- Add new columns for recurring functionality
ALTER TABLE public.schedule_exceptions 
ADD COLUMN is_recurring BOOLEAN DEFAULT false,
ADD COLUMN recurrence_pattern TEXT DEFAULT 'none' CHECK (recurrence_pattern IN ('none', 'annual', 'monthly', 'weekly')),
ADD COLUMN recurrence_data JSONB DEFAULT '{}'::jsonb;

-- Add helpful comments for the new columns
COMMENT ON COLUMN public.schedule_exceptions.is_recurring IS 'True if this exception repeats (e.g., annual holidays)';
COMMENT ON COLUMN public.schedule_exceptions.recurrence_pattern IS 'Pattern for recurrence: none, annual, monthly, weekly';
COMMENT ON COLUMN public.schedule_exceptions.recurrence_data IS 'Additional data for recurrence (month/day for annual, etc.)';

-- Create index for efficient querying of recurring exceptions
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_recurring 
ON public.schedule_exceptions(is_recurring, recurrence_pattern, barbershop_id);

-- Create a view for expanded recurring holidays (helps with queries)
CREATE OR REPLACE VIEW public.schedule_exceptions_expanded AS
WITH RECURSIVE recurring_dates AS (
  -- Base case: all non-recurring exceptions
  SELECT 
    id,
    barbershop_id,
    barber_id,
    date,
    type,
    start_time,
    end_time,
    all_day,
    reason,
    is_recurring,
    recurrence_pattern,
    created_at,
    updated_at,
    date as original_date
  FROM public.schedule_exceptions
  WHERE NOT is_recurring
  
  UNION ALL
  
  -- Recurring case: generate future dates for annual holidays
  SELECT 
    se.id,
    se.barbershop_id,
    se.barber_id,
    -- Generate next year's date for annual recurrence
    CASE 
      WHEN se.recurrence_pattern = 'annual' THEN
        (se.date + INTERVAL '1 year')::date
      ELSE se.date
    END as date,
    se.type,
    se.start_time,
    se.end_time,
    se.all_day,
    se.reason,
    se.is_recurring,
    se.recurrence_pattern,
    se.created_at,
    se.updated_at,
    se.date as original_date
  FROM public.schedule_exceptions se
  INNER JOIN recurring_dates rd ON se.id = rd.id
  WHERE 
    se.is_recurring = true 
    AND se.recurrence_pattern = 'annual'
    -- Limit to next 5 years to prevent infinite recursion
    AND (se.date + INTERVAL '1 year')::date <= (CURRENT_DATE + INTERVAL '5 years')
)
SELECT * FROM recurring_dates;

-- Add comment to the view
COMMENT ON VIEW public.schedule_exceptions_expanded IS 'Expands recurring exceptions to show future occurrences for easier querying';

-- Create a function to get schedule exceptions for a date range (includes recurring)
CREATE OR REPLACE FUNCTION public.get_schedule_exceptions_for_period(
  p_barbershop_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  id UUID,
  barbershop_id UUID,
  barber_id UUID,
  exception_date DATE,
  type TEXT,
  start_time TIME,
  end_time TIME,
  all_day BOOLEAN,
  reason TEXT,
  is_recurring BOOLEAN,
  original_date DATE
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  -- Non-recurring exceptions
  SELECT 
    se.id,
    se.barbershop_id,
    se.barber_id,
    se.date as exception_date,
    se.type,
    se.start_time,
    se.end_time,
    se.all_day,
    se.reason,
    se.is_recurring,
    se.date as original_date
  FROM public.schedule_exceptions se
  WHERE 
    se.barbershop_id = p_barbershop_id
    AND se.date >= p_start_date
    AND se.date <= p_end_date
    AND NOT se.is_recurring
  
  UNION ALL
  
  -- Recurring annual exceptions (generate for the requested period)
  SELECT 
    se.id,
    se.barbershop_id,
    se.barber_id,
    -- Calculate the date within the requested range
    (
      p_start_date + 
      (EXTRACT(DOY FROM se.date) - 1) * INTERVAL '1 day' +
      (EXTRACT(YEAR FROM p_start_date) - EXTRACT(YEAR FROM se.date)) * INTERVAL '1 year'
    )::date as exception_date,
    se.type,
    se.start_time,
    se.end_time,
    se.all_day,
    se.reason,
    se.is_recurring,
    se.date as original_date
  FROM public.schedule_exceptions se
  WHERE 
    se.barbershop_id = p_barbershop_id
    AND se.is_recurring = true
    AND se.recurrence_pattern = 'annual'
    -- Check if the recurring date falls within the requested period
    AND (
      p_start_date + 
      (EXTRACT(DOY FROM se.date) - 1) * INTERVAL '1 day' +
      (EXTRACT(YEAR FROM p_start_date) - EXTRACT(YEAR FROM se.date)) * INTERVAL '1 year'
    )::date >= p_start_date
    AND (
      p_start_date + 
      (EXTRACT(DOY FROM se.date) - 1) * INTERVAL '1 day' +
      (EXTRACT(YEAR FROM p_start_date) - EXTRACT(YEAR FROM se.date)) * INTERVAL '1 year'
    )::date <= p_end_date;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION public.get_schedule_exceptions_for_period IS 'Gets all schedule exceptions (including recurring ones) for a given date range and barbershop';

-- Grant permissions for the function
GRANT EXECUTE ON FUNCTION public.get_schedule_exceptions_for_period TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_schedule_exceptions_for_period TO anon;
-- Add Financial Arrangement Fields Migration
-- File: 009_add_financial_arrangement_fields.sql
-- Created: 2025-08-26
-- Purpose: Add standardized financial arrangement fields to barbershop_staff table

-- =======================================
-- ADD MISSING FINANCIAL ARRANGEMENT FIELDS
-- =======================================

-- Add arrangement_type as standardized field name (keep financial_model for backward compatibility)
ALTER TABLE barbershop_staff 
ADD COLUMN IF NOT EXISTS arrangement_type VARCHAR(50) DEFAULT 'commission';

-- Add payment frequency for booth rent
ALTER TABLE barbershop_staff 
ADD COLUMN IF NOT EXISTS rent_frequency VARCHAR(20) DEFAULT 'monthly' 
CHECK (rent_frequency IN ('weekly', 'bi_weekly', 'monthly'));

-- Add hybrid model support fields
ALTER TABLE barbershop_staff 
ADD COLUMN IF NOT EXISTS hybrid_base_rent DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS hybrid_revenue_threshold DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS hybrid_commission_rate DECIMAL(5,4);

-- =======================================
-- CREATE INDEX FOR PERFORMANCE
-- =======================================

-- Add index on arrangement_type for filtering
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_arrangement_type 
ON barbershop_staff(arrangement_type);

-- Add index on rent_frequency
CREATE INDEX IF NOT EXISTS idx_barbershop_staff_rent_frequency 
ON barbershop_staff(rent_frequency);

-- =======================================
-- DATA MIGRATION (SYNC EXISTING DATA)
-- =======================================

-- Copy financial_model to arrangement_type where arrangement_type is null
UPDATE barbershop_staff 
SET arrangement_type = financial_model 
WHERE arrangement_type IS NULL OR arrangement_type = '';

-- =======================================
-- CREATE HELPER FUNCTION FOR FINANCIAL CALCULATIONS
-- =======================================

CREATE OR REPLACE FUNCTION calculate_staff_earnings(
    staff_member_id UUID,
    revenue_amount DECIMAL(10,2)
)
RETURNS JSONB AS $$
DECLARE
    staff_record RECORD;
    result JSONB;
    barber_earnings DECIMAL(10,2);
    shop_earnings DECIMAL(10,2);
    rent_due DECIMAL(10,2) := 0;
    description TEXT;
BEGIN
    -- Get staff financial arrangement
    SELECT arrangement_type, commission_rate, booth_rent_amount, rent_frequency,
           hybrid_base_rent, hybrid_revenue_threshold, hybrid_commission_rate
    INTO staff_record
    FROM barbershop_staff 
    WHERE id = staff_member_id;
    
    IF NOT FOUND THEN
        RETURN '{"error": "Staff member not found"}'::JSONB;
    END IF;
    
    CASE staff_record.arrangement_type
        WHEN 'commission' THEN
            barber_earnings := revenue_amount * COALESCE(staff_record.commission_rate, 0.6);
            shop_earnings := revenue_amount - barber_earnings;
            description := 'Commission split: ' || (COALESCE(staff_record.commission_rate, 0.6) * 100)::TEXT || '% to barber';
            
        WHEN 'booth_rent' THEN
            barber_earnings := revenue_amount;
            shop_earnings := 0;
            rent_due := COALESCE(staff_record.booth_rent_amount, 0);
            description := 'Booth rent: barber keeps 100%, pays $' || rent_due::TEXT || ' ' || COALESCE(staff_record.rent_frequency, 'monthly');
            
        WHEN 'hybrid' THEN
            rent_due := COALESCE(staff_record.hybrid_base_rent, staff_record.booth_rent_amount, 0);
            
            IF revenue_amount <= COALESCE(staff_record.hybrid_revenue_threshold, 0) THEN
                -- Below threshold: barber keeps all, pays base rent
                barber_earnings := revenue_amount;
                shop_earnings := 0;
                description := 'Below threshold: barber keeps 100%, pays base rent $' || rent_due::TEXT;
            ELSE
                -- Above threshold: commission on excess
                DECLARE
                    excess_revenue DECIMAL(10,2);
                    commission_on_excess DECIMAL(10,2);
                BEGIN
                    excess_revenue := revenue_amount - staff_record.hybrid_revenue_threshold;
                    commission_on_excess := excess_revenue * COALESCE(staff_record.hybrid_commission_rate, staff_record.commission_rate, 0.2);
                    barber_earnings := revenue_amount - commission_on_excess;
                    shop_earnings := commission_on_excess;
                    description := 'Above threshold: ' || (COALESCE(staff_record.hybrid_commission_rate, staff_record.commission_rate, 0.2) * 100)::TEXT || '% on excess, plus base rent $' || rent_due::TEXT;
                END;
            END IF;
            
        ELSE
            -- Default to commission
            barber_earnings := revenue_amount * 0.6;
            shop_earnings := revenue_amount * 0.4;
            description := 'Default commission split: 60% to barber';
    END CASE;
    
    result := jsonb_build_object(
        'barber_earnings', barber_earnings,
        'shop_earnings', shop_earnings,
        'rent_due', rent_due,
        'description', description,
        'arrangement_type', staff_record.arrangement_type
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================================
-- MIGRATION COMPLETE
-- =======================================

-- Success message
SELECT 'Financial Arrangement Fields Migration Complete! Added arrangement_type, rent_frequency, and hybrid model support.' as message;
-- Migration: Add shop settings JSONB columns to barbershops table
-- Description: Adds comprehensive settings storage for shop configuration
-- Date: 2024-01-01

-- Add missing JSONB columns for shop settings
ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{
  "monday": {"open": "09:00", "close": "18:00", "closed": false},
  "tuesday": {"open": "09:00", "close": "18:00", "closed": false},
  "wednesday": {"open": "09:00", "close": "18:00", "closed": false},
  "thursday": {"open": "09:00", "close": "18:00", "closed": false},
  "friday": {"open": "09:00", "close": "19:00", "closed": false},
  "saturday": {"open": "10:00", "close": "17:00", "closed": false},
  "sunday": {"open": "00:00", "close": "00:00", "closed": true}
}'::jsonb,
ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{
  "acceptCash": true,
  "acceptCard": true,
  "acceptOnline": false,
  "taxRate": 8.5,
  "cancellationFee": 25,
  "noShowFee": 50,
  "depositRequired": false,
  "depositAmount": 0
}'::jsonb,
ADD COLUMN IF NOT EXISTS commission_settings JSONB DEFAULT '{
  "defaultRate": 60,
  "productCommission": 20,
  "tipHandling": "barber"
}'::jsonb,
ADD COLUMN IF NOT EXISTS booking_settings JSONB DEFAULT '{
  "advanceBookingDays": 30,
  "minBookingHours": 2,
  "maxBookingsPerDay": 50,
  "autoConfirm": true,
  "requirePhone": true,
  "requireEmail": false,
  "allowWalkIns": true,
  "bufferTime": 15
}'::jsonb,
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "emailBookings": true,
  "emailCancellations": true,
  "smsBookings": false,
  "smsCancellations": false,
  "dailyReport": true,
  "weeklyReport": true
}'::jsonb,
ADD COLUMN IF NOT EXISTS appointment_settings JSONB DEFAULT '{
  "defaultDuration": 30,
  "slotIntervals": [15, 30, 45, 60],
  "bufferBetweenAppointments": 5,
  "maxPerCustomerPerDay": 1,
  "allowDoubleBooking": false,
  "requireDeposit": false,
  "depositPercentage": 20
}'::jsonb,
ADD COLUMN IF NOT EXISTS tax_settings JSONB DEFAULT '{
  "salesTaxRate": 8.5,
  "includeTaxInPrice": false,
  "taxIdNumber": "",
  "businessLicenseNumber": "",
  "insuranceProvider": "",
  "insurancePolicyNumber": ""
}'::jsonb,
ADD COLUMN IF NOT EXISTS integration_settings JSONB DEFAULT '{
  "googleCalendar": {"enabled": false, "calendarId": ""},
  "squarePos": {"enabled": false, "merchantId": ""},
  "twilioSms": {"enabled": false, "phoneNumber": ""},
  "mailchimp": {"enabled": false, "apiKey": ""},
  "quickbooks": {"enabled": false, "companyId": ""}
}'::jsonb;

-- Add comments to explain the columns
COMMENT ON COLUMN barbershops.business_hours IS 'Store business hours including special hours and holidays';
COMMENT ON COLUMN barbershops.payment_settings IS 'Payment methods and fee configuration';
COMMENT ON COLUMN barbershops.commission_settings IS 'Barber commission structure and tip handling';
COMMENT ON COLUMN barbershops.booking_settings IS 'Booking rules and requirements';
COMMENT ON COLUMN barbershops.notification_settings IS 'Email and SMS notification preferences';
COMMENT ON COLUMN barbershops.appointment_settings IS 'Appointment slot configuration and rules';
COMMENT ON COLUMN barbershops.tax_settings IS 'Tax rates and compliance information';
COMMENT ON COLUMN barbershops.integration_settings IS 'Third-party service integrations';

-- Create indexes for better query performance on JSONB columns
CREATE INDEX IF NOT EXISTS idx_barbershops_business_hours ON barbershops USING gin(business_hours);
CREATE INDEX IF NOT EXISTS idx_barbershops_payment_settings ON barbershops USING gin(payment_settings);
CREATE INDEX IF NOT EXISTS idx_barbershops_booking_settings ON barbershops USING gin(booking_settings);

-- RLS policies already exist, skipping duplicate policy creation
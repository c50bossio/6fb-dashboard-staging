# Business Metrics Manual Setup for Supabase

## Step 1: Create the Table in Supabase Dashboard

Go to your Supabase Dashboard → SQL Editor and run this SQL:

```sql
-- Business Metrics Table Schema
CREATE TABLE IF NOT EXISTS business_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbershop_id UUID NOT NULL,
    
    -- Metric Period
    metric_date DATE NOT NULL,
    metric_period VARCHAR(10) NOT NULL CHECK (metric_period IN ('daily', 'weekly', 'monthly')),
    
    -- Revenue Metrics
    total_revenue DECIMAL(10,2) DEFAULT 0,
    service_revenue DECIMAL(10,2) DEFAULT 0,
    tip_revenue DECIMAL(10,2) DEFAULT 0,
    product_revenue DECIMAL(10,2) DEFAULT 0,
    average_booking_value DECIMAL(8,2) DEFAULT 0,
    
    -- Booking Metrics
    total_bookings INTEGER DEFAULT 0,
    completed_bookings INTEGER DEFAULT 0,
    cancelled_bookings INTEGER DEFAULT 0,
    no_show_bookings INTEGER DEFAULT 0,
    walk_in_bookings INTEGER DEFAULT 0,
    
    -- Customer Metrics
    unique_customers INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    customer_retention_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Staff Performance
    total_staff_hours DECIMAL(8,2) DEFAULT 0,
    billable_hours DECIMAL(8,2) DEFAULT 0,
    staff_utilization_rate DECIMAL(5,2) DEFAULT 0,
    average_service_time INTEGER DEFAULT 0,
    
    -- Operational Metrics
    chair_utilization_rate DECIMAL(5,2) DEFAULT 0,
    peak_hours_capacity DECIMAL(5,2) DEFAULT 0,
    off_peak_capacity DECIMAL(5,2) DEFAULT 0,
    average_wait_time INTEGER DEFAULT 0,
    
    -- Customer Satisfaction
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    customer_satisfaction_score DECIMAL(5,2) DEFAULT 0,
    
    -- Product/Inventory Metrics
    products_sold INTEGER DEFAULT 0,
    low_stock_alerts INTEGER DEFAULT 0,
    inventory_turnover_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Financial Health
    cost_per_booking DECIMAL(8,2) DEFAULT 0,
    profit_margin DECIMAL(5,2) DEFAULT 0,
    operating_expenses DECIMAL(10,2) DEFAULT 0,
    
    -- Growth Metrics
    booking_growth_rate DECIMAL(5,2) DEFAULT 0,
    revenue_growth_rate DECIMAL(5,2) DEFAULT 0,
    customer_acquisition_cost DECIMAL(8,2) DEFAULT 0,
    lifetime_value_ratio DECIMAL(5,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(barbershop_id, metric_date, metric_period)
);
```

## Step 2: Create Indexes

```sql
-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_business_metrics_barbershop_date 
    ON business_metrics(barbershop_id, metric_date DESC);
    
CREATE INDEX IF NOT EXISTS idx_business_metrics_period 
    ON business_metrics(metric_period, metric_date DESC);
    
CREATE INDEX IF NOT EXISTS idx_business_metrics_revenue 
    ON business_metrics(total_revenue DESC);
    
CREATE INDEX IF NOT EXISTS idx_business_metrics_bookings 
    ON business_metrics(total_bookings DESC);
```

## Step 3: Enable Row Level Security (Optional)

```sql
-- Row Level Security
ALTER TABLE business_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies (if profiles table exists)
CREATE POLICY "Users can view business metrics for their barbershop" ON business_metrics
    FOR SELECT USING (
        barbershop_id IN (
            SELECT barbershop_id FROM profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
        )
    );
```

## Step 4: Insert Sample Data

```sql
-- Get a barbershop ID first
SELECT id FROM barbershops LIMIT 1;

-- Replace 'your-barbershop-id' with actual ID from above query
INSERT INTO business_metrics (
    barbershop_id,
    metric_date,
    metric_period,
    total_revenue,
    service_revenue,
    tip_revenue,
    total_bookings,
    completed_bookings,
    unique_customers,
    staff_utilization_rate,
    chair_utilization_rate,
    average_service_time,
    average_rating,
    customer_satisfaction_score
) VALUES 
(
    'your-barbershop-id',
    CURRENT_DATE,
    'daily',
    850.00,
    720.00,
    130.00,
    18,
    16,
    15,
    78.5,
    82.3,
    35,
    4.6,
    92.0
),
(
    'your-barbershop-id',
    CURRENT_DATE - INTERVAL '1 day',
    'daily',
    720.00,
    620.00,
    100.00,
    15,
    14,
    13,
    72.0,
    75.8,
    38,
    4.5,
    90.0
);
```

## Step 5: Test the API

Once the table is created, test the operations dashboard:

- Visit: http://localhost:9999/dashboard/operations
- The page should now load real metrics from the business_metrics table
- API endpoint: http://localhost:9999/api/operations/dashboard

## Features Enabled

✅ **Operations Dashboard**: Real-time business metrics display
✅ **Revenue Tracking**: Daily, weekly, monthly revenue analytics  
✅ **Performance Metrics**: Staff utilization, chair utilization, customer satisfaction
✅ **Booking Analytics**: Completed, cancelled, no-show tracking
✅ **Alert System**: Smart alerts based on performance thresholds
✅ **Growth Metrics**: Revenue growth, customer acquisition tracking

## Troubleshooting

If the operations dashboard shows empty data:
1. Verify the business_metrics table exists in Supabase
2. Check that sample data was inserted correctly
3. Ensure your user profile has a valid barbershop_id
4. Check browser console for API errors

The system will gracefully fall back to calculated metrics from bookings data if the business_metrics table is not available.
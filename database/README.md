# 6FB AI Agent System - Database Schema Documentation

## 📋 Overview

This directory contains the complete PostgreSQL database schema for the 6FB AI Agent System, designed for Supabase deployment. The database supports a comprehensive barbershop management system with customer relationships, staff scheduling, service catalogs, inventory management, and financial tracking.

## 🏗️ Database Architecture

### Core Tables

1. **customers** - Customer information and relationship management
2. **staff** - Staff members, schedules, and performance tracking
3. **services** - Service catalog with pricing and analytics
4. **inventory** - Inventory management with stock tracking
5. **payments** - Payment processing and financial analytics

### Supporting Tables

- **staff_schedules** - Detailed weekly schedules for staff
- **staff_time_off** - Time off requests and approvals
- **staff_performance_reviews** - Performance review records
- **service_addons** - Optional add-ons for services
- **service_packages** - Service bundles with discounted pricing
- **service_pricing_rules** - Dynamic pricing rules
- **stock_movements** - Historical stock level changes
- **reorder_suggestions** - System-generated reorder recommendations

## 🚀 Quick Deployment

### Option 1: Complete Deployment (Recommended)
```sql
-- Run this in your Supabase SQL editor
\i database/deploy_database.sql
```

### Option 2: Manual Step-by-Step
```sql
-- 1. Create schemas
\i database/schemas/customers.sql
\i database/schemas/staff.sql
\i database/schemas/services.sql
\i database/schemas/inventory.sql
\i database/schemas/payments.sql

-- 2. Insert seed data (optional)
\i database/seed/001_customers_seed.sql
\i database/seed/002_staff_seed.sql
\i database/seed/003_services_seed.sql
\i database/seed/004_inventory_seed.sql
\i database/seed/005_payments_seed.sql
```

## 📊 Schema Details

### Customers Table
- **Purpose**: Customer relationship management and loyalty tracking
- **Key Features**:
  - Customer profiles with contact information
  - Visit history and spending analytics
  - Loyalty points system
  - Customer status (active, inactive, VIP)
  - Preferred barber assignment
- **RLS Policies**: Staff can view/manage all customers
- **Indexes**: Name search, phone lookup, status filtering, analytics queries

### Staff Table
- **Purpose**: Staff management, scheduling, and performance tracking
- **Key Features**:
  - Staff roles (apprentice, barber, senior_barber, master_barber, manager, owner)
  - Commission rates and compensation tracking
  - Skills and specialties
  - Performance metrics and ratings
  - Schedule management
- **RLS Policies**: Role-based access with manager override
- **Indexes**: Role filtering, performance metrics, availability lookup

### Services Table
- **Purpose**: Service catalog management and pricing
- **Key Features**:
  - Service categories (haircuts, beard, treatments, styling, color, special)
  - Dynamic pricing support
  - Performance analytics (bookings, revenue, ratings)
  - Service inclusions and descriptions
  - Staff assignment restrictions
- **RLS Policies**: Public viewing, manager editing
- **Indexes**: Category filtering, popularity, pricing, performance metrics

### Inventory Table
- **Purpose**: Inventory management and automatic reordering
- **Key Features**:
  - Multi-category inventory (hair_products, tools, consumables, retail, supplies)
  - Stock level monitoring with automatic status updates
  - Usage tracking and reorder suggestions
  - Supplier management
  - Cost and pricing tracking
- **RLS Policies**: Staff can view/update inventory
- **Indexes**: SKU lookup, stock levels, categories, suppliers

### Payments Table
- **Purpose**: Payment processing and financial analytics
- **Key Features**:
  - Multiple payment methods (cash, credit_card, debit_card, digital_wallet)
  - Commission calculations
  - Payment status tracking
  - Financial analytics and reporting
  - Refund management
- **RLS Policies**: Staff can view payments, managers can refund
- **Indexes**: Date ranges, payment methods, staff commissions, customer history

## 🔐 Security Features

### Row Level Security (RLS)
All tables have comprehensive RLS policies implemented:
- **Staff Access**: Can view and manage operational data
- **Manager Access**: Full access including financial data and refunds
- **Role-Based**: Uses JWT claims for role determination

### Data Protection
- Soft delete support for customers
- Audit trail with created_by/updated_by tracking
- Automatic timestamp management
- Data validation constraints

## 📈 Analytics & Reporting

### Built-in Views
- **active_customers** - Customer analytics with computed fields
- **customer_analytics** - Real-time customer base metrics
- **daily_payment_summary** - Daily financial analytics
- **monthly_payment_summary** - Monthly revenue tracking
- **barber_commission_summary** - Commission calculations
- **service_performance** - Service analytics with market share
- **inventory_value_summary** - Inventory financial summary
- **top_performing_staff** - Staff performance rankings

### Performance Metrics
- Customer lifetime value and visit patterns
- Staff productivity and commission tracking
- Service popularity and profitability
- Inventory turnover and reorder automation
- Financial trends and forecasting

## 🛠️ Maintenance Functions

### Automated Functions
```sql
-- Update all performance metrics
SELECT update_all_performance_metrics();

-- Generate reorder suggestions
SELECT generate_reorder_suggestions();

-- Clean up old data
SELECT cleanup_old_data(365); -- Keep last 365 days
```

### Data Integrity
- Automatic stock status updates based on levels
- Commission calculations with rate validation
- Stock movement tracking for all inventory changes
- Performance metric updates via triggers

## 🔍 Query Examples

### Customer Analytics
```sql
-- Top VIP customers by spending
SELECT name, total_spent, total_visits, loyalty_points
FROM customers 
WHERE status = 'vip' 
ORDER BY total_spent DESC;

-- Customer retention analysis
SELECT * FROM customer_analytics;
```

### Staff Performance
```sql
-- Top performing staff this week
SELECT name, role, total_revenue_week, total_appointments_week
FROM staff 
WHERE is_active = true 
ORDER BY total_revenue_week DESC;

-- Commission summary
SELECT * FROM staff_commission_summary;
```

### Service Analytics
```sql
-- Most popular services
SELECT name, category, bookings_this_month, revenue_this_month, average_rating
FROM services 
WHERE active = true 
ORDER BY bookings_this_month DESC;

-- Service profitability
SELECT * FROM service_profitability ORDER BY gross_profit_month DESC;
```

### Inventory Management
```sql
-- Low stock items requiring reorder
SELECT * FROM low_stock_items;

-- Inventory value by category
SELECT * FROM inventory_value_summary;
```

### Financial Reports
```sql
-- Daily revenue summary
SELECT * FROM daily_payment_summary 
WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY payment_date DESC;

-- Payment method performance
SELECT * FROM payment_method_analytics;
```

## 📝 Seed Data

The seed data includes:
- **16 test customers** with varied profiles and statuses
- **7 staff members** with different roles and schedules
- **15 services** across all categories with realistic pricing
- **17 inventory items** with various stock levels
- **70+ payment records** for comprehensive analytics

## 🔧 Customization

### Adding New Service Categories
```sql
-- Add new category to enum
ALTER TYPE service_category ADD VALUE 'new_category';

-- Update services
INSERT INTO services (name, category, ...) VALUES (...);
```

### Custom Pricing Rules
```sql
-- Add time-based pricing
INSERT INTO service_pricing_rules (
    name, rule_type, conditions, adjustment_type, adjustment_value
) VALUES (
    'Happy Hour', 'time_based', 
    '{"days": ["monday"], "times": ["14:00-16:00"]}',
    'percentage', -15.0
);
```

### Performance Optimization
```sql
-- Add custom indexes for specific query patterns
CREATE INDEX idx_custom_query ON table_name(column1, column2) 
WHERE condition;
```

## 📞 Support

For questions or issues with the database schema:
1. Check the schema files in `/database/schemas/`
2. Review the seed data in `/database/seed/`
3. Test queries using the provided examples
4. Verify RLS policies are working as expected

## 🏷️ Version History

- **v1.0** - Initial schema with core barbershop functionality
- **v1.1** - Added advanced analytics views and performance metrics
- **v1.2** - Enhanced RLS policies and security features
- **v1.3** - Added inventory management and reorder automation
- **v1.4** - Comprehensive seed data and deployment automation

---

**🎯 Ready for Production**: This schema is battle-tested and ready for production deployment with comprehensive features for managing a modern barbershop business.
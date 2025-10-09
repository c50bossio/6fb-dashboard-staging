# Data Model: Complete Barbershop Setup

**Feature**: Database-API-UI Alignment for Production Launch
**Version**: 1.0.0
**Created**: 2025-01-10

## Overview

This document defines the data entities, relationships, and validation rules for the Complete Barbershop Setup feature. All entities use Supabase PostgreSQL with Row Level Security (RLS) enabled.

---

## Entity Definitions

### 1. Appointment

**Purpose**: Schedule management for customer bookings with barbers

**Table**: `appointments`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique appointment identifier |
| `barbershop_id` | UUID | NOT NULL, REFERENCES barbershops(id) | Shop where appointment takes place |
| `customer_id` | UUID | NOT NULL, REFERENCES customers(id) | Customer booking the appointment |
| `barber_id` | UUID | NOT NULL, REFERENCES profiles(id) | Barber providing the service |
| `service_id` | UUID | NOT NULL, REFERENCES services(id) | Service being performed |
| `appointment_date` | DATE | NOT NULL | Date of appointment |
| `start_time` | TIME | NOT NULL | Appointment start time |
| `end_time` | TIME | NOT NULL | Appointment end time (calculated from duration) |
| `status` | TEXT | NOT NULL, CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')) | Appointment lifecycle state |
| `notes` | TEXT | NULL | Optional appointment notes |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last modification timestamp |

**Indexes**:
- `idx_appointments_barbershop_date` ON (`barbershop_id`, `appointment_date`)
- `idx_appointments_barber_date` ON (`barber_id`, `appointment_date`)
- `idx_appointments_customer` ON (`customer_id`)

**Relationships**:
- MANY Appointments → ONE Barbershop
- MANY Appointments → ONE Customer
- MANY Appointments → ONE Barber (Profile)
- MANY Appointments → ONE Service

**Validation Rules**:
- `end_time` MUST be after `start_time`
- `appointment_date` cannot be in the past (for new appointments)
- Barber must be available during appointment time slot (business logic check)
- No overlapping appointments for same barber (business logic check)

**State Machine**:
```
scheduled → in_progress → completed
         → cancelled
         → no_show
```

**RLS Policy**:
```sql
-- Users can view appointments for their barbershop
CREATE POLICY "View own barbershop appointments" ON appointments
  FOR SELECT USING (
    barbershop_id IN (
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );
```

---

### 2. Customer

**Purpose**: Customer profiles with visit history and loyalty tracking

**Table**: `customers`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique customer identifier |
| `barbershop_id` | UUID | NOT NULL, REFERENCES barbershops(id) | Shop customer belongs to |
| `name` | TEXT | NOT NULL | Customer full name |
| `email` | TEXT | NULL, UNIQUE (per barbershop) | Customer email address |
| `phone` | TEXT | NULL | Customer phone number |
| `join_date` | DATE | NOT NULL, DEFAULT CURRENT_DATE | Date customer first visited |
| `status` | TEXT | NOT NULL, DEFAULT 'active', CHECK (status IN ('active', 'inactive', 'vip')) | Customer status |
| `total_visits` | INTEGER | NOT NULL, DEFAULT 0, CHECK (total_visits >= 0) | Lifetime visit count |
| `total_spent` | DECIMAL(10,2) | NOT NULL, DEFAULT 0.00, CHECK (total_spent >= 0) | Lifetime spend amount |
| `loyalty_points` | INTEGER | NOT NULL, DEFAULT 0, CHECK (loyalty_points >= 0) | Accumulated loyalty points |
| `preferred_barber_id` | UUID | NULL, REFERENCES profiles(id) | Preferred barber (optional) |
| `notes` | TEXT | NULL | Internal customer notes |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last modification timestamp |

**Indexes**:
- `idx_customers_barbershop` ON (`barbershop_id`)
- `idx_customers_email` ON (`email`)
- `idx_customers_phone` ON (`phone`)
- `idx_customers_status` ON (`status`)

**Relationships**:
- MANY Customers → ONE Barbershop
- MANY Customers → ONE Preferred Barber (optional)
- ONE Customer → MANY Appointments

**Validation Rules**:
- Either `email` OR `phone` must be provided (business logic check)
- `email` must be unique within barbershop if provided
- `total_visits`, `total_spent`, `loyalty_points` cannot be negative
- Loyalty points = `total_spent * 2` (business rule: 2 points per dollar)

**RLS Policy**:
```sql
CREATE POLICY "View own barbershop customers" ON customers
  FOR SELECT USING (
    barbershop_id IN (
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );
```

---

### 3. Product

**Purpose**: Product catalog for POS system with inventory tracking

**Table**: `products`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique product identifier |
| `barbershop_id` | UUID | NOT NULL, REFERENCES barbershops(id) | Shop selling the product |
| `name` | TEXT | NOT NULL | Product name |
| `description` | TEXT | NULL | Product description |
| `category` | TEXT | NOT NULL | Product category (hair care, styling, beard care, tools) |
| `brand` | TEXT | NULL | Product brand name |
| `sku` | TEXT | NULL | Stock keeping unit (SKU) |
| `price` | DECIMAL(10,2) | NOT NULL, CHECK (price >= 0) | Retail price |
| `cost` | DECIMAL(10,2) | NOT NULL, DEFAULT 0.00, CHECK (cost >= 0) | Cost per unit |
| `stock_quantity` | INTEGER | NOT NULL, DEFAULT 0, CHECK (stock_quantity >= 0) | Current inventory level |
| `low_stock_threshold` | INTEGER | NOT NULL, DEFAULT 5, CHECK (low_stock_threshold >= 0) | Alert threshold for low stock |
| `commission_rate` | DECIMAL(5,2) | NOT NULL, DEFAULT 10.00, CHECK (commission_rate >= 0 AND commission_rate <= 100) | Barber commission percentage |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Whether product is available for sale |
| `image_url` | TEXT | NULL | Product image URL |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last modification timestamp |

**Indexes**:
- `idx_products_barbershop` ON (`barbershop_id`)
- `idx_products_category` ON (`category`)
- `idx_products_sku` ON (`sku`)
- `idx_products_low_stock` ON (`stock_quantity`) WHERE `stock_quantity <= low_stock_threshold`

**Relationships**:
- MANY Products → ONE Barbershop
- ONE Product → MANY Product Sales
- ONE Product → MANY Inventory Adjustments

**Validation Rules**:
- `price` must be greater than or equal to `cost` (business logic check)
- `stock_quantity` cannot go negative (enforced by CHECK constraint)
- `commission_rate` must be between 0 and 100
- `sku` should be unique within barbershop if provided (business logic check)

**Computed Fields** (calculated, not stored):
- `profit_margin` = `((price - cost) / price) * 100`
- `is_low_stock` = `stock_quantity <= low_stock_threshold`

**RLS Policy**:
```sql
CREATE POLICY "View own barbershop products" ON products
  FOR SELECT USING (
    barbershop_id IN (
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );
```

---

### 4. Product Sale

**Purpose**: POS transaction records with commission tracking

**Table**: `product_sales`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique sale identifier |
| `barbershop_id` | UUID | NOT NULL, REFERENCES barbershops(id) | Shop where sale occurred |
| `product_id` | UUID | NOT NULL, REFERENCES products(id) | Product sold |
| `barber_id` | UUID | NULL, REFERENCES profiles(id) | Barber who made the sale (optional) |
| `customer_id` | UUID | NULL, REFERENCES customers(id) | Customer who purchased (optional) |
| `quantity` | INTEGER | NOT NULL, CHECK (quantity > 0) | Quantity sold |
| `unit_price` | DECIMAL(10,2) | NOT NULL, CHECK (unit_price >= 0) | Price per unit at time of sale |
| `total_amount` | DECIMAL(10,2) | NOT NULL, CHECK (total_amount >= 0) | Total sale amount (quantity * unit_price) |
| `commission_rate` | DECIMAL(5,2) | NOT NULL, CHECK (commission_rate >= 0 AND commission_rate <= 100) | Commission % at time of sale |
| `commission_amount` | DECIMAL(10,2) | NOT NULL, CHECK (commission_amount >= 0) | Commission earned by barber |
| `payment_method` | TEXT | NOT NULL, CHECK (payment_method IN ('cash', 'card', 'digital')) | How customer paid |
| `sale_date` | DATE | NOT NULL, DEFAULT CURRENT_DATE | Date of sale |
| `notes` | TEXT | NULL | Optional sale notes |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp |

**Indexes**:
- `idx_product_sales_barbershop_date` ON (`barbershop_id`, `sale_date`)
- `idx_product_sales_barber` ON (`barber_id`)
- `idx_product_sales_product` ON (`product_id`)
- `idx_product_sales_customer` ON (`customer_id`)

**Relationships**:
- MANY Product Sales → ONE Barbershop
- MANY Product Sales → ONE Product
- MANY Product Sales → ONE Barber (optional)
- MANY Product Sales → ONE Customer (optional)

**Validation Rules**:
- `total_amount` MUST equal `quantity * unit_price`
- `commission_amount` MUST equal `total_amount * (commission_rate / 100)`
- `quantity` must be positive
- `sale_date` cannot be in the future (business logic check)
- Product inventory decreases by `quantity` on sale creation (trigger)

**Triggers**:
```sql
-- Decrease product inventory on sale
CREATE TRIGGER decrease_inventory_on_sale
  AFTER INSERT ON product_sales
  FOR EACH ROW
  EXECUTE FUNCTION decrease_product_stock();
```

**RLS Policy**:
```sql
CREATE POLICY "View own barbershop sales" ON product_sales
  FOR SELECT USING (
    barbershop_id IN (
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );
```

---

### 5. Inventory Adjustment

**Purpose**: Track manual inventory changes (restocks, damages, corrections)

**Table**: `inventory_adjustments`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique adjustment identifier |
| `barbershop_id` | UUID | NOT NULL, REFERENCES barbershops(id) | Shop where adjustment occurred |
| `product_id` | UUID | NOT NULL, REFERENCES products(id) | Product being adjusted |
| `adjustment_type` | TEXT | NOT NULL, CHECK (adjustment_type IN ('restock', 'damage', 'theft', 'correction', 'return')) | Reason for adjustment |
| `quantity_change` | INTEGER | NOT NULL | Change in quantity (positive or negative) |
| `previous_quantity` | INTEGER | NOT NULL, CHECK (previous_quantity >= 0) | Stock level before adjustment |
| `new_quantity` | INTEGER | NOT NULL, CHECK (new_quantity >= 0) | Stock level after adjustment |
| `adjusted_by` | UUID | NOT NULL, REFERENCES profiles(id) | User who made the adjustment |
| `reason` | TEXT | NOT NULL | Detailed reason for adjustment |
| `cost_impact` | DECIMAL(10,2) | NULL | Financial impact (for accounting) |
| `adjustment_date` | DATE | NOT NULL, DEFAULT CURRENT_DATE | Date of adjustment |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp |

**Indexes**:
- `idx_inventory_adj_barbershop_date` ON (`barbershop_id`, `adjustment_date`)
- `idx_inventory_adj_product` ON (`product_id`)
- `idx_inventory_adj_type` ON (`adjustment_type`)

**Relationships**:
- MANY Inventory Adjustments → ONE Barbershop
- MANY Inventory Adjustments → ONE Product
- MANY Inventory Adjustments → ONE User (adjusted_by)

**Validation Rules**:
- `new_quantity` MUST equal `previous_quantity + quantity_change`
- `new_quantity` cannot be negative
- `reason` must be at least 10 characters (business logic check)
- Product `stock_quantity` updated to `new_quantity` on insert (trigger)

**Triggers**:
```sql
-- Update product stock on adjustment
CREATE TRIGGER update_stock_on_adjustment
  AFTER INSERT ON inventory_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock();
```

**RLS Policy**:
```sql
CREATE POLICY "View own barbershop adjustments" ON inventory_adjustments
  FOR SELECT USING (
    barbershop_id IN (
      SELECT barbershop_id FROM barbershop_staff WHERE user_id = auth.uid()
    )
  );
```

---

### 6. Barber Customization

**Purpose**: Individual barber branding and customization settings

**Table**: `barber_customizations`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique customization identifier |
| `barber_id` | UUID | NOT NULL, UNIQUE, REFERENCES profiles(id) | Barber being customized |
| `barbershop_id` | UUID | NOT NULL, REFERENCES barbershops(id) | Shop barber belongs to |
| `custom_url_slug` | TEXT | NOT NULL, UNIQUE | URL slug (e.g., "john-smith") |
| `display_name` | TEXT | NOT NULL | Display name on landing page |
| `bio` | TEXT | NULL | Barber biography |
| `profile_image_url` | TEXT | NULL | Profile photo URL |
| `cover_image_url` | TEXT | NULL | Cover/banner image URL |
| `specialties` | TEXT[] | NULL | Array of specialties (e.g., ["fades", "beards"]) |
| `social_media_links` | JSONB | NULL | Social media URLs (Instagram, TikTok, etc.) |
| `custom_brand_color` | TEXT | NULL | Hex color code for branding |
| `is_accepting_bookings` | BOOLEAN | NOT NULL, DEFAULT true | Whether barber accepts online bookings |
| `requires_shop_approval` | BOOLEAN | NOT NULL, DEFAULT true | Whether changes need shop owner approval |
| `is_approved` | BOOLEAN | NOT NULL, DEFAULT false | Shop owner approval status |
| `approved_at` | TIMESTAMPTZ | NULL | Approval timestamp |
| `approved_by` | UUID | NULL, REFERENCES profiles(id) | Shop owner who approved |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last modification timestamp |

**Indexes**:
- `idx_barber_custom_barber` ON (`barber_id`)
- `idx_barber_custom_barbershop` ON (`barbershop_id`)
- `idx_barber_custom_slug` ON (`custom_url_slug`)

**Relationships**:
- ONE Barber Customization → ONE Barber (Profile)
- ONE Barber Customization → ONE Barbershop
- ONE Barber Customization → ONE Approver (Profile, optional)

**Validation Rules**:
- `custom_url_slug` must be lowercase, alphanumeric with hyphens only (business logic check)
- `custom_url_slug` must be unique across entire system
- If `requires_shop_approval` is true, `is_approved` must be true for changes to be public
- `custom_brand_color` must be valid hex color if provided (e.g., "#FF5733")

**State Machine** (Approval Flow):
```
pending → approved (if requires_shop_approval = true)
        → rejected

published (if requires_shop_approval = false)
```

**RLS Policy**:
```sql
-- Barbers can view/edit their own customization
CREATE POLICY "Barbers manage own customization" ON barber_customizations
  FOR ALL USING (barber_id = auth.uid());

-- Shop owners can view all customizations in their shop
CREATE POLICY "Shop owners view all customizations" ON barber_customizations
  FOR SELECT USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );
```

---

### 7. Barber Service

**Purpose**: Custom services and pricing for individual barbers

**Table**: `barber_services`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique service identifier |
| `barber_id` | UUID | NOT NULL, REFERENCES profiles(id) | Barber offering the service |
| `barbershop_id` | UUID | NOT NULL, REFERENCES barbershops(id) | Shop where service is offered |
| `service_name` | TEXT | NOT NULL | Custom service name |
| `description` | TEXT | NULL | Service description |
| `base_price` | DECIMAL(10,2) | NOT NULL, CHECK (base_price >= 0) | Service price |
| `duration_minutes` | INTEGER | NOT NULL, CHECK (duration_minutes > 0) | Service duration |
| `category` | TEXT | NOT NULL | Service category (haircut, beard, styling, etc.) |
| `is_addon` | BOOLEAN | NOT NULL, DEFAULT false | Whether service is an add-on |
| `parent_service_id` | UUID | NULL, REFERENCES barber_services(id) | Parent service if this is an add-on |
| `requires_deposit` | BOOLEAN | NOT NULL, DEFAULT false | Whether deposit is required |
| `deposit_amount` | DECIMAL(10,2) | NULL, CHECK (deposit_amount >= 0) | Deposit amount if required |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Whether service is available for booking |
| `display_order` | INTEGER | NOT NULL, DEFAULT 0 | Sort order for display |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last modification timestamp |

**Indexes**:
- `idx_barber_services_barber` ON (`barber_id`)
- `idx_barber_services_barbershop` ON (`barbershop_id`)
- `idx_barber_services_category` ON (`category`)
- `idx_barber_services_display` ON (`display_order`)

**Relationships**:
- MANY Barber Services → ONE Barber (Profile)
- MANY Barber Services → ONE Barbershop
- MANY Barber Services → ONE Parent Service (optional, for add-ons)
- ONE Barber Service → MANY Child Services (add-ons)

**Validation Rules**:
- If `requires_deposit` is true, `deposit_amount` must be provided and less than `base_price`
- If `is_addon` is true, `parent_service_id` must be provided
- Add-on services cannot have other add-ons (no nested add-ons)
- `duration_minutes` must be multiple of 15 (business logic check)

**Computed Fields** (calculated, not stored):
- `full_price` = `base_price + SUM(addon.base_price)` if add-ons selected

**RLS Policy**:
```sql
-- Barbers can manage their own services
CREATE POLICY "Barbers manage own services" ON barber_services
  FOR ALL USING (barber_id = auth.uid());

-- All users can view active services
CREATE POLICY "View active services" ON barber_services
  FOR SELECT USING (is_active = true);
```

---

### 8. Barber Performance Metrics

**Purpose**: Track and analyze individual barber performance

**Table**: `barber_performance_metrics`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique metric identifier |
| `barber_id` | UUID | NOT NULL, REFERENCES profiles(id) | Barber being measured |
| `barbershop_id` | UUID | NOT NULL, REFERENCES barbershops(id) | Shop where barber works |
| `metric_date` | DATE | NOT NULL | Date for metrics (daily snapshot) |
| `appointments_completed` | INTEGER | NOT NULL, DEFAULT 0 | Appointments completed that day |
| `appointments_cancelled` | INTEGER | NOT NULL, DEFAULT 0 | Appointments cancelled by customer |
| `appointments_no_show` | INTEGER | NOT NULL, DEFAULT 0 | Customer no-shows |
| `total_service_revenue` | DECIMAL(10,2) | NOT NULL, DEFAULT 0.00 | Revenue from services |
| `total_product_revenue` | DECIMAL(10,2) | NOT NULL, DEFAULT 0.00 | Revenue from product sales |
| `total_tips` | DECIMAL(10,2) | NOT NULL, DEFAULT 0.00 | Tips received |
| `commission_earned` | DECIMAL(10,2) | NOT NULL, DEFAULT 0.00 | Commission from services/products |
| `average_service_duration` | INTEGER | NULL | Average service duration in minutes |
| `customer_satisfaction_score` | DECIMAL(3,2) | NULL, CHECK (customer_satisfaction_score >= 0 AND customer_satisfaction_score <= 5) | Average rating (0-5 scale) |
| `new_customers` | INTEGER | NOT NULL, DEFAULT 0 | New customers acquired |
| `returning_customers` | INTEGER | NOT NULL, DEFAULT 0 | Returning customers served |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp |

**Indexes**:
- `idx_performance_barber_date` ON (`barber_id`, `metric_date`)
- `idx_performance_barbershop_date` ON (`barbershop_id`, `metric_date`)

**Unique Constraint**:
- UNIQUE (`barber_id`, `metric_date`) - One record per barber per day

**Relationships**:
- MANY Performance Metrics → ONE Barber (Profile)
- MANY Performance Metrics → ONE Barbershop

**Validation Rules**:
- All revenue fields must be non-negative
- All count fields must be non-negative
- `customer_satisfaction_score` must be between 0 and 5
- Metrics are calculated daily via scheduled job (not manually entered)

**Computed Aggregations** (for analytics, not stored):
- Weekly/Monthly totals: SUM metrics over date range
- Completion rate: `appointments_completed / (appointments_completed + appointments_cancelled + appointments_no_show)`
- Average ticket: `(total_service_revenue + total_product_revenue) / appointments_completed`

**RLS Policy**:
```sql
-- Barbers can view their own metrics
CREATE POLICY "Barbers view own metrics" ON barber_performance_metrics
  FOR SELECT USING (barber_id = auth.uid());

-- Shop owners view all metrics for their shop
CREATE POLICY "Shop owners view all metrics" ON barber_performance_metrics
  FOR SELECT USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );
```

---

### 9. Organization

**Purpose**: Multi-location enterprise management for franchise operations

**Table**: `organizations`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique organization identifier |
| `name` | TEXT | NOT NULL | Organization/franchise name |
| `owner_id` | UUID | NOT NULL, REFERENCES profiles(id) | Enterprise owner |
| `organization_type` | TEXT | NOT NULL, CHECK (organization_type IN ('franchise', 'chain', 'group')) | Type of organization |
| `tax_id` | TEXT | NULL | Tax identification number |
| `address` | TEXT | NULL | Corporate address |
| `city` | TEXT | NULL | Corporate city |
| `state` | TEXT | NULL | Corporate state |
| `zip_code` | TEXT | NULL | Corporate ZIP code |
| `country` | TEXT | NOT NULL, DEFAULT 'US' | Corporate country |
| `phone` | TEXT | NULL | Corporate phone |
| `email` | TEXT | NULL | Corporate email |
| `website` | TEXT | NULL | Corporate website URL |
| `logo_url` | TEXT | NULL | Organization logo URL |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Whether organization is active |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last modification timestamp |

**Indexes**:
- `idx_organizations_owner` ON (`owner_id`)
- `idx_organizations_type` ON (`organization_type`)

**Relationships**:
- ONE Organization → MANY Barbershops
- ONE Organization → ONE Owner (Profile)

**Validation Rules**:
- `email` must be valid email format if provided
- `phone` must be valid phone format if provided
- `website` must be valid URL if provided
- Organization must have at least one barbershop (business logic check)

**Computed Fields** (calculated, not stored):
- `location_count` = COUNT of barbershops in organization
- `total_revenue` = SUM of revenue across all locations
- `total_staff` = COUNT of staff across all locations

**RLS Policy**:
```sql
-- Enterprise owners can manage their organizations
CREATE POLICY "Owners manage own organizations" ON organizations
  FOR ALL USING (owner_id = auth.uid());

-- Staff can view their organization
CREATE POLICY "Staff view own organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id
      FROM barbershops
      WHERE id IN (
        SELECT barbershop_id
        FROM barbershop_staff
        WHERE user_id = auth.uid()
      )
    )
  );
```

---

### 10. Financial Arrangement

**Purpose**: Define payment arrangements between shop and barbers

**Table**: `financial_arrangements`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique arrangement identifier |
| `barbershop_id` | UUID | NOT NULL, REFERENCES barbershops(id) | Shop with the arrangement |
| `barber_id` | UUID | NOT NULL, REFERENCES profiles(id) | Barber in the arrangement |
| `arrangement_type` | TEXT | NOT NULL, CHECK (arrangement_type IN ('commission', 'booth_rent', 'hybrid')) | Type of financial arrangement |
| `commission_rate_service` | DECIMAL(5,2) | NULL, CHECK (commission_rate_service >= 0 AND commission_rate_service <= 100) | Service commission % (if applicable) |
| `commission_rate_product` | DECIMAL(5,2) | NULL, CHECK (commission_rate_product >= 0 AND commission_rate_product <= 100) | Product commission % (if applicable) |
| `booth_rent_amount` | DECIMAL(10,2) | NULL, CHECK (booth_rent_amount >= 0) | Booth rent amount (if applicable) |
| `booth_rent_frequency` | TEXT | NULL, CHECK (booth_rent_frequency IN ('daily', 'weekly', 'monthly')) | Rent payment frequency |
| `tip_split_barber` | DECIMAL(5,2) | NOT NULL, DEFAULT 100.00, CHECK (tip_split_barber >= 0 AND tip_split_barber <= 100) | Barber's % of tips |
| `tip_split_shop` | DECIMAL(5,2) | NOT NULL, DEFAULT 0.00, CHECK (tip_split_shop >= 0 AND tip_split_shop <= 100) | Shop's % of tips |
| `effective_date` | DATE | NOT NULL | When arrangement starts |
| `end_date` | DATE | NULL | When arrangement ends (NULL = ongoing) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Whether arrangement is currently active |
| `notes` | TEXT | NULL | Additional arrangement details |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last modification timestamp |

**Indexes**:
- `idx_financial_arr_barbershop` ON (`barbershop_id`)
- `idx_financial_arr_barber` ON (`barber_id`)
- `idx_financial_arr_active` ON (`is_active`)

**Unique Constraint**:
- UNIQUE (`barber_id`, `barbershop_id`) WHERE `is_active = true` - One active arrangement per barber per shop

**Relationships**:
- MANY Financial Arrangements → ONE Barbershop
- MANY Financial Arrangements → ONE Barber (Profile)

**Validation Rules**:
- If `arrangement_type` = 'commission', `commission_rate_service` and `commission_rate_product` must be provided
- If `arrangement_type` = 'booth_rent', `booth_rent_amount` and `booth_rent_frequency` must be provided
- If `arrangement_type` = 'hybrid', all commission and booth rent fields must be provided
- `tip_split_barber + tip_split_shop` must equal 100.00
- `end_date` must be after `effective_date` if provided
- Only one active arrangement per barber per shop at any time

**Business Rules**:
- Default service commission: 60%
- Default product commission: 10%
- Tips default to 100% barber, 0% shop
- Booth rent typically paid weekly or monthly

**RLS Policy**:
```sql
-- Barbers can view their own arrangements
CREATE POLICY "Barbers view own arrangements" ON financial_arrangements
  FOR SELECT USING (barber_id = auth.uid());

-- Shop owners manage arrangements for their shop
CREATE POLICY "Shop owners manage arrangements" ON financial_arrangements
  FOR ALL USING (
    barbershop_id IN (
      SELECT id FROM barbershops WHERE owner_id = auth.uid()
    )
  );
```

---

## Entity Relationships Diagram

```
┌─────────────────┐
│  Organization   │
└────────┬────────┘
         │ 1
         │
         │ N
┌────────▼────────┐
│   Barbershop    │
└────────┬────────┘
         │ 1
         │
         ├─────────────────────────────────────┐
         │                                     │
         │ N                                   │ N
┌────────▼────────┐                  ┌────────▼────────────┐
│    Customer     │                  │ Barbershop_Staff    │
└────────┬────────┘                  │   (Barber Profile)  │
         │ 1                         └────────┬────────────┘
         │                                    │ 1
         │ N                                  │
         │                      ┌─────────────┼─────────────┐
         │                      │             │             │
         │                      │             │             │
         │                      │ N           │ N           │ N
┌────────▼────────┐    ┌────────▼────────┐  │  ┌──────────▼──────────┐
│  Appointment    │    │ Product_Sale    │  │  │ Financial_Arrangement│
└─────────────────┘    └────────┬────────┘  │  └─────────────────────┘
                                │ N          │
                                │            │ N
                       ┌────────▼────────┐  │
                       │    Product      │  │
                       └────────┬────────┘  │
                                │ 1          │
                                │            │
                                │ N          │
                       ┌────────▼────────┐  │
                       │   Inventory_    │  │
                       │   Adjustment    │  │
                       └─────────────────┘  │
                                             │ 1
                                             │
                       ┌─────────────────────┼─────────────────────┐
                       │                     │                     │
                       │ 1:1                 │ N                   │ N
              ┌────────▼────────┐   ┌────────▼────────┐  ┌────────▼────────┐
              │ Barber_          │   │ Barber_Service  │  │ Barber_         │
              │ Customization    │   │                 │  │ Performance_    │
              └──────────────────┘   └─────────────────┘  │ Metrics         │
                                                           └─────────────────┘
```

**Key**:
- 1 = One-to-one or many-to-one
- N = One-to-many
- Lines represent foreign key relationships

---

## Data Integrity Rules

### Cascading Deletes
- Deleting a Barbershop should set `barbershop_id` to NULL in related entities (soft delete preferred)
- Deleting a Product should prevent deletion if product_sales exist (business rule)
- Deleting a Barber should prevent deletion if active appointments exist (business rule)

### Audit Logging
All entities include `created_at` and `updated_at` timestamps for audit trails.

### Soft Deletes
Consider using `is_active` or `deleted_at` flags instead of hard deletes for:
- Customers (preserve history)
- Products (preserve sales history)
- Barbers (preserve appointment history)
- Organizations (preserve all related data)

---

## Performance Considerations

### Recommended Indexes
All indexes listed in entity definitions should be created for optimal query performance.

### Partitioning Strategy
For high-volume tables, consider partitioning by date:
- `appointments` - Partition by `appointment_date` (monthly)
- `product_sales` - Partition by `sale_date` (monthly)
- `barber_performance_metrics` - Partition by `metric_date` (yearly)

### Caching Strategy
- Customer lookup by email/phone (frequent queries)
- Product catalog (relatively static)
- Barber availability schedules (computed daily)

---

## Security & Compliance

### Row Level Security (RLS)
All tables MUST have RLS enabled with policies documented in each entity section.

### Personal Identifiable Information (PII)
The following fields contain PII and require special handling:
- `customers.name`, `customers.email`, `customers.phone`
- `profiles.email`, `profiles.full_name`
- `organizations.tax_id`

### GDPR Compliance
- Customers have right to erasure (implement customer data deletion workflow)
- Retain financial records per legal requirements (7 years typically)
- Anonymize customer data in analytics after retention period

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-10 | Initial data model creation for Complete Barbershop Setup feature |

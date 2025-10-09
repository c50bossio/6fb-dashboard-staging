# API Reference

**6FB AI Agent System - Barbershop Management Platform**
**Last Updated**: October 9, 2025
**Version**: 0.9.0
**Base URL**: `https://yourdomain.com/api`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Response Format](#response-format)
3. [Error Handling](#error-handling)
4. [Schedule & Appointments APIs](#schedule--appointments-apis)
5. [Customer Management APIs](#customer-management-apis)
6. [Product Management APIs](#product-management-apis)
7. [Point of Sale (POS) APIs](#point-of-sale-pos-apis)
8. [Inventory Management APIs](#inventory-management-apis)
9. [Barber Customization APIs](#barber-customization-apis)
10. [Common Patterns](#common-patterns)

---

## Authentication

All API endpoints require authentication using Supabase session-based authentication.

### Authorization Header

```http
Authorization: Bearer <supabase_access_token>
```

### Getting an Access Token

```javascript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token
```

### Development Bypass

For local development only, a bypass is available:

```javascript
// Development mode only (not for production)
const response = await fetch('/api/shop/products', {
  headers: {
    'Authorization': 'Bearer dev-bypass-token'
  }
})
```

### User Roles

- **SHOP_OWNER**: Full access to all shop endpoints
- **BARBER**: Limited access (own data only, where applicable)
- **ENTERPRISE_OWNER**: Multi-location access
- **SUPER_ADMIN**: Platform-wide access

---

## Response Format

All API responses follow a consistent JSON structure.

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message here",
  "details": {
    // Optional error details
  }
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET request |
| 201 | Created | Successful POST request |
| 400 | Bad Request | Invalid input or validation error |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Valid auth but insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 500 | Internal Server Error | Server-side error |

---

## Error Handling

### Common Error Codes

```typescript
// Authentication errors
{
  "success": false,
  "error": "Unauthorized",
  "details": { "message": "Missing authentication token" }
}

// Validation errors
{
  "success": false,
  "error": "Bad Request",
  "details": {
    "fields": {
      "email": "Invalid email format",
      "phone": "Phone number required"
    }
  }
}

// Database errors
{
  "success": false,
  "error": "Internal Server Error",
  "details": { "message": "Database query failed" }
}
```

### Error Handling Example

```javascript
try {
  const response = await fetch('/api/shop/products')
  const result = await response.json()

  if (!result.success) {
    console.error('API Error:', result.error)
    // Handle error appropriately
    return
  }

  // Process successful response
  const products = result.data.products

} catch (error) {
  console.error('Network Error:', error)
  // Handle network/parsing errors
}
```

---

## Schedule & Appointments APIs

### GET /api/shop/schedule

Retrieve appointments for the shop with filtering options.

**Authentication**: Required (Shop Owner)

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startDate | string (ISO date) | No | Start date for filter (default: today) |
| endDate | string (ISO date) | No | End date for filter (default: today) |
| barberId | string (UUID) | No | Filter by specific barber |
| status | string | No | Filter by status: 'scheduled', 'confirmed', 'completed', 'cancelled', 'no-show' |

**Example Request**:

```bash
curl -X GET "https://yourdomain.com/api/shop/schedule?startDate=2025-10-09&endDate=2025-10-09&barberId=uuid" \
  -H "Authorization: Bearer <token>"
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "customer_name": "John Doe",
        "customer_phone": "+1234567890",
        "customer_email": "john@example.com",
        "barber_id": "660e8400-e29b-41d4-a716-446655440000",
        "barber_name": "Chris Smith",
        "service_id": "770e8400-e29b-41d4-a716-446655440000",
        "service_name": "Premium Haircut",
        "service_duration": 30,
        "start_time": "2025-10-09T14:00:00Z",
        "end_time": "2025-10-09T14:30:00Z",
        "status": "confirmed",
        "price": 45.00,
        "notes": "Customer prefers fade on sides",
        "created_at": "2025-10-01T10:00:00Z"
      }
    ],
    "services": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440000",
        "name": "Premium Haircut",
        "duration_minutes": 30,
        "price": 45.00,
        "is_active": true
      }
    ],
    "metrics": {
      "total": 12,
      "completed": 8,
      "confirmed": 3,
      "cancelled": 1,
      "no_show": 0,
      "revenue": 540.00
    }
  }
}
```

**Error Responses**:

```json
// 401 Unauthorized
{
  "success": false,
  "error": "Unauthorized",
  "details": { "message": "Authentication required" }
}

// 500 Internal Server Error
{
  "success": false,
  "error": "Internal Server Error",
  "details": { "message": "Failed to fetch appointments" }
}
```

---

## Customer Management APIs

### GET /api/shop/customers

Search and retrieve customer records.

**Authentication**: Required (Shop Owner)

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| search | string | No | Search term (matches name, email, phone) |
| page | number | No | Page number (default: 1) |
| limit | number | No | Results per page (default: 50, max: 200) |
| sortBy | string | No | Sort field: 'name', 'created_at', 'last_visit' (default: 'name') |
| sortOrder | string | No | Sort order: 'asc' or 'desc' (default: 'asc') |

**Example Request**:

```bash
curl -X GET "https://yourdomain.com/api/shop/customers?search=john&page=1&limit=50" \
  -H "Authorization: Bearer <token>"
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440000",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "visit_count": 12,
        "total_spent": 540.00,
        "loyalty_points": 108,
        "preferred_barber_id": "660e8400-e29b-41d4-a716-446655440000",
        "preferred_barber_name": "Chris Smith",
        "last_visit": "2025-10-01",
        "notes": "Prefers short fade",
        "created_at": "2024-05-15T10:30:00Z",
        "updated_at": "2025-10-01T14:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total_count": 327,
      "total_pages": 7
    },
    "metrics": {
      "active_customers": 285,
      "new_customers": 12,
      "vip_customers": 45,
      "inactive_customers": 42,
      "lifetime_value": 45230.50
    }
  }
}
```

### POST /api/shop/customers

Create a new customer record.

**Authentication**: Required (Shop Owner)

**Request Body**:

```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "preferred_barber_id": "660e8400-e29b-41d4-a716-446655440000",
  "notes": "Allergic to certain hair products"
}
```

**Field Validation**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | Min 2 chars, max 100 chars |
| email | string | No | Valid email format |
| phone | string | Yes | E.164 format (e.g., +1234567890) |
| preferred_barber_id | UUID | No | Must be valid barber in shop |
| notes | string | No | Max 500 chars |

**Example Request**:

```bash
curl -X POST "https://yourdomain.com/api/shop/customers" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+1234567890",
    "notes": "New customer"
  }'
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440000",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+1234567890",
    "visit_count": 0,
    "total_spent": 0,
    "loyalty_points": 0,
    "notes": "New customer",
    "created_at": "2025-10-09T10:30:00Z",
    "updated_at": "2025-10-09T10:30:00Z"
  }
}
```

### GET /api/shop/customers/[customerId]

Retrieve detailed customer profile with visit history.

**Authentication**: Required (Shop Owner)

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| customerId | UUID | Yes | Customer ID |

**Example Request**:

```bash
curl -X GET "https://yourdomain.com/api/shop/customers/880e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>"
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "customer": {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "visit_count": 12,
      "total_spent": 540.00,
      "loyalty_points": 108,
      "preferred_barber": {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "name": "Chris Smith"
      },
      "notes": "Prefers short fade",
      "created_at": "2024-05-15T10:30:00Z",
      "updated_at": "2025-10-01T14:00:00Z"
    },
    "appointments": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "service_name": "Premium Haircut",
        "barber_name": "Chris Smith",
        "date": "2025-10-01",
        "start_time": "2025-10-01T14:00:00Z",
        "price": 45.00,
        "status": "completed",
        "notes": "Great service"
      }
    ]
  }
}
```

---

## Product Management APIs

### GET /api/shop/products

Retrieve all products for the shop.

**Authentication**: Required (Shop Owner)

**Query Parameters**: None

**Example Request**:

```bash
curl -X GET "https://yourdomain.com/api/shop/products" \
  -H "Authorization: Bearer <token>"
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "aa0e8400-e29b-41d4-a716-446655440000",
        "name": "Premium Hair Gel",
        "description": "Professional-grade styling gel",
        "category": "styling",
        "sku": "GEL-001",
        "cost_price": 8.50,
        "retail_price": 24.99,
        "current_stock": 45,
        "reserved_stock": 0,
        "min_stock_level": 10,
        "max_stock_level": 100,
        "reorder_point": 15,
        "is_active": true,
        "created_at": "2025-01-15T10:00:00Z",
        "updated_at": "2025-10-01T14:30:00Z"
      }
    ],
    "metrics": {
      "totalProducts": 127,
      "totalValue": 12450.75,
      "lowStock": 8,
      "outOfStock": 2
    }
  }
}
```

### POST /api/shop/products

Create a new product.

**Authentication**: Required (Shop Owner)

**Request Body**:

```json
{
  "name": "New Hair Product",
  "description": "Description here",
  "category": "styling",
  "sku": "SKU-123",
  "cost_price": 10.00,
  "retail_price": 29.99,
  "current_stock": 50,
  "min_stock_level": 10,
  "max_stock_level": 100,
  "reorder_point": 20
}
```

**Field Validation**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | string | Yes | Min 2 chars, max 200 chars |
| description | string | No | Max 1000 chars |
| category | string | Yes | Max 50 chars |
| sku | string | Yes | Unique per shop, max 50 chars |
| cost_price | decimal | Yes | >= 0 |
| retail_price | decimal | Yes | >= cost_price |
| current_stock | integer | Yes | >= 0 |
| min_stock_level | integer | Yes | >= 0 |
| max_stock_level | integer | No | >= min_stock_level |
| reorder_point | integer | No | >= min_stock_level |

**Example Request**:

```bash
curl -X POST "https://yourdomain.com/api/shop/products" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Pomade",
    "category": "styling",
    "sku": "POM-001",
    "cost_price": 12.50,
    "retail_price": 34.99,
    "current_stock": 30,
    "min_stock_level": 10
  }'
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "id": "bb0e8400-e29b-41d4-a716-446655440000",
    "name": "Premium Pomade",
    "category": "styling",
    "sku": "POM-001",
    "cost_price": 12.50,
    "retail_price": 34.99,
    "current_stock": 30,
    "min_stock_level": 10,
    "is_active": true,
    "created_at": "2025-10-09T10:30:00Z"
  }
}
```

### GET /api/shop/products/[id]

Get detailed product information.

**Authentication**: Required (Shop Owner)

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | UUID | Yes | Product ID |

**Example Request**:

```bash
curl -X GET "https://yourdomain.com/api/shop/products/aa0e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>"
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "product": {
      "id": "aa0e8400-e29b-41d4-a716-446655440000",
      "name": "Premium Hair Gel",
      "description": "Professional-grade styling gel",
      "category": "styling",
      "sku": "GEL-001",
      "cost_price": 8.50,
      "retail_price": 24.99,
      "current_stock": 45,
      "min_stock_level": 10,
      "is_active": true
    },
    "adjustment_history": [
      {
        "id": "cc0e8400-e29b-41d4-a716-446655440000",
        "adjustment_type": "received",
        "quantity_change": 50,
        "before_quantity": 0,
        "after_quantity": 50,
        "reason": "Initial stock",
        "adjusted_by_name": "Admin User",
        "created_at": "2025-01-15T10:00:00Z"
      }
    ]
  }
}
```

---

## Point of Sale (POS) APIs

### POST /api/shop/pos

Create a product sale transaction.

**Authentication**: Required (Shop Owner or Staff)

**Request Body**:

```json
{
  "items": [
    {
      "product_id": "aa0e8400-e29b-41d4-a716-446655440000",
      "quantity": 2,
      "unit_price": 24.99
    },
    {
      "product_id": "bb0e8400-e29b-41d4-a716-446655440000",
      "quantity": 1,
      "unit_price": 34.99
    }
  ],
  "barber_id": "660e8400-e29b-41d4-a716-446655440000",
  "customer_id": "880e8400-e29b-41d4-a716-446655440000",
  "payment_method": "card",
  "notes": "Customer requested specific products"
}
```

**Field Validation**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| items | array | Yes | Min 1 item, each with product_id, quantity > 0 |
| barber_id | UUID | No | Must be valid barber in shop |
| customer_id | UUID | No | Must be valid customer in shop |
| payment_method | string | Yes | 'cash', 'card', or 'digital' |
| notes | string | No | Max 500 chars |

**Example Request**:

```bash
curl -X POST "https://yourdomain.com/api/shop/pos" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"product_id": "aa0e8400-e29b-41d4-a716-446655440000", "quantity": 2, "unit_price": 24.99}
    ],
    "barber_id": "660e8400-e29b-41d4-a716-446655440000",
    "payment_method": "card"
  }'
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "sales": [
      {
        "sale_id": "dd0e8400-e29b-41d4-a716-446655440000",
        "product_id": "aa0e8400-e29b-41d4-a716-446655440000",
        "product_name": "Premium Hair Gel",
        "quantity": 2,
        "unit_price": 24.99,
        "total_amount": 49.98,
        "commission_amount": 4.99
      }
    ],
    "totals": {
      "subtotal": 49.98,
      "total_commission": 4.99,
      "item_count": 1,
      "commission_rate": 10
    }
  }
}
```

**Error Response - Insufficient Inventory**:

```json
{
  "success": false,
  "error": "Bad Request",
  "details": {
    "errors": [
      {
        "product_id": "aa0e8400-e29b-41d4-a716-446655440000",
        "product_name": "Premium Hair Gel",
        "error": "Insufficient inventory. Available: 1, Requested: 2"
      }
    ]
  }
}
```

### GET /api/shop/pos

Retrieve sales history with filtering.

**Authentication**: Required (Shop Owner)

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| start_date | string (ISO date) | No | Start date (default: 30 days ago) |
| end_date | string (ISO date) | No | End date (default: today) |
| barber_id | UUID | No | Filter by barber |
| product_id | UUID | No | Filter by product |
| payment_method | string | No | Filter by payment method |
| page | number | No | Page number (default: 1) |
| limit | number | No | Results per page (default: 50, max: 200) |

**Example Request**:

```bash
curl -X GET "https://yourdomain.com/api/shop/pos?start_date=2025-10-01&barber_id=660e8400-e29b-41d4-a716-446655440000&page=1" \
  -H "Authorization: Bearer <token>"
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "sales": [
      {
        "id": "dd0e8400-e29b-41d4-a716-446655440000",
        "product_id": "aa0e8400-e29b-41d4-a716-446655440000",
        "product_name": "Premium Hair Gel",
        "barber_id": "660e8400-e29b-41d4-a716-446655440000",
        "barber_name": "Chris Smith",
        "customer_id": "880e8400-e29b-41d4-a716-446655440000",
        "customer_name": "John Doe",
        "quantity": 2,
        "unit_price": 24.99,
        "total_amount": 49.98,
        "commission_rate": 10,
        "commission_amount": 4.99,
        "payment_method": "card",
        "sale_date": "2025-10-09",
        "notes": "Customer happy with product"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total_count": 243,
      "total_pages": 5
    },
    "summary": {
      "total_sales": 50,
      "total_revenue": 2450.75,
      "total_commissions": 245.07
    },
    "filters": {
      "start_date": "2025-10-01",
      "end_date": "2025-10-09",
      "barber_id": "660e8400-e29b-41d4-a716-446655440000",
      "product_id": null,
      "payment_method": null
    }
  }
}
```

---

## Inventory Management APIs

### POST /api/shop/inventory

Create an inventory adjustment.

**Authentication**: Required (Shop Owner)

**Request Body**:

```json
{
  "product_id": "aa0e8400-e29b-41d4-a716-446655440000",
  "adjustment_type": "damage",
  "quantity_change": -5,
  "reason": "Dropped box during restocking",
  "notes": "5 bottles broken, filed insurance claim"
}
```

**Adjustment Types**:

| Type | Description | Typical Change |
|------|-------------|----------------|
| sale | Product sold | Negative |
| return | Customer returned | Positive |
| damage | Product damaged | Negative |
| theft | Product stolen | Negative |
| recount | Physical inventory recount | Positive or Negative |
| received | New stock from supplier | Positive |

**Field Validation**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| product_id | UUID | Yes | Must be valid product in shop |
| adjustment_type | string | Yes | One of 6 valid types |
| quantity_change | integer | Yes | Can be positive or negative, not zero |
| reason | string | Yes | Min 5 chars, max 200 chars |
| notes | string | No | Max 500 chars |

**Example Request**:

```bash
curl -X POST "https://yourdomain.com/api/shop/inventory" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "aa0e8400-e29b-41d4-a716-446655440000",
    "adjustment_type": "received",
    "quantity_change": 50,
    "reason": "Received new shipment from supplier",
    "notes": "Invoice #12345"
  }'
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "adjustment": {
      "id": "ee0e8400-e29b-41d4-a716-446655440000",
      "product_id": "aa0e8400-e29b-41d4-a716-446655440000",
      "product_name": "Premium Hair Gel",
      "adjustment_type": "received",
      "quantity_change": 50,
      "before_quantity": 45,
      "after_quantity": 95,
      "reason": "Received new shipment from supplier",
      "notes": "Invoice #12345",
      "adjusted_by": "ff0e8400-e29b-41d4-a716-446655440000",
      "adjusted_by_name": "John Manager",
      "created_at": "2025-10-09T14:30:00Z"
    },
    "product": {
      "id": "aa0e8400-e29b-41d4-a716-446655440000",
      "name": "Premium Hair Gel",
      "current_stock": 95,
      "min_stock_level": 10,
      "is_low_stock": false
    }
  }
}
```

**Error Response - Negative Stock**:

```json
{
  "success": false,
  "error": "Bad Request",
  "details": {
    "message": "Adjustment would result in negative stock",
    "current_stock": 5,
    "requested_change": -10,
    "resulting_stock": -5
  }
}
```

### GET /api/shop/inventory

Retrieve adjustment history with filtering.

**Authentication**: Required (Shop Owner)

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| product_id | UUID | No | Filter by product |
| adjustment_type | string | No | Filter by adjustment type |
| start_date | string (ISO date) | No | Start date (default: 30 days ago) |
| end_date | string (ISO date) | No | End date (default: today) |
| adjusted_by | UUID | No | Filter by user |
| page | number | No | Page number (default: 1) |
| limit | number | No | Results per page (default: 50, max: 200) |

**Example Request**:

```bash
curl -X GET "https://yourdomain.com/api/shop/inventory?product_id=aa0e8400-e29b-41d4-a716-446655440000&start_date=2025-10-01" \
  -H "Authorization: Bearer <token>"
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "adjustments": [
      {
        "id": "ee0e8400-e29b-41d4-a716-446655440000",
        "product_id": "aa0e8400-e29b-41d4-a716-446655440000",
        "product_name": "Premium Hair Gel",
        "adjustment_type": "received",
        "quantity_change": 50,
        "before_quantity": 45,
        "after_quantity": 95,
        "reason": "Received new shipment from supplier",
        "notes": "Invoice #12345",
        "adjusted_by": "ff0e8400-e29b-41d4-a716-446655440000",
        "adjusted_by_name": "John Manager",
        "created_at": "2025-10-09T14:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total_count": 125,
      "total_pages": 3
    },
    "summary": {
      "total_adjustments": 50,
      "total_increase": 250,
      "total_decrease": -75,
      "net_change": 175
    }
  }
}
```

---

## Barber Customization APIs

### GET /api/shop/barber-customizations

Retrieve all barber customizations for the shop.

**Authentication**: Required (Shop Owner)

**Query Parameters**: None

**Example Request**:

```bash
curl -X GET "https://yourdomain.com/api/shop/barber-customizations" \
  -H "Authorization: Bearer <token>"
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "customizations": [
      {
        "id": "gg0e8400-e29b-41d4-a716-446655440000",
        "barber_id": "660e8400-e29b-41d4-a716-446655440000",
        "barber_name": "Chris Smith",
        "custom_url_path": "chris-smith",
        "display_name": "Chris - The Fade Master",
        "bio": "10+ years experience specializing in fades and modern cuts",
        "years_experience": 12,
        "specialties": ["Fades", "Modern Cuts", "Beard Styling"],
        "certifications": ["Master Barber License", "Razor Specialist"],
        "branding": {
          "primary_color": "#2C3E50",
          "secondary_color": "#E74C3C",
          "accent_color": "#3498DB",
          "logo_url": "https://cdn.example.com/logos/chris-smith.png",
          "background_image_url": "https://cdn.example.com/bg/chris.jpg"
        },
        "portfolio_images": [
          {
            "url": "https://cdn.example.com/portfolio/fade1.jpg",
            "caption": "Classic fade with line-up",
            "order": 1
          }
        ],
        "contact_info": {
          "phone": "+1234567890",
          "email": "chris@example.com",
          "instagram": "@chrisfades",
          "facebook": "chrisfades",
          "tiktok": "@chrisfades",
          "twitter": "@chrisfades"
        },
        "business_settings": {
          "accepts_walk_ins": true,
          "booking_buffer_minutes": 15,
          "max_advance_booking_days": 60
        },
        "status": "approved",
        "approved_by": "ff0e8400-e29b-41d4-a716-446655440000",
        "approved_at": "2025-10-01T10:00:00Z",
        "created_at": "2025-09-25T14:30:00Z",
        "updated_at": "2025-10-01T10:00:00Z"
      }
    ]
  }
}
```

### POST /api/shop/barber-customizations

Create or update barber customization.

**Authentication**: Required (Shop Owner)

**Request Body**:

```json
{
  "barber_id": "660e8400-e29b-41d4-a716-446655440000",
  "custom_url_path": "chris-smith",
  "display_name": "Chris - The Fade Master",
  "bio": "10+ years experience specializing in fades and modern cuts",
  "years_experience": 12,
  "specialties": ["Fades", "Modern Cuts", "Beard Styling"],
  "certifications": ["Master Barber License"],
  "branding": {
    "primary_color": "#2C3E50",
    "secondary_color": "#E74C3C",
    "accent_color": "#3498DB"
  },
  "contact_info": {
    "instagram": "@chrisfades"
  },
  "business_settings": {
    "accepts_walk_ins": true
  }
}
```

**Field Validation**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| barber_id | UUID | Yes | Must be valid barber in shop |
| custom_url_path | string | Yes | Unique per shop, lowercase, hyphens only |
| display_name | string | Yes | Min 2 chars, max 100 chars |
| bio | string | No | Max 1000 chars |
| years_experience | integer | No | 0-50 |
| specialties | array | No | Array of strings |
| certifications | array | No | Array of strings |
| branding.primary_color | string | No | Valid hex color |
| branding.secondary_color | string | No | Valid hex color |
| branding.accent_color | string | No | Valid hex color |

**Example Request**:

```bash
curl -X POST "https://yourdomain.com/api/shop/barber-customizations" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "barber_id": "660e8400-e29b-41d4-a716-446655440000",
    "custom_url_path": "chris-smith",
    "display_name": "Chris - The Fade Master",
    "bio": "Expert barber with 12+ years experience",
    "years_experience": 12,
    "specialties": ["Fades", "Modern Cuts"]
  }'
```

**Example Response**:

```json
{
  "success": true,
  "data": {
    "id": "gg0e8400-e29b-41d4-a716-446655440000",
    "barber_id": "660e8400-e29b-41d4-a716-446655440000",
    "custom_url_path": "chris-smith",
    "display_name": "Chris - The Fade Master",
    "bio": "Expert barber with 12+ years experience",
    "years_experience": 12,
    "specialties": ["Fades", "Modern Cuts"],
    "status": "draft",
    "created_at": "2025-10-09T10:30:00Z"
  }
}
```

---

## Common Patterns

### Pagination Pattern

All list endpoints support pagination:

```javascript
const page = 1
const limit = 50

const response = await fetch(`/api/shop/customers?page=${page}&limit=${limit}`, {
  headers: { 'Authorization': `Bearer ${token}` }
})

const { data } = await response.json()
console.log(`Page ${data.pagination.page} of ${data.pagination.total_pages}`)
console.log(`Total records: ${data.pagination.total_count}`)
```

### Date Filtering Pattern

Date filters use ISO date format (YYYY-MM-DD):

```javascript
const startDate = '2025-10-01'
const endDate = '2025-10-09'

const response = await fetch(
  `/api/shop/pos?start_date=${startDate}&end_date=${endDate}`,
  { headers: { 'Authorization': `Bearer ${token}` } }
)
```

### Search Pattern

Search endpoints use partial matching:

```javascript
const searchTerm = 'john'

const response = await fetch(`/api/shop/customers?search=${encodeURIComponent(searchTerm)}`, {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Matches: "John", "Johnny", "Johnson", "john@example.com", "+12345678901"
```

### Error Handling Pattern

Consistent error handling across all endpoints:

```javascript
async function fetchData(url) {
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    const result = await response.json()

    if (!result.success) {
      // API returned error
      console.error('API Error:', result.error)
      if (result.details) {
        console.error('Details:', result.details)
      }
      throw new Error(result.error)
    }

    return result.data

  } catch (error) {
    // Network or parsing error
    console.error('Request Error:', error)
    throw error
  }
}
```

### Multi-Tenancy Pattern

All endpoints automatically filter by shop:

```javascript
// No need to pass barbershop_id - it's extracted from auth token
const response = await fetch('/api/shop/products', {
  headers: { 'Authorization': `Bearer ${token}` }
})

// Only products for authenticated user's shop are returned
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authenticated requests**: 100 requests per minute per user
- **Unauthenticated requests**: 20 requests per minute per IP

Rate limit headers returned in all responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1633024800
```

---

## Versioning

Current API version: **v1.0**

API versioning is handled through the base URL. Future versions will be accessible at:

- Current: `/api/shop/*`
- Future: `/api/v2/shop/*`

---

## Support & Resources

- **Feature Documentation**: See `docs/FEATURES.md` for detailed feature guides
- **Deployment Guide**: See `docs/DEPLOYMENT.md` for production setup
- **Changelog**: See `CHANGELOG.md` for recent API changes

---

*Last Updated: October 9, 2025*
*API Version: 1.0*

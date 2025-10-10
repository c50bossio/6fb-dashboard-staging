# API Documentation - 6FB AI Agent System

## Overview

The 6FB AI Agent System provides a comprehensive REST API for booking management, AI integration, and business intelligence. This documentation covers all available endpoints with detailed examples, request/response formats, and authentication requirements.

**Base URLs:**
- Frontend API: `http://localhost:9999/api`
- Backend API: `http://localhost:8001`

## Authentication

All protected endpoints require authentication via Supabase JWT tokens.

### Headers
```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

### User Roles
- `CLIENT`: Regular customers
- `BARBER`: Barber/staff members  
- `SHOP_OWNER`: Shop management
- `ENTERPRISE_OWNER`: Multi-location management
- `SUPER_ADMIN`: System administration

## 🗓️ Booking & Appointments API

### Appointments

#### GET /api/appointments
Retrieve appointments with filtering options.

**Query Parameters:**
- `start_date` (string): ISO date string
- `end_date` (string): ISO date string  
- `barber_id` (string): Filter by specific barber
- `status` (string): PENDING, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW
- `customer_id` (string): Filter by customer

**Request:**
```http
GET /api/appointments?start_date=2025-09-10&end_date=2025-09-17&status=CONFIRMED
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "appt_123",
      "customer_id": "cust_456",
      "barber_id": "barber_789", 
      "service_ids": ["svc_001", "svc_002"],
      "start_time": "2025-09-10T10:00:00Z",
      "end_time": "2025-09-10T10:30:00Z",
      "status": "CONFIRMED",
      "total_price": 35.00,
      "tip_amount": 5.00,
      "notes": "Customer requested specific styling",
      "priority": "NORMAL",
      "booking_source": "ONLINE",
      "created_at": "2025-09-09T14:30:00Z",
      "updated_at": "2025-09-09T14:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 50
}
```

#### POST /api/appointments
Create a new appointment.

**Request:**
```json
{
  "customer_info": {
    "name": "John Smith",
    "email": "john@example.com", 
    "phone": "+1234567890",
    "is_walkin": false
  },
  "barber_id": "barber_789",
  "service_ids": ["svc_001"],
  "start_time": "2025-09-10T10:00:00Z",
  "duration_minutes": 30,
  "notes": "First time customer",
  "priority": "NORMAL",
  "booking_source": "ONLINE"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "appt_124",
    "customer_id": "cust_457",
    "barber_id": "barber_789",
    "service_ids": ["svc_001"], 
    "start_time": "2025-09-10T10:00:00Z",
    "end_time": "2025-09-10T10:30:00Z",
    "status": "PENDING",
    "total_price": 25.00,
    "created_at": "2025-09-09T15:00:00Z"
  }
}
```

#### PATCH /api/appointments/[id]
Update an existing appointment.

**Request:**
```json
{
  "start_time": "2025-09-10T11:00:00Z",
  "status": "CONFIRMED", 
  "notes": "Moved to 11 AM per customer request"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "appt_123",
    "start_time": "2025-09-10T11:00:00Z",
    "end_time": "2025-09-10T11:30:00Z",
    "status": "CONFIRMED",
    "updated_at": "2025-09-09T15:15:00Z"
  }
}
```

#### DELETE /api/appointments/[id]
Cancel or delete an appointment.

**Response:**
```json
{
  "success": true,
  "message": "Appointment cancelled successfully"
}
```

### Availability

#### GET /api/appointments/availability
Check barber availability for booking.

**Query Parameters:**
- `barber_id` (string): Required - Barber ID
- `date` (string): Required - ISO date string
- `duration_minutes` (number): Required - Service duration

**Request:**
```http
GET /api/appointments/availability?barber_id=barber_789&date=2025-09-10&duration_minutes=30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "available_slots": [
      {
        "start_time": "2025-09-10T09:00:00Z",
        "end_time": "2025-09-10T09:30:00Z"
      },
      {
        "start_time": "2025-09-10T10:00:00Z", 
        "end_time": "2025-09-10T10:30:00Z"
      }
    ],
    "business_hours": {
      "start": "09:00",
      "end": "18:00"
    },
    "breaks": [
      {
        "start": "12:00",
        "end": "13:00"
      }
    ]
  }
}
```

#### POST /api/appointments/availability
Validate a specific time slot.

**Request:**
```json
{
  "barber_id": "barber_789",
  "start_time": "2025-09-10T10:00:00Z",
  "duration_minutes": 30,
  "exclude_appointment_id": "appt_123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "available": true,
    "conflicts": []
  }
}
```

### Recurring Appointments

#### POST /api/appointments/recurring
Create recurring appointments using RRule.

**Request:**
```json
{
  "customer_info": {
    "name": "John Smith",
    "email": "john@example.com"
  },
  "barber_id": "barber_789",
  "service_ids": ["svc_001"],
  "start_time": "2025-09-10T10:00:00Z",
  "duration_minutes": 30,
  "recurrence_rule": {
    "frequency": "WEEKLY",
    "interval": 2,
    "by_weekday": ["MO"],
    "count": 8
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "series_id": "series_456",
    "appointments_created": 8,
    "appointments": [
      {
        "id": "appt_124",
        "start_time": "2025-09-10T10:00:00Z"
      }
    ]
  }
}
```

## 👥 Customer Management API

### Customers

#### GET /api/customers
List customers with search and filtering.

**Query Parameters:**
- `search` (string): Search by name, email, or phone
- `limit` (number): Results per page (default: 50)
- `offset` (number): Pagination offset

**Request:**
```http
GET /api/customers?search=john&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cust_456",
      "name": "John Smith",
      "email": "john@example.com",
      "phone": "+1234567890", 
      "visit_count": 5,
      "total_spent": 175.00,
      "first_visit": "2025-07-15T10:00:00Z",
      "last_visit": "2025-09-05T14:30:00Z",
      "preferred_barber_id": "barber_789",
      "communication_preferences": {
        "sms_enabled": true,
        "email_enabled": true,
        "marketing_consent": true
      },
      "created_at": "2025-07-15T09:45:00Z"
    }
  ]
}
```

#### POST /api/customers
Create a new customer profile.

**Request:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1987654321",
  "communication_preferences": {
    "sms_enabled": true,
    "email_enabled": false,
    "marketing_consent": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cust_458",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1987654321",
    "visit_count": 0,
    "total_spent": 0.00,
    "created_at": "2025-09-09T16:00:00Z"
  }
}
```

#### GET /api/customers/search
Search customers with autocomplete.

**Query Parameters:**
- `q` (string): Search query
- `limit` (number): Max results (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cust_456",
      "name": "John Smith", 
      "email": "john@example.com",
      "phone": "+1234567890"
    }
  ]
}
```

## 👨‍💼 Staff & Barber Management API

### Barbers

#### GET /api/barbers
List all barbers/staff members.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "barber_789",
      "user_id": "user_101",
      "name": "Mike Johnson",
      "email": "mike@barbershop.com",
      "specialties": ["haircut", "beard_trim"],
      "commission_rate": 0.60,
      "is_active": true,
      "working_hours": {
        "monday": {"start": "09:00", "end": "17:00"},
        "tuesday": {"start": "09:00", "end": "17:00"}
      },
      "break_times": [
        {"start": "12:00", "end": "13:00"}
      ],
      "max_concurrent_bookings": 1,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### Barber Availability

#### GET /api/barbers/[id]/availability
Get detailed availability for a specific barber.

**Query Parameters:**
- `start_date` (string): Start date range
- `end_date` (string): End date range

**Response:**
```json
{
  "success": true,
  "data": {
    "barber_id": "barber_789",
    "working_hours": {
      "monday": {"start": "09:00", "end": "17:00", "is_working": true},
      "tuesday": {"start": "09:00", "end": "17:00", "is_working": true}
    },
    "break_times": [
      {"start": "12:00", "end": "13:00"}
    ],
    "special_dates": [
      {
        "date": "2025-12-25",
        "is_working": false,
        "reason": "Christmas Day"
      }
    ],
    "booked_slots": [
      {
        "start_time": "2025-09-10T10:00:00Z",
        "end_time": "2025-09-10T10:30:00Z",
        "appointment_id": "appt_123"
      }
    ]
  }
}
```

#### POST /api/barbers/[id]/availability
Update barber availability settings.

**Request:**
```json
{
  "working_hours": {
    "monday": {"start": "08:00", "end": "16:00", "is_working": true}
  },
  "break_times": [
    {"start": "12:00", "end": "13:00"}
  ],
  "special_dates": [
    {
      "date": "2025-12-25",
      "is_working": false,
      "reason": "Christmas Day"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "barber_id": "barber_789",
    "updated_at": "2025-09-09T16:30:00Z"
  }
}
```

## 💼 Services API

### Services

#### GET /api/services
List available services.

**Query Parameters:**
- `category` (string): Filter by service category
- `barber_id` (string): Filter by barber availability

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "svc_001",
      "name": "Classic Haircut",
      "description": "Traditional haircut with styling",
      "category": "Haircut",
      "duration_minutes": 30,
      "price": 25.00,
      "is_active": true,
      "requires_consultation": false,
      "created_at": "2025-01-01T10:00:00Z"
    },
    {
      "id": "svc_002", 
      "name": "Beard Trim",
      "description": "Professional beard trimming and styling",
      "category": "Beard",
      "duration_minutes": 15,
      "price": 15.00,
      "is_active": true,
      "requires_consultation": false,
      "created_at": "2025-01-01T10:00:00Z"
    }
  ]
}
```

#### POST /api/services
Create a new service.

**Request:**
```json
{
  "name": "Premium Styling Package",
  "description": "Haircut, beard trim, and hot towel treatment",
  "category": "Package",
  "duration_minutes": 60,
  "price": 65.00,
  "requires_consultation": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "svc_003",
    "name": "Premium Styling Package",
    "duration_minutes": 60,
    "price": 65.00,
    "created_at": "2025-09-09T17:00:00Z"
  }
}
```

## 🤖 AI & Intelligence API

### AI Chat

#### POST /api/ai/enhanced-chat
Send message to AI business coach.

**Request:**
```json
{
  "message": "How can I increase my booking rate during slow hours?",
  "session_id": "session_123",
  "business_context": {
    "barbershop_id": "shop_456",
    "current_metrics": {
      "daily_bookings": 12,
      "revenue_today": 420.00
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Based on your current booking patterns, I recommend implementing dynamic pricing during off-peak hours (2-5 PM). Your data shows 40% lower utilization during these times. Consider offering 15% discounts for bookings made 24 hours in advance during these slots.",
    "provider": "openai",
    "confidence": 0.89,
    "message_type": "business_analysis",
    "recommendations": [
      "Implement off-peak pricing strategy (15% discount)",
      "Create advance booking incentives",
      "Consider adding express services for slow periods"
    ],
    "session_id": "session_123",
    "timestamp": "2025-09-09T17:30:00Z"
  }
}
```

### Business Recommendations

#### GET /api/business/recommendations
Get AI-generated business recommendations.

**Query Parameters:**
- `focus` (string): revenue, customer_service, operations, marketing
- `time_period` (string): 7d, 30d, 90d

**Response:**
```json
{
  "success": true,
  "data": {
    "strategic_insights": [
      {
        "category": "Revenue Optimization",
        "priority": "HIGH",
        "recommendation": "Peak hour pricing implementation",
        "impact": "Potential $450 monthly revenue increase",
        "implementation_timeline": "2-3 weeks",
        "success_metrics": [
          "15% revenue increase during peak hours",
          "Maintained customer satisfaction above 4.2/5"
        ]
      }
    ],
    "immediate_actions": [
      {
        "action": "Review and optimize service pricing",
        "expected_outcome": "10-15% margin improvement",
        "difficulty": "LOW"
      }
    ],
    "performance_insights": {
      "current_utilization": 72.5,
      "industry_benchmark": 78.0,
      "improvement_opportunity": 5.5
    },
    "generated_at": "2025-09-09T17:45:00Z"
  }
}
```

### Predictive Analytics

#### GET /api/analytics/predictive
Get ML-powered business forecasts.

**Query Parameters:**
- `timeframe` (string): 1d, 7d, 30d
- `metrics` (string): revenue, bookings, customers, utilization

**Response:**
```json
{
  "success": true,
  "data": {
    "revenue_forecast": {
      "timeframe": "7d",
      "predictions": [
        {
          "date": "2025-09-10",
          "predicted_revenue": 485.30,
          "confidence": 0.87,
          "trend": "increasing"
        }
      ],
      "total_predicted": 3247.80,
      "confidence_interval": {
        "lower": 2890.50,
        "upper": 3605.10
      }
    },
    "customer_insights": {
      "retention_rate_prediction": 0.82,
      "new_customer_forecast": 15,
      "lifetime_value_trend": "increasing"
    },
    "model_performance": {
      "accuracy": 87.3,
      "last_training": "2025-09-09T12:00:00Z",
      "data_points": 2847
    }
  }
}
```

### Forecasting

#### GET /api/forecasting/revenue
Get detailed revenue forecasting.

**Query Parameters:**
- `horizon` (string): 1d, 7d, 30d, 90d
- `granularity` (string): hourly, daily, weekly

**Response:**
```json
{
  "success": true,
  "data": {
    "forecast_summary": {
      "horizon": "7d",
      "total_predicted_revenue": 3247.80,
      "average_daily": 463.97,
      "growth_rate": 0.085,
      "confidence": 0.87
    },
    "daily_breakdown": [
      {
        "date": "2025-09-10",
        "predicted_revenue": 485.30,
        "predicted_bookings": 18,
        "peak_hours": ["10:00-12:00", "14:00-16:00"],
        "confidence": 0.89
      }
    ],
    "risk_assessment": {
      "volatility": "LOW",
      "seasonal_factors": ["Tuesday typically 15% below average"],
      "recommendations": [
        "Consider Tuesday promotional pricing",
        "Focus marketing efforts on Mon-Wed"
      ]
    }
  }
}
```

## 📊 Analytics & Reporting API

### Business Metrics

#### GET /api/analytics/business-metrics
Get comprehensive business performance metrics.

**Query Parameters:**
- `period` (string): today, week, month, quarter, year
- `compare_previous` (boolean): Include previous period comparison

**Response:**
```json
{
  "success": true,
  "data": {
    "revenue": {
      "current": 3247.80,
      "previous": 2891.50,
      "change_percent": 12.3,
      "trend": "increasing"
    },
    "bookings": {
      "total": 127,
      "completed": 98,
      "cancelled": 8,
      "no_shows": 21,
      "completion_rate": 77.2
    },
    "customers": {
      "total_served": 89,
      "new_customers": 23,
      "returning_customers": 66,
      "retention_rate": 74.2
    },
    "operational": {
      "utilization_rate": 72.5,
      "average_service_time": 28.5,
      "revenue_per_hour": 45.30,
      "staff_efficiency": 89.2
    },
    "period": {
      "start": "2025-09-03T00:00:00Z",
      "end": "2025-09-09T23:59:59Z"
    }
  }
}
```

### Custom Reports

#### POST /api/analytics/custom-report
Generate custom business reports.

**Request:**
```json
{
  "report_type": "customer_analysis",
  "date_range": {
    "start": "2025-08-01T00:00:00Z",
    "end": "2025-09-09T23:59:59Z"
  },
  "filters": {
    "barber_ids": ["barber_789"],
    "service_categories": ["Haircut", "Beard"]
  },
  "metrics": ["revenue", "frequency", "satisfaction"],
  "format": "json"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "report_id": "report_789",
    "generated_at": "2025-09-09T18:00:00Z",
    "summary": {
      "total_customers": 156,
      "total_revenue": 8750.30,
      "average_ticket": 56.09,
      "customer_segments": {
        "new": 34,
        "regular": 89,
        "vip": 33
      }
    },
    "detailed_metrics": {
      "monthly_breakdown": [
        {
          "month": "2025-08",
          "revenue": 4250.15,
          "customers": 78,
          "avg_frequency": 2.3
        }
      ]
    },
    "download_url": "/api/reports/download/report_789"
  }
}
```

## 🔄 Real-Time Features API

### WebSocket Connection

#### GET /api/realtime/connect
Initialize real-time WebSocket connection.

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "session_456",
    "pusher_config": {
      "key": "your_pusher_key",
      "cluster": "us2",
      "auth_endpoint": "/api/realtime/auth"
    },
    "channels": [
      "business-metrics-user_123",
      "notifications-user_123",
      "ai-responses-user_123"
    ]
  }
}
```

### Live Metrics

#### GET /api/realtime/metrics
Get current real-time business metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "revenue_today": 485.30,
      "bookings_today": 18,
      "satisfaction_rating": 4.3,
      "utilization_rate": 73.2
    },
    "live_activity": {
      "active_customers": 3,
      "average_wait_time": 8,
      "current_hour_status": "peak",
      "next_available_slot": "2025-09-10T11:30:00Z"
    },
    "trends": {
      "revenue_change": 12.5,
      "booking_change": -2.1,
      "satisfaction_change": 0.8
    },
    "timestamp": "2025-09-09T18:15:00Z"
  }
}
```

### Notifications

#### GET /api/notifications
Get user notifications with filtering.

**Query Parameters:**
- `type` (string): booking, revenue, system, ai_insight
- `status` (string): unread, read, all
- `limit` (number): Max notifications (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "notif_456",
      "type": "booking",
      "title": "New Booking Confirmed",
      "message": "John Smith booked a haircut for tomorrow at 10 AM",
      "priority": "NORMAL",
      "is_read": false,
      "action_url": "/appointments/appt_124",
      "created_at": "2025-09-09T18:20:00Z"
    }
  ],
  "unread_count": 3
}
```

#### POST /api/notifications/mark-read
Mark notifications as read.

**Request:**
```json
{
  "notification_ids": ["notif_456", "notif_457"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "2 notifications marked as read"
}
```

## 🚨 Alert Management API

### Alerts

#### GET /api/alerts/active
Get active system and business alerts.

**Query Parameters:**
- `priority` (string): LOW, MEDIUM, HIGH, URGENT
- `category` (string): business, system, customer, revenue

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "alert_123",
      "category": "business", 
      "priority": "HIGH",
      "title": "Revenue Goal Achievement",
      "message": "Daily revenue goal of $500 achieved 2 hours early",
      "confidence": 0.95,
      "action_required": false,
      "auto_resolve": true,
      "created_at": "2025-09-09T16:00:00Z"
    }
  ]
}
```

#### POST /api/alerts/acknowledge
Acknowledge and handle alerts.

**Request:**
```json
{
  "alert_id": "alert_123",
  "action": "acknowledge",
  "notes": "Reviewed revenue performance"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Alert acknowledged successfully"
}
```

## 🔧 System Management API

### Health Check

#### GET /api/health
Comprehensive system health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-09-09T18:30:00Z",
    "services": {
      "database": {
        "status": "healthy",
        "response_time": 25,
        "connections": 8
      },
      "ai_services": {
        "openai": "healthy",
        "anthropic": "healthy", 
        "gemini": "healthy"
      },
      "real_time": {
        "pusher": "healthy",
        "websocket_connections": 12
      },
      "external_apis": {
        "supabase": "healthy",
        "stripe": "healthy"
      }
    },
    "performance": {
      "avg_response_time": 150,
      "requests_per_minute": 45,
      "error_rate": 0.02
    }
  }
}
```

### Configuration

#### GET /api/v1/settings/barbershop
Get barbershop configuration settings.

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Mike's Barbershop",
    "address": "123 Main St, Anytown, USA",
    "phone": "+1234567890",
    "email": "contact@mikesbarber.com",
    "timezone": "America/New_York",
    "business_hours": {
      "monday": {"start": "09:00", "end": "17:00", "is_open": true},
      "tuesday": {"start": "09:00", "end": "17:00", "is_open": true}
    },
    "booking_settings": {
      "advance_booking_days": 30,
      "cancellation_hours": 24,
      "default_service_duration": 30,
      "buffer_time_minutes": 5
    }
  }
}
```

#### POST /api/v1/settings/barbershop  
Update barbershop settings.

**Request:**
```json
{
  "name": "Mike's Premium Barbershop",
  "booking_settings": {
    "advance_booking_days": 45,
    "cancellation_hours": 48
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

## 🔐 Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid appointment time",
    "details": {
      "field": "start_time",
      "reason": "Cannot book appointments in the past"
    },
    "request_id": "req_789"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND`: Resource not found
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `CONFLICT`: Resource conflict (e.g., double booking)
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error
- `SERVICE_UNAVAILABLE`: External service unavailable

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `422`: Unprocessable Entity
- `429`: Too Many Requests
- `500`: Internal Server Error
- `503`: Service Unavailable

## 📝 Rate Limits

### Default Limits
- **General API**: 1000 requests per hour per user
- **AI Endpoints**: 100 requests per hour per user
- **Real-time**: 500 connections per user
- **File Uploads**: 50 requests per hour per user

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1694284800
```

## 🔄 Pagination

### Query Parameters
- `page` (number): Page number (starts at 1)
- `per_page` (number): Items per page (default: 50, max: 100)

### Response Format
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "current_page": 1,
    "per_page": 50,
    "total_pages": 3,
    "total_items": 127,
    "has_next": true,
    "has_previous": false
  }
}
```

## 📚 SDK Examples

### JavaScript/Node.js

```javascript
// Initialize API client
const API_BASE = 'http://localhost:9999/api';
const token = 'your_jwt_token';

// Create appointment
async function createAppointment(appointmentData) {
  const response = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(appointmentData)
  });
  
  const result = await response.json();
  return result;
}

// Get AI business insights
async function getBusinessInsights(message) {
  const response = await fetch(`${API_BASE}/ai/enhanced-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ message })
  });
  
  const result = await response.json();
  return result.data.response;
}
```

### Python

```python
import requests

class BookingAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        }
    
    def create_appointment(self, appointment_data):
        response = requests.post(
            f'{self.base_url}/appointments',
            json=appointment_data,
            headers=self.headers
        )
        return response.json()
    
    def get_availability(self, barber_id, date, duration):
        params = {
            'barber_id': barber_id,
            'date': date,
            'duration_minutes': duration
        }
        response = requests.get(
            f'{self.base_url}/appointments/availability',
            params=params,
            headers=self.headers
        )
        return response.json()

# Usage
api = BookingAPI('http://localhost:9999/api', 'your_jwt_token')
availability = api.get_availability('barber_789', '2025-09-10', 30)
```

### cURL Examples

```bash
# Create appointment
curl -X POST http://localhost:9999/api/appointments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "customer_info": {
      "name": "John Smith",
      "email": "john@example.com"
    },
    "barber_id": "barber_789",
    "service_ids": ["svc_001"],
    "start_time": "2025-09-10T10:00:00Z"
  }'

# Get business metrics
curl -X GET "http://localhost:9999/api/analytics/business-metrics?period=week" \
  -H "Authorization: Bearer your_jwt_token"

# AI chat request
curl -X POST http://localhost:9999/api/ai/enhanced-chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "message": "What are my busiest hours this week?"
  }'
```

## 🔄 WebSocket Events

### Event Types
- `metrics.updated`: Real-time business metrics
- `notification.new`: New notifications
- `appointment.created`: New appointment booked
- `appointment.updated`: Appointment changed
- `ai.response`: AI chat response ready

### Event Format
```json
{
  "event": "metrics.updated",
  "data": {
    "revenue_today": 485.30,
    "bookings_today": 18
  },
  "timestamp": "2025-09-09T18:45:00Z",
  "user_id": "user_123"
}
```

## 🚀 Getting Started

1. **Authentication**: Obtain JWT token via `/api/v1/auth/login`
2. **Test Connection**: Check system health at `/api/health`
3. **Create Appointment**: Try the appointments API
4. **Real-time**: Connect to WebSocket for live updates
5. **AI Integration**: Use the enhanced chat API

## 📞 Support

- **API Issues**: Check the system health endpoint first
- **Authentication Problems**: Verify JWT token validity
- **Rate Limiting**: Check response headers for limits
- **Real-time Issues**: Verify WebSocket connection status

---

*Last Updated: September 2025*  
*API Version: 5.0 - Complete Business Intelligence Platform*
# 6FB AI Agent System - Customize API Reference

## Overview

This document provides complete API reference documentation for the 6FB AI Agent System customization endpoints. All APIs are designed around REST principles with JSON request/response format and JWT authentication.

## Base Configuration

```javascript
const API_CONFIG = {
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://api.bookedbarber.com/api'
    : 'http://localhost:8000/api',
  version: 'v1',
  timeout: 30000,
  retryAttempts: 3
}
```

## Authentication

### JWT Token Authentication

All endpoints require authentication via JWT tokens in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### Authentication Service Methods

```javascript
import { AuthenticationService } from '@/lib/api/customization-api'

// Token validation
const authResult = await AuthenticationService.validateToken(token)
// Returns: { success: boolean, user: UserObject, error?: string }

// User role retrieval
const userRole = await AuthenticationService.getUserRole(userId)
// Returns: 'BARBER' | 'SHOP_OWNER' | 'ENTERPRISE_OWNER' | 'SUPER_ADMIN'

// Permission checking
const hasPermission = AuthenticationService.hasPermission(role, action)
// Returns: boolean
```

### Permission Levels

| Role | Permissions |
|------|-------------|
| BARBER | `read_own`, `write_own` |
| SHOP_OWNER | `read_shop`, `write_shop`, `manage_barbers` |
| ENTERPRISE_OWNER | `read_all`, `write_all`, `bulk_operations` |
| SUPER_ADMIN | All permissions |

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Descriptive error message",
  "code": "ERROR_CODE",
  "field": "field_name",
  "details": {
    "validation_errors": ["Field is required"],
    "suggestions": ["Try using a different value"]
  },
  "request_id": "req_123456789"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | Authentication token missing |
| `AUTH_INVALID` | 401 | Invalid or expired token |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permissions |
| `VALIDATION_ERROR` | 400 | Request data validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SIX_FIGURE_VALIDATION_FAILED` | 400 | Business methodology requirements not met |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource doesn't exist |
| `CONFLICT` | 409 | Resource conflict or duplicate |
| `INTERNAL_ERROR` | 500 | Server-side error |

## Rate Limiting

### Rate Limit Configuration

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Standard | 100 requests | per minute |
| Upload | 50 requests | per minute |
| Bulk Operations | 10 requests | per minute |
| Analytics | 200 requests | per minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
X-RateLimit-Window: 60
```

## Templates API

### GET /api/customization/templates

Retrieve templates with filtering and pagination.

#### Request Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | string | - | Filter by template category |
| `six_figure_alignment` | string | - | Filter by methodology alignment |
| `pricing_tier` | string | - | Filter by pricing tier |
| `status` | string | - | Filter by template status |
| `sort_by` | string | `created_at` | Sort field |
| `sort_order` | string | `desc` | Sort direction |
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page |

#### Request Example

```javascript
const response = await fetch('/api/customization/templates?' + new URLSearchParams({
  category: 'modern',
  six_figure_alignment: 'premium',
  page: '1',
  limit: '10'
}), {
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
})

const data = await response.json()
```

#### Response Example

```json
{
  "templates": [
    {
      "id": "template_01H8EXAMPLE",
      "name": "Premium Barbershop",
      "display_name": "Premium Professional",
      "category": "modern",
      "six_figure_alignment": "premium",
      "positioning_strategy": "luxury_expert",
      "value_proposition": "Exclusive grooming experience",
      "pricing_strategy": "value_based_premium",
      "target_revenue_impact": 1.35,
      "preview_image_url": "https://cdn.bookedbarber.com/templates/premium-preview.jpg",
      "color_scheme": {
        "primary": "#1A365D",
        "secondary": "#2C5282",
        "accent": "#D69E2E",
        "text": "#1A202C",
        "background": "#F7FAFC"
      },
      "layout_config": {
        "header_style": "elegant",
        "section_order": ["hero", "services", "testimonials", "contact"],
        "spacing": "generous"
      },
      "is_premium": true,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:22:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "filters": {
    "category": "modern",
    "six_figure_alignment": "premium",
    "applied_count": 2
  }
}
```

### POST /api/customization/templates

Create a new template with Six Figure Barber validation.

#### Request Body Schema

```json
{
  "name": "string (required, 1-100 chars)",
  "display_name": "string (optional, defaults to name)",
  "description": "string (required, 10-500 chars)",
  "category": "string (required, enum: ['classic', 'modern', 'minimal', 'premium'])",
  "six_figure_alignment": "string (required, enum: ['foundation', 'professional', 'premium', 'master'])",
  "positioning_strategy": "string (required, enum: ['luxury_expert', 'master_craftsman', 'modern_professional'])",
  "value_proposition": "string (required, 10-200 chars)",
  "pricing_strategy": "string (required, enum: ['value_based', 'package_based', 'premium_exclusive'])",
  "target_revenue_impact": "number (required, min: 1.1, max: 3.0)",
  "color_scheme": {
    "primary": "string (hex color)",
    "secondary": "string (hex color)",
    "accent": "string (hex color)",
    "text": "string (hex color)",
    "background": "string (hex color)"
  },
  "layout_config": {
    "header_style": "string (enum: ['classic', 'modern', 'elegant'])",
    "section_order": "array of strings",
    "spacing": "string (enum: ['compact', 'normal', 'generous'])"
  },
  "is_premium": "boolean (default: false)"
}
```

#### Request Example

```javascript
const templateData = {
  name: "six_figure_premium",
  display_name: "Six Figure Premium Template",
  description: "High-end template designed for premium positioning and maximum conversion",
  category: "premium",
  six_figure_alignment: "premium",
  positioning_strategy: "luxury_expert",
  value_proposition: "Exclusive, personalized grooming experience that commands premium pricing",
  pricing_strategy: "value_based",
  target_revenue_impact: 1.45,
  color_scheme: {
    primary: "#1A365D",
    secondary: "#2C5282", 
    accent: "#D69E2E",
    text: "#1A202C",
    background: "#F7FAFC"
  },
  layout_config: {
    header_style: "elegant",
    section_order: ["hero", "about", "services", "testimonials", "gallery", "contact"],
    spacing: "generous"
  },
  is_premium: true
}

const response = await fetch('/api/customization/templates', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(templateData)
})
```

#### Response Example

```json
{
  "message": "Template created successfully",
  "template": {
    "id": "template_01H8NEWEXAMPLE",
    "name": "six_figure_premium",
    "display_name": "Six Figure Premium Template", 
    "six_figure_alignment": "premium",
    "target_revenue_impact": 1.45,
    "validation_score": 95,
    "created_at": "2024-01-25T14:22:00Z"
  }
}
```

### PUT /api/customization/templates

Update an existing template.

#### Request Body Schema

```json
{
  "templateId": "string (required)",
  "updates": {
    "description": "string (optional)",
    "target_revenue_impact": "number (optional)",
    "color_scheme": "object (optional)",
    "layout_config": "object (optional)",
    "status": "string (optional, enum: ['active', 'archived', 'draft'])"
  }
}
```

### DELETE /api/customization/templates

Soft delete (archive) a template.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Template ID to archive |

#### Request Example

```javascript
const response = await fetch('/api/customization/templates?id=template_01H8EXAMPLE', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
})
```

## Profile Customization API

### GET /api/customization/{shopId}/settings

Retrieve customization settings for a shop or profile.

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `shopId` | string | Shop UUID or 'profile' for individual barber |

#### Request Example

```javascript
const response = await fetch('/api/customization/profile/settings', {
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
})
```

#### Response Example

```json
{
  "settings": {
    "full_name": "John Doe",
    "bio": "Master barber with 15 years of experience...",
    "phone": "(555) 123-4567",
    "years_experience": 15,
    "profile_image_url": "https://cdn.bookedbarber.com/profiles/john-doe.jpg",
    "specializations": ["Classic Cuts", "Fades", "Beard Trimming"],
    "services_offered": [
      {
        "name": "Signature Cut",
        "price": 45,
        "duration": 45
      }
    ],
    "social_links": {
      "instagram": "https://instagram.com/johndoebarber",
      "tiktok": "",
      "website": "https://johndoecuts.com"
    },
    "profile_theme": "professional",
    "custom_booking_url": "john-doe-cuts"
  },
  "metadata": {
    "last_updated": "2024-01-20T10:30:00Z",
    "six_figure_score": 85,
    "certification_level": "professional"
  }
}
```

### PUT /api/customization/{shopId}/settings

Update customization settings.

#### Request Body Schema

```json
{
  "full_name": "string (optional, 2-100 chars)",
  "bio": "string (optional, max 500 chars)",
  "phone": "string (optional, phone format)",
  "years_experience": "number (optional, 0-50)",
  "profile_image_url": "string (optional, URL format)",
  "specializations": "array of strings (optional, max 10)",
  "services_offered": "array of service objects (optional)",
  "social_links": {
    "instagram": "string (optional, URL)",
    "tiktok": "string (optional, URL)", 
    "website": "string (optional, URL)"
  },
  "profile_theme": "string (optional, enum: ['professional', 'modern', 'classic', 'bold'])",
  "custom_booking_url": "string (optional, slug format)"
}
```

## A/B Testing API

### POST /api/customization/ab-testing

Create a new A/B test experiment.

#### Request Body Schema

```json
{
  "name": "string (required, 3-100 chars)",
  "description": "string (required, 10-500 chars)",
  "hypothesis": "string (required, 10-300 chars)",
  "variants": [
    {
      "name": "string (required)",
      "description": "string (required)",
      "allocation_percentage": "number (required, 1-100)",
      "config": "object (required, variant configuration)"
    }
  ],
  "success_metrics": "array of strings (required)",
  "target_sample_size": "number (required, min: 100)",
  "confidence_level": "number (optional, default: 0.95)",
  "six_figure_alignment": "string (required)"
}
```

#### Request Example

```javascript
const experimentData = {
  name: "hero_cta_optimization",
  description: "Testing different call-to-action approaches in hero section",
  hypothesis: "Professional imagery with premium CTA will increase booking rates by 20%",
  variants: [
    {
      name: "control",
      description: "Current hero design with standard CTA",
      allocation_percentage: 50,
      config: {
        hero_image: "/images/hero-current.jpg",
        cta_text: "Book Appointment",
        cta_style: "standard"
      }
    },
    {
      name: "premium_cta",
      description: "Professional imagery with premium CTA",
      allocation_percentage: 50,
      config: {
        hero_image: "/images/hero-professional.jpg", 
        cta_text: "Reserve Your Experience",
        cta_style: "premium"
      }
    }
  ],
  success_metrics: ["booking_rate", "session_duration", "contact_form_submissions"],
  target_sample_size: 1000,
  confidence_level: 0.95,
  six_figure_alignment: "premium"
}

const response = await fetch('/api/customization/ab-testing', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(experimentData)
})
```

### GET /api/customization/ab-testing/results/{experimentId}

Retrieve A/B test results.

#### Response Example

```json
{
  "experiment": {
    "id": "exp_01H8EXAMPLE",
    "name": "hero_cta_optimization",
    "status": "running",
    "start_date": "2024-01-15T00:00:00Z",
    "participants": 756
  },
  "results": {
    "control": {
      "participants": 378,
      "booking_rate": 0.034,
      "session_duration": 145.2,
      "contact_form_submissions": 12
    },
    "premium_cta": {
      "participants": 378,
      "booking_rate": 0.052,
      "session_duration": 189.7,
      "contact_form_submissions": 23
    }
  },
  "statistical_analysis": {
    "booking_rate": {
      "improvement": 0.053,
      "confidence": 0.92,
      "p_value": 0.08,
      "significant": false
    }
  },
  "recommendations": [
    "Continue test to reach statistical significance",
    "Consider extending test duration to capture weekend traffic"
  ]
}
```

## Analytics API

### GET /api/customization/analytics

Retrieve customization performance analytics.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `date_range` | string | `last_30_days` | Date range for analysis |
| `metrics` | array | all | Specific metrics to include |
| `shop_id` | string | - | Filter by specific shop |
| `group_by` | string | - | Grouping dimension |
| `template_id` | string | - | Filter by template |

#### Request Example

```javascript
const params = new URLSearchParams({
  date_range: 'last_30_days',
  'metrics[]': ['page_views', 'conversion_rate', 'bounce_rate'],
  group_by: 'template'
})

const response = await fetch(`/api/customization/analytics?${params}`, {
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
})
```

#### Response Example

```json
{
  "summary": {
    "total_page_views": 15420,
    "unique_visitors": 11234,
    "avg_conversion_rate": 0.034,
    "avg_bounce_rate": 0.28,
    "total_bookings": 524,
    "revenue_attribution": 18750.50
  },
  "by_template": {
    "premium": {
      "page_views": 8450,
      "unique_visitors": 6123,
      "conversion_rate": 0.041,
      "bounce_rate": 0.22,
      "bookings": 346,
      "revenue_impact": 1.32,
      "six_figure_score": 92
    },
    "modern": {
      "page_views": 4820,
      "unique_visitors": 3567,
      "conversion_rate": 0.029,
      "bounce_rate": 0.31,
      "bookings": 140,
      "revenue_impact": 1.18,
      "six_figure_score": 78
    }
  },
  "time_series": {
    "daily_views": [
      { "date": "2024-01-01", "views": 502, "conversions": 17 },
      { "date": "2024-01-02", "views": 485, "conversions": 19 }
    ]
  },
  "insights": [
    "Premium templates show 41% higher conversion rates",
    "Mobile traffic accounts for 67% of total visits",
    "Average session duration increased 23% with new designs"
  ],
  "recommendations": [
    {
      "type": "template_optimization",
      "priority": "high",
      "title": "Upgrade to Premium Templates",
      "description": "Consider upgrading more locations to premium templates",
      "expected_impact": "25-35% conversion increase",
      "six_figure_alignment": true
    }
  ]
}
```

## Bulk Operations API

### POST /api/customization/bulk-operations

Execute bulk operations across multiple locations.

#### Request Body Schema

```json
{
  "operation_type": "string (required, enum: ['apply_template', 'update_settings', 'sync_content'])",
  "template_id": "string (required for apply_template)",
  "target_locations": "array of strings (required)",
  "settings": "object (required for update_settings)",
  "options": {
    "preserve_custom_content": "boolean (default: true)",
    "update_colors_only": "boolean (default: false)",
    "notify_owners": "boolean (default: true)",
    "staged_rollout": "boolean (default: false)"
  },
  "rollback_plan": {
    "create_backup": "boolean (default: true)",
    "rollback_window_hours": "number (default: 24)"
  }
}
```

#### Request Example

```javascript
const bulkOperation = {
  operation_type: "apply_template",
  template_id: "template_01H8PREMIUM",
  target_locations: ["shop_01H8AAA", "shop_01H8BBB", "shop_01H8CCC"],
  options: {
    preserve_custom_content: true,
    update_colors_only: false,
    notify_owners: true,
    staged_rollout: true
  },
  rollback_plan: {
    create_backup: true,
    rollback_window_hours: 48
  }
}

const response = await fetch('/api/customization/bulk-operations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(bulkOperation)
})
```

#### Response Example

```json
{
  "operation_id": "op_01H8BULKEXAMPLE",
  "status": "in_progress",
  "total_locations": 3,
  "completed": 0,
  "failed": 0,
  "estimated_completion": "2024-01-25T15:30:00Z",
  "progress_url": "/api/customization/bulk-operations/op_01H8BULKEXAMPLE/progress"
}
```

### GET /api/customization/bulk-operations/{operationId}/progress

Monitor bulk operation progress.

#### Response Example

```json
{
  "operation_id": "op_01H8BULKEXAMPLE",
  "status": "in_progress",
  "progress": {
    "total": 3,
    "completed": 2,
    "failed": 0,
    "percentage": 67
  },
  "results": [
    {
      "location_id": "shop_01H8AAA",
      "status": "completed",
      "completed_at": "2024-01-25T15:15:00Z"
    },
    {
      "location_id": "shop_01H8BBB", 
      "status": "completed",
      "completed_at": "2024-01-25T15:18:00Z"
    },
    {
      "location_id": "shop_01H8CCC",
      "status": "in_progress",
      "started_at": "2024-01-25T15:20:00Z"
    }
  ]
}
```

## File Upload API

### POST /api/customization/upload

Upload images and media files with optimization.

#### Request Format

Multipart form data with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | The image file to upload |
| `type` | string | Yes | Upload type: 'profile', 'portfolio', 'logo', 'gallery' |
| `shop_id` | string | No | Associated shop ID (required for shop uploads) |
| `optimize` | boolean | No | Enable automatic optimization (default: true) |
| `generate_thumbnails` | boolean | No | Generate thumbnail versions (default: true) |

#### Request Example

```javascript
const formData = new FormData()
formData.append('file', imageFile)
formData.append('type', 'portfolio')
formData.append('shop_id', shopId)
formData.append('optimize', 'true')
formData.append('generate_thumbnails', 'true')

const response = await fetch('/api/customization/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`
    // Don't set Content-Type for FormData - browser will set it with boundary
  },
  body: formData
})
```

#### Response Example

```json
{
  "success": true,
  "file_url": "https://cdn.bookedbarber.com/uploads/portfolio/optimized-uuid-image.jpg",
  "thumbnail_url": "https://cdn.bookedbarber.com/uploads/portfolio/thumb-uuid-image.jpg",
  "metadata": {
    "file_id": "file_01H8EXAMPLE",
    "original_filename": "portfolio-shot.jpg",
    "original_size": 2480000,
    "optimized_size": 890000,
    "compression_ratio": 0.64,
    "dimensions": {
      "width": 1920,
      "height": 1080
    },
    "thumbnails": [
      {
        "size": "small",
        "dimensions": { "width": 300, "height": 169 },
        "url": "https://cdn.bookedbarber.com/uploads/portfolio/small-uuid-image.jpg"
      },
      {
        "size": "medium", 
        "dimensions": { "width": 800, "height": 450 },
        "url": "https://cdn.bookedbarber.com/uploads/portfolio/med-uuid-image.jpg"
      }
    ],
    "alt_text": "Portfolio image",
    "upload_timestamp": "2024-01-25T15:30:00Z"
  }
}
```

## WebSocket Events API

### Real-time Updates

The customize page supports real-time updates via WebSocket connections.

#### Connection

```javascript
const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/customization/${shopId}`
const socket = new WebSocket(wsUrl)

socket.onopen = () => {
  // Send authentication
  socket.send(JSON.stringify({
    type: 'authenticate',
    token: authToken
  }))
}
```

#### Event Types

| Event Type | Description |
|------------|-------------|
| `settings_updated` | Customization settings changed |
| `template_applied` | New template applied |
| `bulk_operation_progress` | Bulk operation status update |
| `analytics_update` | New analytics data available |

#### Event Example

```json
{
  "type": "settings_updated",
  "shop_id": "shop_01H8EXAMPLE",
  "user_id": "user_01H8EDITOR",
  "changes": {
    "profile_image_url": "https://cdn.bookedbarber.com/new-image.jpg",
    "bio": "Updated bio content..."
  },
  "timestamp": "2024-01-25T15:30:00Z"
}
```

## SDK Usage Examples

### JavaScript/TypeScript SDK

```javascript
import { CustomizationAPI } from '@/lib/api/customization-sdk'

// Initialize with authentication
const api = new CustomizationAPI({
  authToken: 'your_jwt_token',
  baseURL: 'https://api.bookedbarber.com/api/v1'
})

// Get templates
const templates = await api.templates.list({
  category: 'premium',
  six_figure_alignment: 'professional'
})

// Update profile settings
const updatedProfile = await api.profile.update({
  full_name: 'John Doe',
  bio: 'Master barber specializing in premium cuts...'
})

// Create A/B test
const experiment = await api.abTesting.create({
  name: 'booking_cta_test',
  variants: [/* variant configs */],
  success_metrics: ['booking_rate']
})
```

### Python SDK

```python
from bookedbarber import CustomizationAPI

# Initialize client
api = CustomizationAPI(
    auth_token='your_jwt_token',
    base_url='https://api.bookedbarber.com/api/v1'
)

# Get analytics
analytics = api.analytics.get(
    date_range='last_30_days',
    metrics=['conversion_rate', 'revenue_impact']
)

# Bulk operations
operation = api.bulk_operations.apply_template(
    template_id='template_01H8PREMIUM',
    location_ids=['shop1', 'shop2', 'shop3'],
    preserve_custom_content=True
)
```

## Testing the API

### Using curl

```bash
# Get templates
curl -X GET "https://api.bookedbarber.com/api/v1/customization/templates" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"

# Upload image
curl -X POST "https://api.bookedbarber.com/api/v1/customization/upload" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@profile-image.jpg" \
  -F "type=profile" \
  -F "optimize=true"
```

### Postman Collection

A complete Postman collection is available at:
`/Users/bossio/6FB AI Agent System/docs/api/Customize_API.postman_collection.json`

## API Versioning

The API uses semantic versioning:
- **Current Version**: v1
- **Deprecation Policy**: 6 months notice for breaking changes
- **Backward Compatibility**: Maintained for at least 1 year

## Support and Feedback

For API support:
- **Technical Issues**: dev-support@bookedbarber.com
- **Feature Requests**: api-feedback@bookedbarber.com  
- **Documentation**: docs@bookedbarber.com

---

*Last Updated: January 2025 | Version: 1.0.0*
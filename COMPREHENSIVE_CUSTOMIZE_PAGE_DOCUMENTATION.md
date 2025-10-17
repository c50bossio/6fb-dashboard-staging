# 6FB AI Agent System - Comprehensive Customize Page Documentation

## Table of Contents

1. [Overview](#overview)
2. [User Documentation](#user-documentation)
3. [API Documentation](#api-documentation) 
4. [Developer Documentation](#developer-documentation)
5. [Advanced Features](#advanced-features)
6. [Operations & Maintenance](#operations--maintenance)
7. [Six Figure Barber Methodology Integration](#six-figure-barber-methodology-integration)
8. [Troubleshooting & Support](#troubleshooting--support)

---

## Overview

The 6FB AI Agent System's customize page is a comprehensive platform for creating professional online presences that align with the Six Figure Barber methodology. This documentation covers all aspects of the extensively enhanced customization system, from basic user operations to advanced enterprise features.

### System Architecture

The customize page consists of multiple specialized components:

- **Barber Profile Customization**: Individual barber booking profiles and portfolios
- **Barbershop Website Customization**: Complete shop branding and online presence
- **Enterprise Website Management**: Multi-location franchise management tools
- **Template System**: Pre-built designs aligned with Six Figure Barber principles
- **A/B Testing Framework**: Data-driven optimization tools
- **Analytics Dashboard**: Performance tracking and business insights
- **External Integrations**: Canva, Google My Business, and social platforms

### Key Features Overview

- **Real-time Previews**: Live updates as you customize
- **Mobile Responsive Design**: Optimized for all devices
- **Performance Optimized**: React.memo, custom hooks, debounced saves
- **Comprehensive Testing**: 319 tests across 6 categories
- **Enterprise Features**: Bulk operations, collaboration tools, advanced analytics
- **Six Figure Methodology**: Built-in business growth optimization

---

## User Documentation

### Getting Started

#### Prerequisites
- Active 6FB AI Agent System account
- Appropriate role permissions (BARBER, SHOP_OWNER, or ENTERPRISE_OWNER)
- Modern web browser (Chrome, Firefox, Safari, Edge)

#### Accessing the Customize Page
1. Log in to your 6FB AI Agent System dashboard
2. Navigate to the "Customize" section from the main menu
3. Your available customization sections will be displayed based on your role

### Role-Based Access

#### BARBER Role
- Access to **Barber Profile Customization** only
- Features include:
  - Personal profile setup
  - Portfolio image management
  - Service listings and pricing
  - Availability settings
  - Social media links

#### SHOP_OWNER Role  
- Access to **Barber Profile** and **Barbershop Website Customization**
- Additional features:
  - Complete shop branding
  - Website design and content
  - Multiple barber management
  - Business hours configuration
  - Customer testimonials

#### ENTERPRISE_OWNER Role
- Full access to all customization sections
- Enterprise-specific features:
  - Multi-location management
  - Bulk operations across locations
  - Advanced analytics and reporting
  - Template sharing between locations
  - Collaboration tools

### Customization Sections Guide

#### 1. Barber Profile Customization

##### Profile Information Tab
- **Full Name**: Your professional name displayed to clients
- **Years of Experience**: Builds credibility and trust
- **Professional Bio**: 2-3 sentences highlighting your expertise
- **Phone Number**: Direct contact for clients
- **Instagram Handle**: Social proof and portfolio showcase

**Best Practices**:
- Keep bio concise but compelling
- Highlight unique specializations
- Use professional language aligned with Six Figure positioning

##### Photos Tab
- **Profile Photo**: Professional headshot (square format recommended)
- **Portfolio Gallery**: Showcase your best work (landscape format)
- **Image Requirements**:
  - Profile: Max 2MB, square aspect ratio
  - Portfolio: Max 5MB each, landscape preferred
  - Professional quality images only

**Photo Guidelines**:
- Use high-resolution, well-lit images
- Showcase variety in your work
- Include before/after comparisons when possible
- Maintain consistent style across portfolio

##### Services Tab
- **Specializations**: Select from 16+ predefined categories
- **Service Pricing**: Choose display format (range, starting from, contact)
- **Service List**: Add specific services with pricing and duration

**Six Figure Barber Alignment**:
- Focus on premium specializations
- Price services to reflect quality and expertise
- Emphasize value over cost in descriptions

##### Availability Tab
- **Business Hours**: Set your working schedule
- **Booking Preferences**: Configure appointment settings
- **Integration**: Links to full calendar management

**Availability Best Practices**:
- Maintain consistent hours for client expectations
- Use booking buffers to prevent overbooking
- Set realistic daily appointment limits

##### Branding Tab
- **Profile Theme**: Choose from 4 professional themes
  - Professional: Classic blue theme
  - Modern: Sleek black and cyan
  - Classic: Warm brown and gold
  - Bold: Strong red accents
- **Social Links**: Instagram, TikTok, personal website
- **Custom Booking URL**: Memorable, branded link (bookedbarber.com/your-name)

#### 2. Barbershop Website Customization

##### Website Design
- **Logo Upload**: Brand identity and recognition
- **Color Scheme**: Primary, secondary, accent, text, background colors
- **Typography**: Heading and body font selection
- **Theme Selection**: Choose from pre-built templates

##### Content Management
- **Hero Section**: Main heading, subtitle, call-to-action
- **About Section**: Shop story and values
- **Services Section**: Detailed service offerings
- **Gallery Management**: Shop photos and work samples
- **Team Profiles**: Staff member showcases

##### Business Information
- **Contact Details**: Address, phone, email, hours
- **SEO Settings**: Title, description, keywords
- **Social Media**: All platform integration
- **Custom Domain**: Professional web presence

#### 3. Enterprise Multi-Location Management

##### Location Overview
- **Dashboard**: All locations at a glance
- **Performance Metrics**: Revenue, bookings, client satisfaction
- **Brand Consistency**: Standardized templates and guidelines

##### Bulk Operations
- **Template Deployment**: Push designs to multiple locations
- **Content Synchronization**: Maintain brand messaging
- **Staff Management**: Centralized team coordination

### Mobile Customization Workflow

The customize page is fully optimized for mobile devices:

#### Mobile-Specific Features
- **Touch-Optimized Interface**: Large tap targets, swipe gestures
- **Responsive Design**: Adapts to screen sizes 375px and up
- **Mobile Preview Mode**: See exactly how customers view your profile
- **Image Optimization**: Automatic compression for fast loading

#### Mobile Best Practices
- **Keep text concise**: Mobile screens show less content
- **Use high-contrast colors**: Ensure readability in all conditions
- **Test on actual devices**: Emulators don't capture all interactions
- **Optimize images**: Compress for fast mobile loading

### Troubleshooting Common Issues

#### Issue: Images Not Uploading
**Symptoms**: Upload button unresponsive or error messages
**Solutions**:
1. Check file size (Profile: 2MB max, Portfolio: 5MB max)
2. Verify file format (JPEG, PNG, WebP supported)
3. Ensure stable internet connection
4. Try clearing browser cache and cookies

#### Issue: Changes Not Saving
**Symptoms**: Auto-save indicator stuck or manual save fails
**Solutions**:
1. Check internet connection stability
2. Refresh page and re-enter changes
3. Try different browser or incognito mode
4. Contact support if issue persists

#### Issue: Preview Not Updating
**Symptoms**: Live preview shows old information
**Solutions**:
1. Wait for auto-save to complete (5-second delay)
2. Manually trigger save using "Save Changes" button
3. Refresh browser tab
4. Check for JavaScript errors in browser console

---

## API Documentation

### Authentication

All API endpoints require authentication using JWT tokens passed in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

#### Authentication Service Methods

```javascript
// Validate authentication token
const authResult = await AuthenticationService.validateToken(authToken)

// Get user role for permission checking  
const userRole = await AuthenticationService.getUserRole(userId)

// Check specific permissions
const hasPermission = AuthenticationService.hasPermission(userRole, 'editor')
```

### Base API Endpoints

**Base URL**: `/api/customization/`

### Template Management API

#### GET /api/customization/templates

Retrieve templates with filtering and pagination.

**Query Parameters**:
- `category` (string): Filter by template category
- `six_figure_alignment` (string): Filter by methodology alignment
- `pricing_tier` (string): Filter by pricing tier
- `status` (string): Filter by template status
- `sort_by` (string, default: 'created_at'): Sort field
- `sort_order` (string, default: 'desc'): Sort direction
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 20): Items per page

**Example Request**:
```javascript
const response = await fetch('/api/customization/templates?category=modern&six_figure_alignment=premium&page=1&limit=10', {
  headers: {
    'Authorization': 'Bearer ' + authToken,
    'Content-Type': 'application/json'
  }
})

const data = await response.json()
```

**Example Response**:
```json
{
  "templates": [
    {
      "id": "uuid-here",
      "name": "Premium Barbershop",
      "category": "modern",
      "six_figure_alignment": "premium",
      "positioning_strategy": "luxury",
      "value_proposition": "Premium grooming experience",
      "pricing_strategy": "value-based",
      "target_revenue_impact": 1.25,
      "preview_image_url": "/templates/premium-preview.jpg",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  },
  "filters": {
    "category": "modern",
    "six_figure_alignment": "premium"
  }
}
```

#### POST /api/customization/templates

Create a new template with Six Figure Barber validation.

**Required Fields**:
- `name` (string): Template name
- `description` (string): Template description  
- `six_figure_alignment` (string): Methodology alignment level
- `positioning_strategy` (string): Market positioning approach
- `value_proposition` (string): Unique value offered
- `pricing_strategy` (string): Pricing approach
- `target_revenue_impact` (number, min: 1.1): Expected revenue improvement

**Example Request**:
```javascript
const templateData = {
  name: "Six Figure Premium Template",
  description: "High-end template for premium positioning",
  six_figure_alignment: "premium",
  positioning_strategy: "luxury_expert",
  value_proposition: "Exclusive, personalized grooming experience",
  pricing_strategy: "value_based_premium",
  target_revenue_impact: 1.35,
  color_scheme: {
    primary: "#1A365D",
    secondary: "#2C5282", 
    accent: "#D69E2E"
  },
  layout_config: {
    header_style: "elegant",
    section_order: ["hero", "services", "testimonials", "contact"]
  }
}

const response = await fetch('/api/customization/templates', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + authToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(templateData)
})
```

**Example Response**:
```json
{
  "message": "Template created successfully",
  "template": {
    "id": "new-uuid-here",
    "name": "Six Figure Premium Template",
    "six_figure_alignment": "premium",
    "target_revenue_impact": 1.35,
    "created_at": "2024-01-15T14:22:00Z"
  }
}
```

#### PUT /api/customization/templates

Update an existing template.

**Example Request**:
```javascript
const updateData = {
  templateId: "template-uuid-here",
  description: "Updated description with new features",
  target_revenue_impact: 1.4,
  layout_config: {
    header_style: "modern_elegant",
    section_order: ["hero", "about", "services", "testimonials", "gallery", "contact"]
  }
}

const response = await fetch('/api/customization/templates', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + authToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(updateData)
})
```

### A/B Testing API

#### POST /api/customization/ab-testing

Create a new A/B test experiment.

**Example Request**:
```javascript
const experimentData = {
  name: "Homepage Hero Test",
  description: "Testing different hero section approaches",
  hypothesis: "Professional imagery will increase booking rates",
  variants: [
    {
      name: "Control",
      description: "Current hero design",
      allocation_percentage: 50,
      config: {
        hero_image: "/images/hero-current.jpg",
        title: "Premium Barbering Services"
      }
    },
    {
      name: "Professional Imagery",
      description: "High-end professional photos",
      allocation_percentage: 50,
      config: {
        hero_image: "/images/hero-professional.jpg", 
        title: "Elite Grooming Experience"
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
    'Authorization': 'Bearer ' + authToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(experimentData)
})
```

### Analytics API

#### GET /api/customization/analytics

Retrieve customization performance analytics.

**Query Parameters**:
- `date_range` (string): Date range for analysis
- `metrics` (array): Specific metrics to include
- `shop_id` (string): Filter by specific shop
- `group_by` (string): Grouping dimension

**Example Request**:
```javascript
const response = await fetch('/api/customization/analytics?date_range=last_30_days&metrics=page_views,conversion_rate,bounce_rate&group_by=template', {
  headers: {
    'Authorization': 'Bearer ' + authToken,
    'Content-Type': 'application/json'
  }
})
```

**Example Response**:
```json
{
  "data": {
    "summary": {
      "total_page_views": 15420,
      "avg_conversion_rate": 0.034,
      "avg_bounce_rate": 0.28,
      "total_bookings": 524
    },
    "by_template": {
      "premium": {
        "page_views": 8450,
        "conversion_rate": 0.041,
        "bounce_rate": 0.22,
        "revenue_impact": 1.32
      },
      "modern": {
        "page_views": 4820,
        "conversion_rate": 0.029,
        "bounce_rate": 0.31,
        "revenue_impact": 1.18
      }
    }
  },
  "insights": [
    "Premium templates show 41% higher conversion rates",
    "Mobile traffic accounts for 67% of total visits",
    "Average session duration increased 23% with new designs"
  ],
  "recommendations": [
    "Consider upgrading more locations to premium templates",
    "Focus mobile optimization efforts on modern templates",
    "Test additional premium color schemes"
  ]
}
```

### Bulk Operations API

#### POST /api/customization/bulk-operations

Execute bulk operations across multiple locations.

**Example Request**:
```javascript
const bulkOperation = {
  operation_type: "apply_template",
  template_id: "template-uuid-here",
  target_locations: ["shop1-uuid", "shop2-uuid", "shop3-uuid"],
  options: {
    preserve_custom_content: true,
    update_colors_only: false,
    notify_owners: true
  },
  rollback_plan: {
    create_backup: true,
    rollback_window_hours: 24
  }
}

const response = await fetch('/api/customization/bulk-operations', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + authToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(bulkOperation)
})
```

### File Upload API

#### POST /api/customization/upload

Upload images and media files with optimization.

**Form Data Structure**:
- `file`: The image file
- `type`: Upload type ('profile', 'portfolio', 'logo', 'gallery')
- `shop_id`: Associated shop ID
- `optimize`: Boolean for automatic optimization

**Example Request**:
```javascript
const formData = new FormData()
formData.append('file', imageFile)
formData.append('type', 'portfolio')
formData.append('shop_id', shopId)
formData.append('optimize', 'true')

const response = await fetch('/api/customization/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + authToken
  },
  body: formData
})
```

**Example Response**:
```json
{
  "success": true,
  "file_url": "https://cdn.bookedbarber.com/uploads/portfolio/optimized-image-uuid.jpg",
  "thumbnail_url": "https://cdn.bookedbarber.com/uploads/portfolio/thumb-image-uuid.jpg",
  "metadata": {
    "original_size": 2480000,
    "optimized_size": 890000,
    "compression_ratio": 0.64,
    "dimensions": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

### Error Handling

All API endpoints return standardized error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "field": "field_name",
  "details": {
    "validation_errors": ["Field is required"],
    "suggestions": ["Try using a different value"]
  }
}
```

**Common Error Codes**:
- `AUTH_REQUIRED`: Authentication token missing
- `AUTH_INVALID`: Invalid or expired token
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions
- `VALIDATION_ERROR`: Request data validation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SIX_FIGURE_VALIDATION_FAILED`: Business methodology requirements not met

### Rate Limiting

API endpoints are rate limited per user:
- **Standard endpoints**: 100 requests per minute
- **Upload endpoints**: 50 requests per minute
- **Bulk operations**: 10 requests per minute

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Developer Documentation

### Architecture Overview

The customize page follows a modular, performance-optimized architecture designed for scalability and maintainability.

#### Core Components Architecture

```
app/(protected)/customize/
├── page.js                     # Main customize page container
├── page-optimized.js          # Performance-optimized version
└── components/customization/
    ├── BarberProfileCustomization.js
    ├── BarbershopWebsiteCustomization.js
    ├── EnterpriseWebsiteCustomization.js
    ├── TemplateGallery.jsx
    ├── ABTestingDashboard.jsx
    ├── AdvancedAnalyticsDashboard.jsx
    └── ExternalIntegrations.jsx
```

#### Custom Hooks Architecture

```
hooks/
├── useCustomizationForm.js     # Form state management with auto-save
├── useImageUpload.js          # Image handling and optimization  
├── useDebounce.js            # Performance optimization
└── useFeatureFlags.js        # A/B testing and feature control
```

### Component Development Guide

#### Creating New Customization Components

Follow these patterns when creating new customization components:

```javascript
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { useCustomizationForm } from '@/hooks/useCustomizationForm'

function CustomizationComponent({ onUnsavedChanges }) {
  const { user } = useAuth()
  
  // Use the customization form hook for state management
  const {
    settings,
    updateSetting,
    save,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    errors
  } = useCustomizationForm(initialSettings, {
    tableName: 'barbershops',
    autoSaveDelay: 5000,
    onUnsavedChanges
  })

  // Component-specific logic here
  
  return (
    <div className="space-y-6">
      {/* Component JSX */}
    </div>
  )
}

export default React.memo(CustomizationComponent)
```

#### Performance Optimization Patterns

1. **React.memo Usage**:
```javascript
export default React.memo(ComponentName, (prevProps, nextProps) => {
  // Custom comparison logic for optimization
  return prevProps.data === nextProps.data
})
```

2. **useCallback for Event Handlers**:
```javascript
const handleChange = useCallback((key, value) => {
  updateSetting(key, value)
}, [updateSetting])
```

3. **Debounced Operations**:
```javascript
const debouncedSave = useDebounce(save, 1000)
```

### Custom Hooks Development

#### useCustomizationForm Hook

This hook provides comprehensive form state management with auto-save, undo/redo, and validation:

```javascript
const {
  // State
  settings,           // Current form values
  originalSettings,   // Last saved values
  isLoading,         // Initial load state
  isSaving,          // Manual save state
  isAutoSaving,      // Auto-save state
  errors,            // Validation errors
  touched,           // Field interaction tracking
  
  // Computed
  hasUnsavedChanges, // Dirty state check
  canUndo,           // Undo availability
  canRedo,           // Redo availability
  
  // Actions
  updateSetting,     // Update single field
  updateSettings,    // Batch update
  save,             // Manual save
  load,             // Reload from database
  reset,            // Reset to original
  undo,             // Undo last change
  redo,             // Redo change
  validate          // Run validation
} = useCustomizationForm(initialSettings, options)
```

**Hook Options**:
```javascript
const options = {
  tableName: 'profiles',        // Database table
  autoSaveDelay: 5000,         // Auto-save delay (ms)
  enableUndo: true,            // Enable undo/redo
  maxUndoSteps: 10,           // Max undo history
  onSave: (data) => {},       // Save callback
  onError: (error) => {},     // Error callback
  onUnsavedChanges: (has) => {} // Unsaved changes callback
}
```

#### useImageUpload Hook

Handles image uploads with optimization and preview:

```javascript
const {
  uploading,
  progress,
  uploadImage,
  previewUrl,
  error
} = useImageUpload({
  maxSize: 2 * 1024 * 1024,  // 2MB
  acceptedTypes: ['image/jpeg', 'image/png'],
  optimizeImages: true,
  generateThumbnails: true
})
```

#### useDebounce Hook

Optimizes performance by debouncing frequent operations:

```javascript
const debouncedValue = useDebounce(value, delay)
const debouncedCallback = useDebounce(callback, delay)
```

### Database Schema Integration

#### Key Tables

1. **barbershops** - Enhanced with customization fields:
```sql
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS brand_colors JSONB;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS theme_preset VARCHAR(50);
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS shop_slug VARCHAR(100) UNIQUE;
```

2. **website_sections** - Flexible content management:
```sql
CREATE TABLE website_sections (
  id UUID PRIMARY KEY,
  barbershop_id UUID REFERENCES barbershops(id),
  section_type VARCHAR(50), -- 'hero', 'services', 'about', etc.
  content JSONB NOT NULL,
  display_order INTEGER,
  is_enabled BOOLEAN DEFAULT TRUE
);
```

3. **barbershop_gallery** - Image management:
```sql
CREATE TABLE barbershop_gallery (
  id UUID PRIMARY KEY,
  barbershop_id UUID REFERENCES barbershops(id),
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category VARCHAR(50),
  display_order INTEGER
);
```

#### Database Helper Functions

```javascript
// Database connection helper
import { createClient } from '@/lib/supabase/client'

export async function updateBarbershopSettings(shopId, settings) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('barbershops')
    .update({
      ...settings,
      updated_at: new Date().toISOString()
    })
    .eq('id', shopId)
    .select()
  
  if (error) throw error
  return data
}

export async function createWebsiteSection(shopId, sectionData) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('website_sections')
    .insert({
      barbershop_id: shopId,
      ...sectionData
    })
    .select()
  
  if (error) throw error
  return data
}
```

### Testing Framework

The customize page includes comprehensive testing with 319 tests across 6 categories:

#### Test Categories

1. **Unit Tests** - Individual component testing
2. **Integration Tests** - Component interaction testing
3. **API Tests** - Backend endpoint validation
4. **Performance Tests** - Load and optimization testing
5. **Accessibility Tests** - WCAG compliance verification
6. **Security Tests** - Authentication and authorization

#### Writing Tests

Example test structure:

```javascript
describe('BarberProfileCustomization', () => {
  beforeEach(() => {
    // Setup test environment
    mockAuthProvider()
    mockSupabaseClient()
  })

  test('should save profile changes with auto-save', async () => {
    const { user } = renderWithAuth(<BarberProfileCustomization />)
    
    // Simulate user input
    await user.type(screen.getByLabelText('Full Name'), 'John Doe')
    
    // Wait for auto-save
    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ full_name: 'John Doe' })
      )
    }, { timeout: 6000 })
  })

  test('should validate Six Figure Barber requirements', async () => {
    const { user } = renderWithAuth(<BarberProfileCustomization />)
    
    // Test premium positioning validation
    await user.selectOptions(
      screen.getByLabelText('Pricing Strategy'),
      'discount'
    )
    
    expect(screen.getByText(/conflicts with Six Figure methodology/))
      .toBeInTheDocument()
  })
})
```

#### Performance Testing

Monitor component performance with React DevTools Profiler:

```javascript
import { Profiler } from 'react'

function ProfiledCustomization(props) {
  const onRender = (id, phase, actualDuration) => {
    if (actualDuration > 16) { // 60fps threshold
      console.warn(`Slow render in ${id}: ${actualDuration}ms`)
    }
  }

  return (
    <Profiler id="CustomizationComponent" onRender={onRender}>
      <CustomizationComponent {...props} />
    </Profiler>
  )
}
```

### Security Implementation

#### Authentication Patterns

```javascript
// Route protection
export default function ProtectedCustomizePage() {
  const { user, loading } = useAuth()
  
  if (loading) return <LoadingSpinner />
  if (!user) redirect('/login')
  
  return <CustomizePage />
}

// Permission checking
function checkCustomizationPermissions(userRole, section) {
  const permissions = {
    'barber': ['profile'],
    'shop_owner': ['profile', 'barbershop'],
    'enterprise_owner': ['profile', 'barbershop', 'enterprise']
  }
  
  return permissions[userRole]?.includes(section) || false
}
```

#### Data Validation

```javascript
import { z } from 'zod'

const BarberProfileSchema = z.object({
  full_name: z.string().min(2).max(100),
  bio: z.string().max(500),
  years_experience: z.number().min(0).max(50),
  specializations: z.array(z.string()).max(10),
  pricing_strategy: z.enum(['value_based', 'competitive', 'premium'])
    .refine(val => val !== 'discount', {
      message: 'Discount pricing conflicts with Six Figure methodology'
    })
})

// Usage in component
const validate = useCallback((data) => {
  try {
    BarberProfileSchema.parse(data)
    return { valid: true, errors: {} }
  } catch (error) {
    return { valid: false, errors: error.formErrors.fieldErrors }
  }
}, [])
```

### Deployment Considerations

#### Environment Configuration

Required environment variables:

```bash
# Authentication
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# File Storage
NEXT_PUBLIC_STORAGE_BUCKET=customization-assets
STORAGE_SECRET_KEY=your_storage_secret

# Image Optimization
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Analytics
ANALYTICS_API_ENDPOINT=your_analytics_endpoint
ANALYTICS_API_KEY=your_analytics_key

# Feature Flags
FEATURE_FLAGS_ENDPOINT=your_feature_flags_endpoint
```

#### Performance Monitoring

```javascript
// Performance monitoring setup
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

function sendToAnalytics(metric) {
  // Send performance metrics to your analytics service
  fetch('/api/analytics/web-vitals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metric)
  })
}

// Monitor Core Web Vitals
getCLS(sendToAnalytics)
getFID(sendToAnalytics)
getFCP(sendToAnalytics)
getLCP(sendToAnalytics)
getTTFB(sendToAnalytics)
```

---

## Advanced Features

### A/B Testing Framework

The customize page includes a sophisticated A/B testing system for data-driven optimization.

#### Creating A/B Tests

1. **Hypothesis Formation**
   - Define clear, measurable hypotheses
   - Align with Six Figure Barber methodology goals
   - Set specific success metrics

2. **Experiment Setup**
   - Use the A/B Testing Dashboard component
   - Configure traffic allocation (typically 50/50)
   - Set sample size requirements

3. **Implementation**
```javascript
import { useABTest } from '@/hooks/useABTest'

function CustomizationComponent() {
  const { variant, trackConversion } = useABTest('hero_design_test')
  
  const handleBookingClick = () => {
    trackConversion('booking_intent')
    // Handle booking logic
  }
  
  return (
    <div>
      {variant === 'control' ? (
        <OriginalHeroSection />
      ) : (
        <NewHeroSection />
      )}
      <button onClick={handleBookingClick}>
        Book Appointment
      </button>
    </div>
  )
}
```

4. **Results Analysis**
   - Statistical significance calculation
   - Business impact assessment
   - Six Figure methodology alignment validation

#### A/B Testing Best Practices

- **Test One Variable**: Focus on single changes for clear attribution
- **Sufficient Sample Size**: Ensure statistical significance
- **Business Context**: Consider seasonality and external factors  
- **Six Figure Alignment**: Prioritize tests that support premium positioning

### Template System

#### Template Architecture

Templates are structured with Six Figure Barber methodology integration:

```javascript
const templateStructure = {
  id: 'template-uuid',
  name: 'Premium Professional',
  category: 'premium',
  six_figure_alignment: 'premium',
  positioning_strategy: 'luxury_expert',
  value_proposition: 'Exclusive grooming experience',
  pricing_strategy: 'value_based_premium',
  target_revenue_impact: 1.35,
  
  design: {
    color_scheme: {
      primary: '#1A365D',
      secondary: '#2C5282',
      accent: '#D69E2E',
      text: '#1A202C',
      background: '#F7FAFC'
    },
    typography: {
      heading: 'Playfair Display',
      body: 'Inter'
    },
    layout_config: {
      header_style: 'elegant',
      section_order: ['hero', 'services', 'testimonials', 'contact'],
      spacing: 'generous',
      imagery_style: 'professional'
    }
  },
  
  content_guidelines: {
    tone: 'professional_confident',
    messaging_focus: 'expertise_results',
    cta_style: 'premium_subtle'
  }
}
```

#### Template Development

Creating new templates requires Six Figure validation:

```javascript
function validateSixFigureAlignment(template) {
  const requirements = {
    target_revenue_impact: { min: 1.1, message: 'Must target 10%+ revenue increase' },
    positioning_strategy: { 
      allowed: ['premium', 'luxury_expert', 'master_craftsman'],
      message: 'Must support premium positioning'
    },
    pricing_strategy: {
      forbidden: ['discount', 'low_cost'],
      message: 'Cannot encourage discount pricing'
    }
  }
  
  // Validation logic
  return validateAgainstRequirements(template, requirements)
}
```

### Enterprise Bulk Operations

Enterprise users can perform bulk operations across multiple locations:

#### Bulk Template Deployment

```javascript
async function deployTemplateToLocations(templateId, locationIds, options) {
  const bulkOperation = {
    operation_type: 'apply_template',
    template_id: templateId,
    target_locations: locationIds,
    options: {
      preserve_custom_content: options.preserveContent,
      update_colors_only: options.colorsOnly,
      notify_owners: options.notifyOwners,
      staged_rollout: options.stagedRollout
    },
    rollback_plan: {
      create_backup: true,
      rollback_window_hours: 24
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
  
  return response.json()
}
```

#### Bulk Analytics and Reporting

Enterprise dashboard provides aggregated insights:

- **Performance Across Locations**: Compare conversion rates, booking volumes
- **Template Effectiveness**: Identify highest-performing designs
- **Six Figure Progress**: Track methodology alignment across franchise
- **ROI Analysis**: Measure revenue impact of customization changes

### External Integrations

#### Canva Integration

Seamless design tool integration for non-designers:

```javascript
const CanvaIntegration = {
  async generateDesigns(brandGuidelines) {
    const canvaAPI = new CanvaAPI(process.env.CANVA_API_KEY)
    
    return await canvaAPI.createDesignSet({
      brand_kit: {
        colors: brandGuidelines.colors,
        fonts: brandGuidelines.fonts,
        logo: brandGuidelines.logo_url
      },
      templates: ['business_card', 'social_media', 'flyer'],
      six_figure_positioning: true
    })
  },
  
  async importFromCanva(designUrl) {
    // Import designs from Canva into 6FB system
    // Maintain Six Figure branding guidelines
  }
}
```

#### Google My Business Integration

Automated business profile management:

```javascript
const GMBIntegration = {
  async syncBusinessInfo(shopData) {
    // Sync barbershop information to Google My Business
    // Ensure consistent branding across platforms
  },
  
  async updateBusinessHours(scheduleData) {
    // Keep GMB hours in sync with booking system
  },
  
  async publishPosts(contentData) {
    // Automated posting with Six Figure messaging
  }
}
```

### Advanced Analytics Dashboard

#### Business Intelligence Features

1. **Revenue Impact Tracking**
   - Before/after customization analysis
   - Attribution to specific design changes
   - Six Figure methodology progress measurement

2. **Customer Journey Analytics**
   - Conversion funnel analysis
   - Drop-off point identification
   - Optimization recommendations

3. **Competitive Benchmarking**
   - Industry standard comparisons
   - Market positioning analysis
   - Pricing strategy effectiveness

#### Custom Metrics and KPIs

```javascript
const CustomMetrics = {
  sixFigureProgressScore: (shopData) => {
    // Calculate progress toward Six Figure goals
    const factors = [
      shopData.premium_service_percentage,
      shopData.client_retention_rate,
      shopData.average_ticket_value,
      shopData.brand_consistency_score
    ]
    
    return weightedAverage(factors, [0.3, 0.25, 0.25, 0.2])
  },
  
  brandConsistencyScore: (locations) => {
    // Measure brand consistency across locations
    return calculateConsistency(locations, brandingElements)
  },
  
  conversionOptimizationScore: (analyticsData) => {
    // Assess effectiveness of customization choices
    return analyzeConversionFunnel(analyticsData)
  }
}
```

### Workflow Collaboration

For enterprise and multi-location operations:

#### Approval Workflows

```javascript
const ApprovalWorkflow = {
  async submitForApproval(changes, approvers) {
    const workflow = {
      changes,
      approvers,
      status: 'pending_approval',
      created_at: new Date(),
      approval_deadline: addDays(new Date(), 3)
    }
    
    // Notify approvers
    await NotificationService.notifyApprovers(workflow)
    
    return workflow
  },
  
  async processApproval(workflowId, approverId, decision) {
    // Handle approval/rejection logic
    // Apply changes if approved
    // Notify stakeholders
  }
}
```

#### Content Collaboration

- **Draft Mode**: Save work-in-progress without publishing
- **Version History**: Track all changes with rollback capability
- **Comments System**: Collaborative feedback on designs
- **Brand Guidelines Enforcement**: Automatic compliance checking

---

## Operations & Maintenance

### Deployment Procedures

#### Pre-Deployment Checklist

1. **Environment Preparation**
   ```bash
   # Verify all environment variables
   ./scripts/verify-env.sh
   
   # Run comprehensive tests
   npm run test:customize
   npm run test:integration
   
   # Performance benchmarks
   npm run test:performance
   
   # Security audit
   npm run audit:security
   ```

2. **Database Migrations**
   ```bash
   # Apply schema updates
   npx supabase db push
   
   # Verify data integrity
   npm run verify:database
   
   # Create backup point
   ./scripts/backup-database.sh
   ```

3. **Asset Optimization**
   ```bash
   # Optimize images
   npm run optimize:images
   
   # Build production assets
   npm run build
   
   # Test asset loading
   npm run test:assets
   ```

#### Deployment Process

1. **Staging Deployment**
   ```bash
   # Deploy to staging
   npm run deploy:staging
   
   # Run smoke tests
   npm run test:smoke:staging
   
   # Performance validation
   npm run test:performance:staging
   ```

2. **Production Deployment**
   ```bash
   # Blue-green deployment
   npm run deploy:production:blue-green
   
   # Health check monitoring
   npm run monitor:health
   
   # Rollback plan ready
   npm run prepare:rollback
   ```

3. **Post-Deployment Verification**
   ```bash
   # Comprehensive functionality test
   npm run test:production:customize
   
   # Performance monitoring
   npm run monitor:performance
   
   # Error rate monitoring
   npm run monitor:errors
   ```

### Performance Monitoring

#### Key Performance Indicators

1. **Page Load Performance**
   - **Target**: < 3 seconds for complete page load
   - **Critical**: < 5 seconds for mobile users
   - **Monitoring**: Core Web Vitals, custom metrics

2. **API Response Times**
   - **Templates**: < 200ms average response
   - **File Uploads**: < 2 seconds for 5MB files
   - **Bulk Operations**: < 30 seconds for 100 locations

3. **Auto-Save Performance**
   - **Target**: < 1 second for form auto-saves
   - **Recovery**: < 5 seconds for connection restoration
   - **Reliability**: 99.9% auto-save success rate

#### Monitoring Setup

```javascript
// Performance monitoring configuration
const performanceConfig = {
  metrics: {
    pageLoadTime: { threshold: 3000, critical: 5000 },
    apiResponseTime: { threshold: 200, critical: 1000 },
    autoSaveLatency: { threshold: 1000, critical: 2000 },
    imageLoadTime: { threshold: 2000, critical: 5000 }
  },
  
  alerts: {
    channels: ['slack', 'email', 'pagerduty'],
    escalation: [
      { threshold: 'warning', delay: 300 },
      { threshold: 'critical', delay: 60 }
    ]
  },
  
  dashboards: {
    realtime: '/monitoring/customize/realtime',
    historical: '/monitoring/customize/trends',
    sla: '/monitoring/customize/sla'
  }
}
```

### Database Maintenance

#### Regular Maintenance Tasks

1. **Weekly Tasks**
   ```sql
   -- Analyze table statistics
   ANALYZE barbershops, website_sections, barbershop_gallery;
   
   -- Cleanup orphaned records
   DELETE FROM barbershop_gallery WHERE barbershop_id NOT IN (SELECT id FROM barbershops);
   
   -- Update search indexes
   REINDEX INDEX CONCURRENTLY idx_barbershops_search;
   ```

2. **Monthly Tasks**
   ```sql
   -- Vacuum and analyze all tables
   VACUUM ANALYZE barbershops;
   VACUUM ANALYZE website_sections;
   VACUUM ANALYZE barbershop_gallery;
   
   -- Check index usage
   SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch 
   FROM pg_stat_user_indexes;
   
   -- Archive old data
   CALL archive_old_customization_data('6 months');
   ```

3. **Quarterly Tasks**
   ```sql
   -- Full database maintenance
   VACUUM FULL;
   REINDEX DATABASE;
   
   -- Performance analysis
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   SELECT * FROM pg_stat_user_tables ORDER BY seq_tup_read DESC;
   ```

#### Backup and Recovery

```bash
#!/bin/bash
# Automated backup script

# Create timestamped backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="customize_backup_${TIMESTAMP}.sql"

# Full database backup
pg_dump $DATABASE_URL > "backups/${BACKUP_FILE}"

# Compress backup
gzip "backups/${BACKUP_FILE}"

# Upload to cloud storage
aws s3 cp "backups/${BACKUP_FILE}.gz" "s3://6fb-backups/database/"

# Cleanup old backups (keep 30 days)
find backups/ -name "customize_backup_*.sql.gz" -mtime +30 -delete

# Verify backup integrity
pg_restore --list "backups/${BACKUP_FILE}.gz" > /dev/null
if [ $? -eq 0 ]; then
    echo "Backup created successfully: ${BACKUP_FILE}.gz"
else
    echo "Backup verification failed!" >&2
    exit 1
fi
```

### Security Best Practices

#### Authentication Security

1. **JWT Token Management**
   ```javascript
   const TokenSecurity = {
     // Token rotation every 15 minutes
     TOKEN_LIFETIME: 15 * 60 * 1000,
     
     // Automatic refresh before expiry
     REFRESH_BUFFER: 2 * 60 * 1000,
     
     // Secure token storage
     storeToken: (token) => {
       // Use httpOnly cookies in production
       document.cookie = `auth_token=${token}; Secure; HttpOnly; SameSite=Strict`
     }
   }
   ```

2. **Permission Validation**
   ```javascript
   function validateCustomizationPermissions(user, action, resourceId) {
     const permissions = {
       'barber': ['read_own', 'write_own'],
       'shop_owner': ['read_shop', 'write_shop', 'manage_barbers'],
       'enterprise_owner': ['read_all', 'write_all', 'bulk_operations']
     }
     
     return permissions[user.role]?.includes(action) || false
   }
   ```

#### Data Protection

1. **Input Sanitization**
   ```javascript
   import DOMPurify from 'dompurify'
   
   function sanitizeUserInput(input, type = 'html') {
     switch (type) {
       case 'html':
         return DOMPurify.sanitize(input)
       case 'url':
         return validateURL(input) ? input : null
       case 'filename':
         return input.replace(/[^a-zA-Z0-9.-]/g, '_')
       default:
         return input.replace(/[<>\"'&]/g, '')
     }
   }
   ```

2. **File Upload Security**
   ```javascript
   const FileUploadSecurity = {
     allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
     maxFileSize: 5 * 1024 * 1024, // 5MB
     scanForMalware: true,
     generateSafeFilenames: true,
     
     async validateFile(file) {
       // Check file type
       if (!this.allowedTypes.includes(file.type)) {
         throw new Error('File type not allowed')
       }
       
       // Check file size
       if (file.size > this.maxFileSize) {
         throw new Error('File too large')
       }
       
       // Validate file headers
       const isValidImage = await this.validateImageHeaders(file)
       if (!isValidImage) {
         throw new Error('Invalid image file')
       }
       
       return true
     }
   }
   ```

### Compliance Requirements

#### GDPR Compliance

1. **Data Processing Documentation**
   ```javascript
   const GDPRCompliance = {
     async exportUserData(userId) {
       const userData = {
         profile: await getUserProfile(userId),
         customizations: await getCustomizationData(userId),
         images: await getUserImages(userId),
         analytics: await getAnalyticsData(userId)
       }
       
       return {
         data: userData,
         export_date: new Date().toISOString(),
         retention_period: '7 years for business records'
       }
     },
     
     async deleteUserData(userId) {
       // Anonymize rather than delete for business continuity
       await anonymizeUserData(userId)
       await logDeletionRequest(userId)
     }
   }
   ```

2. **Privacy Controls**
   - Cookie consent management
   - Data processing opt-out
   - Third-party integration controls
   - Analytics tracking preferences

#### Accessibility Compliance (WCAG 2.1 AA)

1. **Automated Testing**
   ```javascript
   import { axe, configureAxe } from 'jest-axe'
   
   describe('Customize Page Accessibility', () => {
     test('should not have accessibility violations', async () => {
       const { container } = render(<CustomizePage />)
       const results = await axe(container)
       expect(results).toHaveNoViolations()
     })
   })
   ```

2. **Manual Testing Checklist**
   - Keyboard navigation flow
   - Screen reader compatibility
   - Color contrast ratios (4.5:1 minimum)
   - Focus indicators
   - Alternative text for images
   - Form labels and error messages

### Incident Response

#### Alert Classification

1. **P0 - Critical** (Response: 15 minutes)
   - Complete customize page outage
   - Data corruption or loss
   - Security breach detection
   - Payment processing failures

2. **P1 - High** (Response: 1 hour)
   - Feature functionality broken
   - Performance degradation >50%
   - Authentication issues
   - File upload failures

3. **P2 - Medium** (Response: 4 hours)
   - Minor feature issues
   - Performance degradation <50%
   - Non-critical UI problems
   - Cosmetic display issues

#### Incident Response Procedures

```bash
#!/bin/bash
# Incident response automation

INCIDENT_TYPE=$1
SEVERITY=$2

case $SEVERITY in
  "P0"|"critical")
    # Immediate escalation
    ./scripts/notify-oncall.sh "CRITICAL: $INCIDENT_TYPE"
    ./scripts/enable-maintenance-mode.sh
    ./scripts/create-incident-channel.sh "$INCIDENT_TYPE"
    ;;
  "P1"|"high") 
    # Standard escalation
    ./scripts/notify-team.sh "HIGH: $INCIDENT_TYPE"
    ./scripts/start-monitoring.sh enhanced
    ;;
  *)
    # Normal handling
    ./scripts/log-incident.sh "$INCIDENT_TYPE" "$SEVERITY"
    ;;
esac
```

---

## Six Figure Barber Methodology Integration

### Core Methodology Principles

The customize page is built around the Six Figure Barber methodology, ensuring every feature supports premium positioning and business growth.

#### 1. Premium Positioning Strategy

**Implementation in Customization**:
- Templates designed for luxury market positioning
- Color schemes that convey professionalism and exclusivity
- Content guidelines that emphasize expertise over price competition
- Imagery standards that reflect premium service quality

**Validation Rules**:
```javascript
const SixFigureValidation = {
  validatePricingStrategy: (strategy) => {
    const forbiddenStrategies = ['discount', 'low_cost', 'price_matching']
    return !forbiddenStrategies.includes(strategy)
  },
  
  validateMessaging: (content) => {
    const discountKeywords = ['cheap', 'lowest price', 'discount', 'budget']
    return !discountKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    )
  },
  
  validateRevenueImpact: (template) => {
    return template.target_revenue_impact >= 1.1 // Minimum 10% increase
  }
}
```

#### 2. Client Relationship Focus

**Customization Features Supporting Relationships**:
- Personal bio sections for connection building
- Portfolio galleries showcasing craftsmanship
- Testimonial systems for social proof
- Contact methods that encourage direct communication

**Implementation Example**:
```javascript
const RelationshipFeatures = {
  bioGuidelines: {
    minLength: 100,
    maxLength: 500,
    requiredElements: ['experience', 'philosophy', 'specialties'],
    tone: 'professional_personal',
    focusAreas: ['expertise', 'client_care', 'results']
  },
  
  portfolioStandards: {
    minImages: 5,
    imageQuality: 'high_resolution',
    varietyRequired: ['before_after', 'style_range', 'detail_shots'],
    professionalStandards: true
  }
}
```

#### 3. Value-Based Service Delivery

**Customization Supports Value Communication**:
- Service descriptions emphasize outcomes over process
- Pricing displays focus on value rather than cost comparison
- Testimonials highlight transformation and experience
- Booking flows that qualify serious clients

#### 4. Business Growth Systems

**Growth-Focused Customization Options**:
- Analytics dashboards tracking Six Figure KPIs
- Conversion optimization tools for booking increases
- Client retention features and loyalty programs
- Referral system integration for organic growth

### Six Figure Assessment Framework

#### Automated Methodology Compliance

The system continuously evaluates customization choices against Six Figure principles:

```javascript
const SixFigureAssessment = {
  async assessBarberProfile(profileData) {
    const score = {
      premium_positioning: this.scorePremiumPositioning(profileData),
      relationship_focus: this.scoreRelationshipElements(profileData),
      value_communication: this.scoreValueCommunication(profileData),
      growth_optimization: this.scoreGrowthFeatures(profileData)
    }
    
    const overallScore = Object.values(score).reduce((a, b) => a + b) / 4
    
    return {
      score: overallScore,
      breakdown: score,
      recommendations: this.generateRecommendations(score),
      certification_level: this.determineCertificationLevel(overallScore)
    }
  },
  
  scorePremiumPositioning: (profile) => {
    let score = 0
    
    // Professional imagery quality
    if (profile.profile_image_url && profile.portfolio_images.length >= 5) {
      score += 25
    }
    
    // Premium specializations selected
    const premiumSpecs = ['Master Cuts', 'Straight Razor Shaves', 'Beard Sculpting']
    if (profile.specializations.some(spec => premiumSpecs.includes(spec))) {
      score += 25
    }
    
    // Value-based pricing display
    if (profile.pricing_display !== 'contact' && profile.pricing_display !== 'range') {
      score += 25
    }
    
    // Professional bio quality
    if (profile.bio.length >= 100 && !this.containsDiscountLanguage(profile.bio)) {
      score += 25
    }
    
    return score
  }
}
```

#### Six Figure Certification Levels

Based on customization assessment scores:

1. **Six Figure Foundation** (60-74 points)
   - Basic premium positioning elements
   - Professional presentation standards met
   - Growth-oriented setup beginning

2. **Six Figure Professional** (75-89 points)
   - Strong premium positioning
   - Excellent client relationship features
   - Solid growth systems in place

3. **Six Figure Master** (90-100 points)
   - Optimal methodology implementation
   - Premium positioning excellence
   - Advanced growth systems active

### Business Growth Tracking

#### Revenue Impact Metrics

The customize page tracks specific Six Figure methodology outcomes:

```javascript
const SixFigureMetrics = {
  trackRevenueImpact: async (shopId, timeframe = '30d') => {
    const beforeCustomization = await getRevenueData(shopId, 'before')
    const afterCustomization = await getRevenueData(shopId, 'after')
    
    return {
      revenue_increase_percentage: (afterCustomization - beforeCustomization) / beforeCustomization,
      average_ticket_increase: await calculateTicketIncrease(shopId, timeframe),
      client_retention_improvement: await calculateRetentionImprovement(shopId, timeframe),
      booking_conversion_rate: await calculateConversionImprovement(shopId, timeframe)
    }
  },
  
  trackClientQualityMetrics: async (shopId) => {
    return {
      premium_service_percentage: await getPremiumServiceRatio(shopId),
      repeat_client_percentage: await getRepeatClientRatio(shopId),
      referral_rate: await getReferralRate(shopId),
      client_satisfaction_score: await getClientSatisfactionScore(shopId)
    }
  }
}
```

#### Growth Milestone Recognition

```javascript
const MilestoneTracking = {
  checkGrowthMilestones: (metrics) => {
    const milestones = []
    
    if (metrics.revenue_increase_percentage >= 0.25) {
      milestones.push({
        type: 'revenue_growth',
        achievement: '25% Revenue Increase',
        badge: 'six_figure_growth',
        description: 'Achieved 25% revenue growth through premium positioning'
      })
    }
    
    if (metrics.client_retention_improvement >= 0.15) {
      milestones.push({
        type: 'retention_master',
        achievement: 'Client Retention Expert',
        badge: 'retention_master', 
        description: 'Improved client retention by 15% through relationship focus'
      })
    }
    
    return milestones
  }
}
```

### Methodology-Aligned Templates

#### Template Categories by Six Figure Focus

1. **Master Craftsman Templates**
   - Emphasize years of experience and expertise
   - Traditional barbering elements with modern execution
   - Portfolio-heavy designs showcasing skill progression
   - Premium pricing display with value justification

2. **Luxury Experience Templates** 
   - Focus on client experience and transformation
   - High-end visual design elements
   - Testimonial-prominent layouts
   - Exclusive service positioning

3. **Modern Professional Templates**
   - Clean, contemporary design reflecting modern barbering
   - Technology integration highlights (online booking, app integration)
   - Social proof through Instagram integration
   - Professional yet approachable positioning

#### Template Content Guidelines

Each template includes Six Figure methodology guidance:

```javascript
const TemplateGuidelines = {
  masterCraftsman: {
    bio_focus: 'Emphasize years of experience, training background, and mastery of traditional techniques',
    pricing_strategy: 'Value-based pricing with service packages',
    imagery_style: 'Classic, timeless photography with before/after focus',
    color_palette: 'Warm, traditional colors with gold accents',
    messaging_tone: 'Authoritative expert with approachable personality'
  },
  
  luxuryExperience: {
    bio_focus: 'Highlight exclusive services, premium products, and transformation results',
    pricing_strategy: 'Premium pricing with package options',
    imagery_style: 'High-end lifestyle photography, luxury environment shots',
    color_palette: 'Sophisticated neutrals with metallic accents',
    messaging_tone: 'Exclusive, refined, results-focused'
  }
}
```

### Success Coaching Integration

#### Automated Coaching Recommendations

Based on customization assessment and performance data:

```javascript
const SixFigureCoaching = {
  generateCoachingRecommendations: (assessmentData, performanceData) => {
    const recommendations = []
    
    if (assessmentData.premium_positioning < 75) {
      recommendations.push({
        category: 'positioning',
        priority: 'high',
        title: 'Strengthen Premium Positioning',
        action: 'Update bio to emphasize expertise and results',
        expected_impact: '15-25% booking rate increase',
        six_figure_principle: 'Premium positioning attracts quality clients'
      })
    }
    
    if (performanceData.conversion_rate < 0.05) {
      recommendations.push({
        category: 'conversion',
        priority: 'medium', 
        title: 'Optimize Booking Conversion',
        action: 'Add social proof testimonials and clear call-to-action',
        expected_impact: '20-35% conversion improvement',
        six_figure_principle: 'Social proof builds trust and urgency'
      })
    }
    
    return recommendations
  }
}
```

#### Progressive Coaching Paths

1. **Foundation Path**: Basic premium positioning setup
2. **Growth Path**: Conversion optimization and client relationship building  
3. **Mastery Path**: Advanced business systems and expansion strategies

Each path includes specific customization milestones and success metrics aligned with Six Figure methodology principles.

---

## Troubleshooting & Support

### Common Issues and Solutions

#### Image Upload Issues

**Problem**: Images failing to upload or displaying incorrectly

**Diagnostic Steps**:
1. Check file size and format requirements
2. Verify network connectivity and upload speed
3. Test with different browsers and devices
4. Check browser console for JavaScript errors

**Solutions**:
```javascript
// Image optimization before upload
const optimizeImage = async (file) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Maintain aspect ratio while limiting size
      const maxWidth = 1920
      const maxHeight = 1080
      
      let { width, height } = img
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }
      
      canvas.width = width
      canvas.height = height
      
      ctx.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob(resolve, 'image/jpeg', 0.8)
    }
    
    img.src = URL.createObjectURL(file)
  })
}
```

#### Auto-Save Not Working

**Problem**: Changes not being automatically saved

**Diagnostic Steps**:
1. Check browser developer tools for network errors
2. Verify authentication token validity
3. Test with manual save button
4. Check for form validation errors

**Solutions**:
```javascript
// Enhanced auto-save with retry logic
const useAutoSaveWithRetry = (data, options = {}) => {
  const { maxRetries = 3, retryDelay = 1000 } = options
  
  const autoSave = useCallback(async (attempt = 1) => {
    try {
      await saveToDatabase(data)
      setAutoSaveStatus('success')
    } catch (error) {
      if (attempt < maxRetries) {
        setTimeout(() => autoSave(attempt + 1), retryDelay * attempt)
      } else {
        setAutoSaveStatus('failed')
        showRetryDialog()
      }
    }
  }, [data, maxRetries, retryDelay])
  
  useEffect(() => {
    const timer = setTimeout(autoSave, 5000)
    return () => clearTimeout(timer)
  }, [autoSave])
}
```

#### Performance Issues

**Problem**: Page loading slowly or becoming unresponsive

**Diagnostic Steps**:
1. Check network tab in developer tools
2. Profile component render performance
3. Monitor memory usage and potential leaks
4. Test on different devices and connections

**Performance Optimization**:
```javascript
// Lazy loading for heavy components
const LazyTemplateGallery = lazy(() => 
  import('@/components/customization/TemplateGallery')
)

// Memoized expensive calculations
const expensiveCalculation = useMemo(() => {
  return computeComplexAnalytics(data)
}, [data])

// Virtualized lists for large datasets
const VirtualizedTemplateList = ({ templates }) => {
  return (
    <VirtualList
      height={600}
      itemCount={templates.length}
      itemSize={200}
      renderItem={({ index, style }) => (
        <div style={style}>
          <TemplateCard template={templates[index]} />
        </div>
      )}
    />
  )
}
```

#### Authentication Problems

**Problem**: Users unable to access customization features

**Diagnostic Steps**:
1. Verify JWT token validity and expiration
2. Check user role permissions
3. Test authentication flow from login
4. Verify Supabase connection and policies

**Solutions**:
```javascript
// Enhanced authentication error handling
const useAuthWithRetry = () => {
  const [authError, setAuthError] = useState(null)
  
  const handleAuthError = useCallback(async (error) => {
    if (error.code === 'TOKEN_EXPIRED') {
      try {
        await refreshToken()
        setAuthError(null)
      } catch (refreshError) {
        setAuthError('session_expired')
        redirectToLogin()
      }
    } else if (error.code === 'INSUFFICIENT_PERMISSIONS') {
      setAuthError('permission_denied')
    } else {
      setAuthError('auth_failed')
    }
  }, [])
  
  return { authError, handleAuthError }
}
```

### Diagnostic Tools

#### Debug Information Panel

For development and support purposes:

```javascript
const DebugPanel = ({ enabled }) => {
  const [debugInfo, setDebugInfo] = useState({})
  
  useEffect(() => {
    if (!enabled) return
    
    setDebugInfo({
      user_id: user?.id,
      auth_token: authToken?.substring(0, 20) + '...',
      environment: process.env.NODE_ENV,
      api_endpoint: process.env.NEXT_PUBLIC_API_URL,
      browser: navigator.userAgent,
      screen_size: `${window.innerWidth}x${window.innerHeight}`,
      memory_usage: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        total: Math.round(performance.memory.totalJSHeapSize / 1048576)
      } : 'not available'
    })
  }, [enabled, user])
  
  if (!enabled) return null
  
  return (
    <div className="fixed bottom-0 right-0 p-4 bg-black text-white text-xs">
      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
    </div>
  )
}
```

#### Error Reporting Integration

Automated error collection and reporting:

```javascript
// Sentry integration for error tracking
import * as Sentry from '@sentry/react'

const CustomizationErrorBoundary = Sentry.withErrorBoundary(
  CustomizationPage,
  {
    fallback: ({ error, resetError }) => (
      <div className="error-fallback">
        <h2>Something went wrong with customization</h2>
        <details>
          <summary>Error details</summary>
          <pre>{error.message}</pre>
        </details>
        <button onClick={resetError}>Try again</button>
      </div>
    ),
    beforeCapture: (scope, error, errorInfo) => {
      scope.setTag('component', 'customization')
      scope.setContext('errorInfo', errorInfo)
      scope.setUser({ id: user?.id })
    }
  }
)
```

### Support Contact Information

#### Technical Support

**For technical issues**:
- **Email**: support@bookedbarber.com
- **Response Time**: 
  - P0 (Critical): 15 minutes
  - P1 (High): 1 hour
  - P2 (Standard): 4 hours
- **Support Hours**: 24/7 for P0/P1, business hours for P2

#### Six Figure Barber Methodology Support

**For business strategy questions**:
- **Email**: success@bookedbarber.com
- **Response Time**: 24-48 hours
- **Includes**: 
  - Customization strategy guidance
  - Template selection recommendations
  - Revenue optimization consulting
  - Best practices implementation

#### Emergency Escalation

**For critical system issues**:
1. **Immediate**: Use in-app emergency support button
2. **Phone**: 1-800-6FB-HELP (1-800-632-4357)
3. **Slack**: #emergency-support (for enterprise customers)

### Documentation Updates

This documentation is maintained as a living document. For updates or corrections:

**Documentation Repository**: 
- Location: `/Users/bossio/6FB AI Agent System/COMPREHENSIVE_CUSTOMIZE_PAGE_DOCUMENTATION.md`
- Last Updated: January 2025
- Version: 2.0.0
- Next Review: March 2025

**Contributing to Documentation**:
1. Submit issues or suggestions via GitHub
2. Follow documentation style guide
3. Include code examples for technical sections
4. Validate all links and references before submission

---

*This comprehensive documentation covers all aspects of the 6FB AI Agent System's customize page functionality. For additional support or specific use cases not covered here, please contact our support team.*
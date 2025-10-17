'use client'

import { z } from 'zod'

// Common validation patterns
const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
const instagramHandleRegex = /^@?([A-Za-z0-9_](?:(?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}(?:[A-Za-z0-9_]))?)$/
const customUrlRegex = /^[a-z0-9-]+$/

// Base schema for social links
const socialLinksSchema = z.object({
  instagram: z.string().refine(
    (val) => !val || urlRegex.test(val) || instagramHandleRegex.test(val),
    { message: 'Invalid Instagram URL or handle' }
  ).optional().default(''),
  tiktok: z.string().refine(
    (val) => !val || urlRegex.test(val),
    { message: 'Invalid TikTok URL' }
  ).optional().default(''),
  facebook: z.string().refine(
    (val) => !val || urlRegex.test(val),
    { message: 'Invalid Facebook URL' }
  ).optional().default(''),
  website: z.string().refine(
    (val) => !val || urlRegex.test(val),
    { message: 'Invalid website URL' }
  ).optional().default('')
})

// Business hours schema
const businessHourSchema = z.object({
  start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  available: z.boolean().default(true)
}).refine((data) => {
  if (!data.available) return true
  const start = new Date(`1970-01-01T${data.start}:00`)
  const end = new Date(`1970-01-01T${data.end}:00`)
  return start < end
}, {
  message: 'Start time must be before end time',
  path: ['end']
})

const businessHoursSchema = z.object({
  monday: businessHourSchema,
  tuesday: businessHourSchema,
  wednesday: businessHourSchema,
  thursday: businessHourSchema,
  friday: businessHourSchema,
  saturday: businessHourSchema,
  sunday: businessHourSchema
})

// Service schema
const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required').max(50, 'Service name too long'),
  price: z.number().min(0, 'Price must be positive').max(1000, 'Price too high'),
  duration: z.number().min(5, 'Minimum 5 minutes').max(480, 'Maximum 8 hours')
})

// Barber Profile Customization Schema
export const barberProfileSchema = z.object({
  // Basic Info
  full_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  
  bio: z.string()
    .max(500, 'Bio must be less than 500 characters')
    .optional()
    .default(''),
  
  phone: z.string()
    .refine((val) => !val || phoneRegex.test(val), {
      message: 'Invalid phone number format'
    })
    .optional()
    .default(''),
  
  instagram_handle: z.string()
    .refine((val) => !val || instagramHandleRegex.test(val), {
      message: 'Invalid Instagram handle format'
    })
    .optional()
    .default(''),
  
  years_experience: z.number()
    .min(0, 'Experience cannot be negative')
    .max(50, 'Experience cannot exceed 50 years')
    .default(0),
  
  // Images
  profile_image_url: z.string()
    .url('Invalid profile image URL')
    .optional()
    .default(''),
  
  portfolio_images: z.array(z.string().url('Invalid portfolio image URL'))
    .max(20, 'Maximum 20 portfolio images')
    .default([]),
  
  // Specializations
  specializations: z.array(z.string())
    .max(10, 'Maximum 10 specializations')
    .default([]),
  
  // Services
  services_offered: z.array(serviceSchema)
    .max(20, 'Maximum 20 services')
    .default([]),
  
  pricing_display: z.enum(['range', 'starting', 'contact'])
    .default('range'),
  
  // Availability
  preferred_hours: businessHoursSchema.optional(),
  
  booking_buffer_minutes: z.number()
    .min(0, 'Buffer cannot be negative')
    .max(120, 'Buffer cannot exceed 2 hours')
    .default(15),
  
  max_bookings_per_day: z.number()
    .min(1, 'Must allow at least 1 booking per day')
    .max(50, 'Cannot exceed 50 bookings per day')
    .default(8),
  
  // Branding
  profile_theme: z.enum(['professional', 'modern', 'classic', 'bold'])
    .default('professional'),
  
  show_reviews: z.boolean().default(true),
  show_experience: z.boolean().default(true),
  show_specializations: z.boolean().default(true),
  
  custom_booking_url: z.string()
    .refine((val) => !val || customUrlRegex.test(val), {
      message: 'URL can only contain lowercase letters, numbers, and hyphens'
    })
    .refine((val) => !val || val.length >= 3, {
      message: 'Custom URL must be at least 3 characters'
    })
    .refine((val) => !val || val.length <= 30, {
      message: 'Custom URL must be less than 30 characters'
    })
    .optional()
    .default(''),
  
  social_links: socialLinksSchema.default({})
})

// Barbershop Website Customization Schema
export const barbershopWebsiteSchema = z.object({
  // Basic Info
  business_name: z.string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name must be less than 100 characters'),
  
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .default(''),
  
  address: z.string()
    .max(200, 'Address must be less than 200 characters')
    .optional()
    .default(''),
  
  phone: z.string()
    .refine((val) => !val || phoneRegex.test(val), {
      message: 'Invalid phone number format'
    })
    .optional()
    .default(''),
  
  email: z.string()
    .email('Invalid email address')
    .optional()
    .default(''),
  
  website: z.string()
    .refine((val) => !val || urlRegex.test(val), {
      message: 'Invalid website URL'
    })
    .optional()
    .default(''),
  
  // Branding
  logo_url: z.string()
    .url('Invalid logo URL')
    .optional()
    .default(''),
  
  brand_color: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format')
    .default('#000000'),
  
  theme: z.enum(['modern', 'classic', 'luxury', 'minimal'])
    .default('modern'),
  
  // Gallery
  gallery_images: z.array(z.string().url('Invalid gallery image URL'))
    .max(50, 'Maximum 50 gallery images')
    .default([]),
  
  // Business Hours
  business_hours: businessHoursSchema.optional(),
  
  // Services
  featured_services: z.array(serviceSchema)
    .max(10, 'Maximum 10 featured services')
    .default([]),
  
  // SEO
  meta_title: z.string()
    .max(60, 'Meta title must be less than 60 characters')
    .optional()
    .default(''),
  
  meta_description: z.string()
    .max(160, 'Meta description must be less than 160 characters')
    .optional()
    .default(''),
  
  keywords: z.array(z.string())
    .max(20, 'Maximum 20 keywords')
    .default([]),
  
  // Social
  social_links: socialLinksSchema.default({}),
  
  // Features
  online_booking_enabled: z.boolean().default(true),
  reviews_enabled: z.boolean().default(true),
  gallery_enabled: z.boolean().default(true),
  contact_form_enabled: z.boolean().default(true),
  
  // Custom
  custom_css: z.string()
    .max(5000, 'Custom CSS must be less than 5000 characters')
    .optional()
    .default(''),
  
  custom_domain: z.string()
    .refine((val) => !val || /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,6}$/.test(val), {
      message: 'Invalid domain format'
    })
    .optional()
    .default('')
})

// Enterprise Website Customization Schema
export const enterpriseWebsiteSchema = z.object({
  // Organization Info
  organization_name: z.string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters'),
  
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .default(''),
  
  headquarters_address: z.string()
    .max(300, 'Address must be less than 300 characters')
    .optional()
    .default(''),
  
  // Branding
  logo_url: z.string()
    .url('Invalid logo URL')
    .optional()
    .default(''),
  
  brand_colors: z.object({
    primary: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid primary color'),
    secondary: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid secondary color'),
    accent: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid accent color')
  }).default({
    primary: '#000000',
    secondary: '#666666',
    accent: '#0066cc'
  }),
  
  theme: z.enum(['corporate', 'modern', 'luxury', 'minimal'])
    .default('corporate'),
  
  // Locations
  locations: z.array(z.object({
    name: z.string().min(1, 'Location name required'),
    address: z.string().min(1, 'Location address required'),
    phone: z.string().optional(),
    manager: z.string().optional(),
    business_hours: businessHoursSchema.optional()
  })).max(100, 'Maximum 100 locations').default([]),
  
  // Features
  multi_location_booking: z.boolean().default(true),
  centralized_analytics: z.boolean().default(true),
  staff_management: z.boolean().default(true),
  custom_reporting: z.boolean().default(true),
  
  // SEO
  meta_title: z.string()
    .max(60, 'Meta title must be less than 60 characters')
    .optional()
    .default(''),
  
  meta_description: z.string()
    .max(160, 'Meta description must be less than 160 characters')
    .optional()
    .default(''),
  
  // Custom
  custom_domain: z.string()
    .refine((val) => !val || /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,6}$/.test(val), {
      message: 'Invalid domain format'
    })
    .optional()
    .default(''),
  
  white_label_enabled: z.boolean().default(false),
  
  social_links: socialLinksSchema.default({})
})

// Validation helper functions
export const validateForm = (schema, data) => {
  try {
    const result = schema.safeParse(data)
    if (result.success) {
      return { success: true, data: result.data, errors: {} }
    } else {
      const errors = {}
      result.error.errors.forEach(error => {
        const path = error.path.join('.')
        errors[path] = error.message
      })
      return { success: false, data: null, errors }
    }
  } catch (error) {
    console.error('Schema validation error:', error)
    return { success: false, data: null, errors: { general: 'Validation failed' } }
  }
}

export const validateField = (schema, data, fieldPath) => {
  try {
    // Get the specific field schema
    const pathSegments = fieldPath.split('.')
    let currentSchema = schema.shape || schema
    
    for (const segment of pathSegments) {
      if (currentSchema[segment]) {
        currentSchema = currentSchema[segment]
      } else {
        return { success: false, error: 'Field not found in schema' }
      }
    }
    
    // Get field value
    let fieldValue = data
    for (const segment of pathSegments) {
      fieldValue = fieldValue?.[segment]
    }
    
    // Validate field
    const result = currentSchema.safeParse(fieldValue)
    
    if (result.success) {
      return { success: true, data: result.data, error: null }
    } else {
      return { success: false, data: null, error: result.error.errors[0]?.message || 'Validation failed' }
    }
  } catch (error) {
    console.error('Field validation error:', error)
    return { success: false, data: null, error: 'Field validation failed' }
  }
}

// Export schemas for easy access
export const schemas = {
  barberProfile: barberProfileSchema,
  barbershopWebsite: barbershopWebsiteSchema,
  enterpriseWebsite: enterpriseWebsiteSchema
}

export default schemas
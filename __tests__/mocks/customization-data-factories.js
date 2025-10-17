/**
 * Mock Data Factories for Customization Testing
 * 
 * This module provides comprehensive data factories for generating realistic
 * test data across all customization scenarios, user roles, and edge cases.
 * 
 * Categories:
 * - User Profile Factories
 * - Barber Profile Data
 * - Barbershop Website Data
 * - Enterprise Settings Data
 * - Image Upload Data
 * - Form State Data
 * - Validation Error Data
 */

import { faker } from '@faker-js/faker';

// =============================================================================
// Core Utility Functions
// =============================================================================

/**
 * Generate random ID in UUID format
 */
const generateId = () => faker.string.uuid();

/**
 * Generate random timestamp
 */
const generateTimestamp = (pastDays = 30) => 
  faker.date.recent({ days: pastDays }).toISOString();

/**
 * Generate realistic phone number
 */
const generatePhoneNumber = () => faker.phone.number('(###) ###-####');

/**
 * Generate realistic business hours
 */
const generateBusinessHours = () => ({
  monday: { open: '09:00', close: '18:00', closed: false },
  tuesday: { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday: { open: '09:00', close: '19:00', closed: false },
  friday: { open: '09:00', close: '19:00', closed: false },
  saturday: { open: '08:00', close: '17:00', closed: false },
  sunday: { open: '10:00', close: '16:00', closed: faker.datatype.boolean() }
});

// =============================================================================
// User Profile Factories
// =============================================================================

/**
 * Generate user profile data for different roles
 */
export const UserProfileFactory = {
  /**
   * Generate individual barber user profile
   */
  individualBarber: (overrides = {}) => ({
    id: generateId(),
    email: faker.internet.email(),
    role: 'individual_barber',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: generatePhoneNumber(),
    timezone: faker.location.timeZone(),
    profileComplete: faker.datatype.boolean({ probability: 0.8 }),
    emailVerified: faker.datatype.boolean({ probability: 0.9 }),
    createdAt: generateTimestamp(90),
    updatedAt: generateTimestamp(7),
    preferences: {
      notifications: {
        email: faker.datatype.boolean({ probability: 0.7 }),
        sms: faker.datatype.boolean({ probability: 0.6 }),
        push: faker.datatype.boolean({ probability: 0.8 })
      },
      theme: faker.helpers.arrayElement(['light', 'dark', 'system']),
      language: faker.helpers.arrayElement(['en', 'es', 'fr'])
    },
    ...overrides
  }),

  /**
   * Generate barbershop owner profile
   */
  barbershopOwner: (overrides = {}) => ({
    id: generateId(),
    email: faker.internet.email(),
    role: 'barbershop_owner',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: generatePhoneNumber(),
    timezone: faker.location.timeZone(),
    profileComplete: faker.datatype.boolean({ probability: 0.9 }),
    emailVerified: true,
    createdAt: generateTimestamp(180),
    updatedAt: generateTimestamp(3),
    shopId: generateId(),
    shopName: `${faker.person.lastName()}'s Barbershop`,
    ...overrides
  }),

  /**
   * Generate enterprise owner profile
   */
  enterpriseOwner: (overrides = {}) => ({
    id: generateId(),
    email: faker.internet.email(),
    role: 'enterprise_owner',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: generatePhoneNumber(),
    timezone: faker.location.timeZone(),
    profileComplete: true,
    emailVerified: true,
    createdAt: generateTimestamp(365),
    updatedAt: generateTimestamp(1),
    enterpriseId: generateId(),
    enterpriseName: faker.company.name(),
    locationCount: faker.number.int({ min: 2, max: 50 }),
    ...overrides
  })
};

// =============================================================================
// Barber Profile Data Factories
// =============================================================================

/**
 * Generate comprehensive barber profile data
 */
export const BarberProfileFactory = {
  /**
   * Complete barber profile with all sections
   */
  complete: (overrides = {}) => ({
    // Basic Information
    displayName: `${faker.person.firstName()} ${faker.person.lastName()}`,
    bio: faker.lorem.paragraph(3),
    specialties: faker.helpers.arrayElements([
      'Classic Cuts', 'Beard Styling', 'Hot Towel Shaves', 'Skin Fades',
      'Scissor Cuts', 'Straight Razor', 'Hair Washing', 'Mustache Styling'
    ], { min: 2, max: 5 }),
    experience: faker.number.int({ min: 1, max: 25 }),
    
    // Contact Information
    phone: generatePhoneNumber(),
    email: faker.internet.email(),
    website: faker.internet.url(),
    
    // Social Media
    instagram: `@${faker.internet.userName()}`,
    facebook: faker.internet.url(),
    tiktok: `@${faker.internet.userName()}`,
    
    // Business Settings
    hourlyRate: faker.number.int({ min: 25, max: 150 }),
    acceptsWalkIns: faker.datatype.boolean({ probability: 0.3 }),
    businessHours: generateBusinessHours(),
    
    // Services
    services: Array.from({ length: faker.number.int({ min: 3, max: 8 }) }, () => ({
      id: generateId(),
      name: faker.helpers.arrayElement([
        'Haircut', 'Beard Trim', 'Hot Towel Shave', 'Hair Wash',
        'Mustache Trim', 'Eyebrow Trim', 'Skin Fade', 'Buzz Cut'
      ]),
      duration: faker.helpers.arrayElement([15, 30, 45, 60, 90]),
      price: faker.number.int({ min: 15, max: 80 }),
      description: faker.lorem.sentence()
    })),
    
    // Location
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zipCode: faker.location.zipCode(),
      country: 'US'
    },
    
    // Media
    profileImage: null,
    portfolioImages: [],
    
    ...overrides
  }),

  /**
   * Minimal barber profile (new user)
   */
  minimal: (overrides = {}) => ({
    displayName: `${faker.person.firstName()} ${faker.person.lastName()}`,
    bio: '',
    specialties: [],
    experience: null,
    phone: '',
    email: '',
    website: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    hourlyRate: null,
    acceptsWalkIns: false,
    businessHours: null,
    services: [],
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    },
    profileImage: null,
    portfolioImages: [],
    ...overrides
  }),

  /**
   * Profile with validation errors
   */
  withErrors: (overrides = {}) => ({
    displayName: '', // Required field empty
    bio: faker.lorem.words(500), // Too long
    specialties: [],
    experience: -5, // Invalid negative number
    phone: '123', // Invalid format
    email: 'invalid-email', // Invalid format
    website: 'not-a-url', // Invalid URL
    instagram: faker.lorem.words(50), // Too long
    hourlyRate: 'not-a-number', // Invalid type
    services: Array.from({ length: 20 }, () => ({ // Too many services
      id: generateId(),
      name: '',
      duration: 0,
      price: -10
    })),
    address: {
      street: faker.lorem.words(100), // Too long
      city: '',
      state: 'INVALID',
      zipCode: '123',
      country: ''
    },
    ...overrides
  })
};

// =============================================================================
// Barbershop Website Data Factories
// =============================================================================

export const BarbershopWebsiteFactory = {
  /**
   * Complete barbershop website configuration
   */
  complete: (overrides = {}) => ({
    // Basic Information
    businessName: faker.company.name() + ' Barbershop',
    tagline: faker.company.catchPhrase(),
    description: faker.lorem.paragraphs(2),
    
    // Contact Information
    phone: generatePhoneNumber(),
    email: faker.internet.email(),
    website: faker.internet.url(),
    
    // Address
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zipCode: faker.location.zipCode(),
      country: 'US'
    },
    
    // Business Hours
    businessHours: generateBusinessHours(),
    
    // Services
    services: Array.from({ length: faker.number.int({ min: 5, max: 12 }) }, () => ({
      id: generateId(),
      name: faker.helpers.arrayElement([
        'Classic Haircut', 'Beard Styling', 'Hot Towel Shave', 'Skin Fade',
        'Scissor Cut', 'Buzz Cut', 'Mustache Trim', 'Hair Wash',
        'Straight Razor Shave', 'Eyebrow Trim'
      ]),
      description: faker.lorem.sentence(),
      duration: faker.helpers.arrayElement([30, 45, 60, 90]),
      price: faker.number.int({ min: 20, max: 100 })
    })),
    
    // Team Members
    team: Array.from({ length: faker.number.int({ min: 2, max: 8 }) }, () => ({
      id: generateId(),
      name: `${faker.person.firstName()} ${faker.person.lastName()}`,
      title: faker.helpers.arrayElement(['Master Barber', 'Senior Barber', 'Barber', 'Stylist']),
      bio: faker.lorem.paragraph(),
      image: null,
      specialties: faker.helpers.arrayElements([
        'Classic Cuts', 'Beard Styling', 'Fades', 'Shaves'
      ], { min: 1, max: 3 })
    })),
    
    // Social Media
    socialMedia: {
      instagram: `@${faker.internet.userName()}`,
      facebook: faker.internet.url(),
      tiktok: `@${faker.internet.userName()}`,
      yelp: faker.internet.url(),
      google: faker.internet.url()
    },
    
    // SEO Settings
    seo: {
      metaTitle: faker.lorem.words(6),
      metaDescription: faker.lorem.sentence(),
      keywords: faker.helpers.arrayElements([
        'barber', 'haircut', 'fade', 'beard', 'shave', 'men\'s grooming'
      ], { min: 3, max: 6 })
    },
    
    // Booking Settings
    booking: {
      enabled: true,
      requireDeposit: faker.datatype.boolean({ probability: 0.4 }),
      depositAmount: faker.number.int({ min: 10, max: 50 }),
      cancellationPolicy: faker.lorem.paragraph(),
      bookingWindowDays: faker.number.int({ min: 7, max: 90 })
    },
    
    // Media
    logo: null,
    heroImage: null,
    galleryImages: [],
    
    ...overrides
  }),

  /**
   * Minimal website setup
   */
  minimal: (overrides = {}) => ({
    businessName: '',
    tagline: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    },
    businessHours: null,
    services: [],
    team: [],
    socialMedia: {
      instagram: '',
      facebook: '',
      tiktok: '',
      yelp: '',
      google: ''
    },
    seo: {
      metaTitle: '',
      metaDescription: '',
      keywords: []
    },
    booking: {
      enabled: false,
      requireDeposit: false,
      depositAmount: null,
      cancellationPolicy: '',
      bookingWindowDays: 30
    },
    logo: null,
    heroImage: null,
    galleryImages: [],
    ...overrides
  })
};

// =============================================================================
// Enterprise Settings Data Factories
// =============================================================================

export const EnterpriseSettingsFactory = {
  /**
   * Complete enterprise configuration
   */
  complete: (overrides = {}) => ({
    // Company Information
    companyName: faker.company.name(),
    industry: faker.helpers.arrayElement(['Personal Care', 'Beauty & Wellness', 'Professional Services']),
    founded: faker.date.past({ years: 20 }).getFullYear(),
    description: faker.lorem.paragraphs(3),
    
    // Contact Information
    headquarters: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zipCode: faker.location.zipCode(),
      country: 'US'
    },
    phone: generatePhoneNumber(),
    email: faker.internet.email(),
    website: faker.internet.url(),
    
    // Locations
    locations: Array.from({ length: faker.number.int({ min: 2, max: 15 }) }, () => ({
      id: generateId(),
      name: `${faker.location.city()} Location`,
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        zipCode: faker.location.zipCode(),
        country: 'US'
      },
      phone: generatePhoneNumber(),
      manager: `${faker.person.firstName()} ${faker.person.lastName()}`,
      businessHours: generateBusinessHours(),
      staff: Array.from({ length: faker.number.int({ min: 3, max: 10 }) }, () => ({
        id: generateId(),
        name: `${faker.person.firstName()} ${faker.person.lastName()}`,
        role: faker.helpers.arrayElement(['Manager', 'Senior Barber', 'Barber', 'Assistant']),
        email: faker.internet.email()
      }))
    })),
    
    // Brand Guidelines
    brand: {
      primaryColor: faker.internet.color(),
      secondaryColor: faker.internet.color(),
      logo: null,
      fontFamily: faker.helpers.arrayElement(['Arial', 'Helvetica', 'Times New Roman', 'Georgia']),
      brandVoice: faker.helpers.arrayElement(['Professional', 'Friendly', 'Modern', 'Traditional'])
    },
    
    // Service Standards
    serviceStandards: {
      standardServices: Array.from({ length: faker.number.int({ min: 5, max: 15 }) }, () => ({
        id: generateId(),
        name: faker.helpers.arrayElement([
          'Premium Haircut', 'Executive Trim', 'Classic Shave', 'Beard Sculpting',
          'Hot Towel Treatment', 'Hair Styling', 'Grooming Package'
        ]),
        description: faker.lorem.sentence(),
        baseDuration: faker.helpers.arrayElement([30, 45, 60, 90]),
        basePrice: faker.number.int({ min: 30, max: 120 }),
        category: faker.helpers.arrayElement(['Haircuts', 'Shaving', 'Styling', 'Treatments'])
      })),
      qualityStandards: faker.lorem.paragraphs(2)
    },
    
    // Operational Settings
    operations: {
      timeZone: faker.location.timeZone(),
      currency: 'USD',
      bookingWindow: faker.number.int({ min: 30, max: 180 }),
      cancellationPolicy: faker.lorem.paragraph(),
      paymentTerms: faker.lorem.paragraph()
    },
    
    // Integrations
    integrations: {
      pos: faker.helpers.arrayElement(['Square', 'Toast', 'Clover', 'None']),
      accounting: faker.helpers.arrayElement(['QuickBooks', 'Xero', 'FreshBooks', 'None']),
      marketing: faker.helpers.arrayElement(['Mailchimp', 'Constant Contact', 'HubSpot', 'None']),
      analytics: faker.helpers.arrayElement(['Google Analytics', 'Adobe Analytics', 'None'])
    },
    
    ...overrides
  }),

  /**
   * Minimal enterprise setup
   */
  minimal: (overrides = {}) => ({
    companyName: '',
    industry: '',
    founded: null,
    description: '',
    headquarters: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    },
    phone: '',
    email: '',
    website: '',
    locations: [],
    brand: {
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      logo: null,
      fontFamily: 'Arial',
      brandVoice: 'Professional'
    },
    serviceStandards: {
      standardServices: [],
      qualityStandards: ''
    },
    operations: {
      timeZone: 'America/New_York',
      currency: 'USD',
      bookingWindow: 30,
      cancellationPolicy: '',
      paymentTerms: ''
    },
    integrations: {
      pos: 'None',
      accounting: 'None',
      marketing: 'None',
      analytics: 'None'
    },
    ...overrides
  })
};

// =============================================================================
// Image Upload Data Factories
// =============================================================================

export const ImageUploadFactory = {
  /**
   * Valid image file mock
   */
  validImage: (overrides = {}) => ({
    file: new File(['fake-image-content'], 'profile.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now()
    }),
    preview: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/',
    progress: 100,
    uploaded: true,
    url: faker.image.avatar(),
    ...overrides
  }),

  /**
   * Multiple image files
   */
  multipleImages: (count = 3) => 
    Array.from({ length: count }, (_, index) => ({
      file: new File([`fake-image-content-${index}`], `image-${index}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now() - index * 1000
      }),
      preview: `data:image/jpeg;base64,fake-preview-${index}`,
      progress: faker.number.int({ min: 0, max: 100 }),
      uploaded: faker.datatype.boolean({ probability: 0.7 }),
      url: faker.image.avatar()
    })),

  /**
   * Invalid file mock
   */
  invalidFile: (overrides = {}) => ({
    file: new File(['fake-document-content'], 'document.pdf', {
      type: 'application/pdf',
      lastModified: Date.now()
    }),
    preview: null,
    progress: 0,
    uploaded: false,
    error: 'Invalid file type. Please upload an image.',
    ...overrides
  }),

  /**
   * Large file mock (exceeds size limit)
   */
  largeFile: (overrides = {}) => ({
    file: new File(['x'.repeat(10 * 1024 * 1024)], 'large-image.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now()
    }),
    preview: null,
    progress: 0,
    uploaded: false,
    error: 'File size exceeds 5MB limit.',
    ...overrides
  })
};

// =============================================================================
// Form State Data Factories
// =============================================================================

export const FormStateFactory = {
  /**
   * Clean form state (no changes)
   */
  clean: (overrides = {}) => ({
    isDirty: false,
    hasChanges: false,
    isAutoSaving: false,
    lastSaved: generateTimestamp(1),
    errors: {},
    touched: {},
    isValid: true,
    ...overrides
  }),

  /**
   * Dirty form state (unsaved changes)
   */
  dirty: (overrides = {}) => ({
    isDirty: true,
    hasChanges: true,
    isAutoSaving: false,
    lastSaved: generateTimestamp(10),
    errors: {},
    touched: {
      displayName: true,
      bio: true,
      phone: true
    },
    isValid: true,
    ...overrides
  }),

  /**
   * Form state with validation errors
   */
  withErrors: (overrides = {}) => ({
    isDirty: true,
    hasChanges: true,
    isAutoSaving: false,
    lastSaved: null,
    errors: {
      displayName: 'Display name is required',
      phone: 'Phone number format is invalid',
      email: 'Email address is not valid',
      hourlyRate: 'Rate must be a positive number'
    },
    touched: {
      displayName: true,
      phone: true,
      email: true,
      hourlyRate: true
    },
    isValid: false,
    ...overrides
  }),

  /**
   * Auto-saving form state
   */
  autoSaving: (overrides = {}) => ({
    isDirty: true,
    hasChanges: true,
    isAutoSaving: true,
    lastSaved: generateTimestamp(2),
    errors: {},
    touched: {
      bio: true
    },
    isValid: true,
    ...overrides
  })
};

// =============================================================================
// Undo/Redo History Factories
// =============================================================================

export const UndoRedoFactory = {
  /**
   * History with multiple steps
   */
  withHistory: (stepCount = 5) => ({
    history: Array.from({ length: stepCount }, (_, index) => ({
      timestamp: generateTimestamp(stepCount - index),
      action: faker.helpers.arrayElement(['update_field', 'add_service', 'delete_service', 'update_hours']),
      data: {
        field: faker.helpers.arrayElement(['displayName', 'bio', 'phone', 'hourlyRate']),
        oldValue: faker.lorem.word(),
        newValue: faker.lorem.word()
      }
    })),
    currentIndex: stepCount - 1,
    canUndo: true,
    canRedo: false
  }),

  /**
   * Empty history (new form)
   */
  empty: () => ({
    history: [],
    currentIndex: -1,
    canUndo: false,
    canRedo: false
  }),

  /**
   * History at max capacity (10 steps)
   */
  atMaxCapacity: () => ({
    history: Array.from({ length: 10 }, (_, index) => ({
      timestamp: generateTimestamp(10 - index),
      action: 'update_field',
      data: {
        field: `field_${index}`,
        oldValue: `old_${index}`,
        newValue: `new_${index}`
      }
    })),
    currentIndex: 9,
    canUndo: true,
    canRedo: false
  })
};

// =============================================================================
// API Response Factories
// =============================================================================

export const APIResponseFactory = {
  /**
   * Successful API response
   */
  success: (data = {}, overrides = {}) => ({
    success: true,
    data,
    message: 'Operation completed successfully',
    timestamp: generateTimestamp(0),
    ...overrides
  }),

  /**
   * API error response
   */
  error: (message = 'An error occurred', overrides = {}) => ({
    success: false,
    error: {
      message,
      code: faker.helpers.arrayElement(['VALIDATION_ERROR', 'SERVER_ERROR', 'NOT_FOUND', 'UNAUTHORIZED']),
      details: faker.lorem.sentence()
    },
    timestamp: generateTimestamp(0),
    ...overrides
  }),

  /**
   * Validation error response
   */
  validationError: (fields = {}) => ({
    success: false,
    error: {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      fields
    },
    timestamp: generateTimestamp(0)
  })
};

// =============================================================================
// Test Scenario Builders
// =============================================================================

/**
 * Build complete test scenario with all related data
 */
export const TestScenarioBuilder = {
  /**
   * New individual barber onboarding scenario
   */
  newBarberOnboarding: () => ({
    user: UserProfileFactory.individualBarber({ profileComplete: false }),
    profile: BarberProfileFactory.minimal(),
    formState: FormStateFactory.clean(),
    undoHistory: UndoRedoFactory.empty()
  }),

  /**
   * Experienced barber updating profile scenario
   */
  experiencedBarberUpdate: () => ({
    user: UserProfileFactory.individualBarber({ profileComplete: true }),
    profile: BarberProfileFactory.complete(),
    formState: FormStateFactory.dirty(),
    undoHistory: UndoRedoFactory.withHistory(3)
  }),

  /**
   * Barbershop owner setting up website scenario
   */
  barbershopWebsiteSetup: () => ({
    user: UserProfileFactory.barbershopOwner(),
    website: BarbershopWebsiteFactory.minimal(),
    formState: FormStateFactory.clean(),
    images: ImageUploadFactory.multipleImages(2)
  }),

  /**
   * Enterprise configuration scenario
   */
  enterpriseConfiguration: () => ({
    user: UserProfileFactory.enterpriseOwner(),
    settings: EnterpriseSettingsFactory.complete(),
    formState: FormStateFactory.autoSaving(),
    undoHistory: UndoRedoFactory.withHistory(7)
  }),

  /**
   * Form validation error scenario
   */
  validationErrorScenario: () => ({
    user: UserProfileFactory.individualBarber(),
    profile: BarberProfileFactory.withErrors(),
    formState: FormStateFactory.withErrors(),
    apiResponse: APIResponseFactory.validationError({
      displayName: 'Display name is required',
      phone: 'Invalid phone number format'
    })
  })
};

// =============================================================================
// Export All Factories
// =============================================================================

export default {
  UserProfileFactory,
  BarberProfileFactory,
  BarbershopWebsiteFactory,
  EnterpriseSettingsFactory,
  ImageUploadFactory,
  FormStateFactory,
  UndoRedoFactory,
  APIResponseFactory,
  TestScenarioBuilder
};
/**
 * @jest-environment jsdom
 */

import { 
  barberProfileSchema,
  barbershopWebsiteSchema,
  enterpriseWebsiteSchema,
  validateForm,
  validateField,
  schemas
} from '@/lib/validation/customization-schemas'

describe('Customization Validation Schemas', () => {
  describe('Barber Profile Schema', () => {
    const validBarberData = {
      full_name: 'John Doe',
      bio: 'Professional barber with 10 years of experience',
      phone: '+1234567890',
      instagram_handle: '@johndoe',
      years_experience: 10,
      profile_image_url: 'https://example.com/profile.jpg',
      portfolio_images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
      specializations: ['Fades', 'Beard Trim'],
      services_offered: [
        { name: 'Haircut', price: 30, duration: 45 },
        { name: 'Beard Trim', price: 15, duration: 20 }
      ],
      pricing_display: 'range',
      booking_buffer_minutes: 15,
      max_bookings_per_day: 8,
      profile_theme: 'professional',
      show_reviews: true,
      show_experience: true,
      show_specializations: true,
      custom_booking_url: 'john-doe-barber',
      social_links: {
        instagram: 'https://instagram.com/johndoe',
        facebook: 'https://facebook.com/johndoe'
      }
    }

    describe('Valid Data Cases', () => {
      it('validates complete valid profile data', () => {
        const result = barberProfileSchema.safeParse(validBarberData)
        expect(result.success).toBe(true)
        expect(result.data).toMatchObject(validBarberData)
      })

      it('validates minimal required data with defaults', () => {
        const minimalData = {
          full_name: 'Jane Smith'
        }
        
        const result = barberProfileSchema.safeParse(minimalData)
        expect(result.success).toBe(true)
        expect(result.data.full_name).toBe('Jane Smith')
        expect(result.data.bio).toBe('')
        expect(result.data.years_experience).toBe(0)
        expect(result.data.portfolio_images).toEqual([])
        expect(result.data.specializations).toEqual([])
        expect(result.data.services_offered).toEqual([])
        expect(result.data.pricing_display).toBe('range')
        expect(result.data.profile_theme).toBe('professional')
        expect(result.data.show_reviews).toBe(true)
      })

      it('validates alternative social link formats', () => {
        const variations = [
          { instagram_handle: 'johndoe' }, // Without @
          { instagram_handle: '@john_doe_123' }, // With underscore and numbers
          { social_links: { instagram: '@johndoe' } }, // Handle format in social links
          { social_links: { instagram: '' } }, // Empty social links
        ]

        variations.forEach(variation => {
          const data = { ...validBarberData, ...variation }
          const result = barberProfileSchema.safeParse(data)
          expect(result.success).toBe(true)
        })
      })

      it('validates URL formats correctly', () => {
        const urlVariations = [
          'https://example.com/image.jpg',
          'http://example.com/image.png', 
          'https://subdomain.example.com/path/to/image.webp',
          'https://example.com/image.jpg?v=123&size=large'
        ]

        urlVariations.forEach(url => {
          const data = {
            ...validBarberData,
            profile_image_url: url,
            portfolio_images: [url]
          }
          const result = barberProfileSchema.safeParse(data)
          expect(result.success).toBe(true)
        })
      })

      it('validates phone number formats', () => {
        const phoneVariations = [
          '+1234567890',
          '+44123456789',
          '+861234567890',
          '', // Empty phone (optional)
        ]

        phoneVariations.forEach(phone => {
          const data = { ...validBarberData, phone }
          const result = barberProfileSchema.safeParse(data)
          expect(result.success).toBe(true)
        })
      })

      it('validates business hours structure', () => {
        const businessHours = {
          monday: { start: '09:00', end: '17:00', available: true },
          tuesday: { start: '09:00', end: '17:00', available: true },
          wednesday: { start: '09:00', end: '17:00', available: true },
          thursday: { start: '09:00', end: '17:00', available: true },
          friday: { start: '09:00', end: '17:00', available: true },
          saturday: { start: '10:00', end: '16:00', available: true },
          sunday: { start: '10:00', end: '16:00', available: false }
        }

        const data = { ...validBarberData, preferred_hours: businessHours }
        const result = barberProfileSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    describe('Invalid Data Cases', () => {
      it('rejects invalid full name formats', () => {
        const invalidNames = [
          '', // Empty
          'A', // Too short
          'a'.repeat(51), // Too long
          'John123', // Contains numbers
          'John@Doe', // Contains special chars
          null,
          undefined
        ]

        invalidNames.forEach(name => {
          const data = { ...validBarberData, full_name: name }
          const result = barberProfileSchema.safeParse(data)
          expect(result.success).toBe(false)
          expect(result.error.errors.some(err => err.path.includes('full_name'))).toBe(true)
        })
      })

      it('rejects bio that is too long', () => {
        const data = {
          ...validBarberData,
          bio: 'a'.repeat(501) // Exceeds 500 char limit
        }
        
        const result = barberProfileSchema.safeParse(data)
        expect(result.success).toBe(false)
        expect(result.error.errors.some(err => 
          err.path.includes('bio') && err.message.includes('less than 500')
        )).toBe(true)
      })

      it('rejects invalid phone number formats', () => {
        const invalidPhones = [
          '123', // Too short
          'abc123', // Contains letters
          '+', // Invalid format
          '1234567890123456789', // Too long
          '+abc123456789' // Letters after country code
        ]

        invalidPhones.forEach(phone => {
          const data = { ...validBarberData, phone }
          const result = barberProfileSchema.safeParse(data)
          expect(result.success).toBe(false)
        })
      })

      it('rejects invalid Instagram handles', () => {
        const invalidHandles = [
          '@', // Just @
          '@a', // Too short
          '@' + 'a'.repeat(31), // Too long
          '@john..doe', // Double dots
          '@john.', // Ending with dot
          '@.john', // Starting with dot after @
          '@john-doe', // Contains hyphen
          'john doe' // Contains space
        ]

        invalidHandles.forEach(handle => {
          const data = { ...validBarberData, instagram_handle: handle }
          const result = barberProfileSchema.safeParse(data)
          expect(result.success).toBe(false)
        })
      })

      it('rejects negative or excessive experience years', () => {
        const invalidExperience = [
          -1, // Negative
          51, // Exceeds maximum
          'ten' // Not a number
        ]

        invalidExperience.forEach(years => {
          const data = { ...validBarberData, years_experience: years }
          const result = barberProfileSchema.safeParse(data)
          expect(result.success).toBe(false)
        })
      })

      it('rejects invalid URLs', () => {
        const invalidUrls = [
          'not-a-url',
          'ftp://example.com/image.jpg', // Wrong protocol
          'http://', // Incomplete
          'https://example', // Missing TLD
          'example.com/image.jpg' // Missing protocol
        ]

        invalidUrls.forEach(url => {
          const data = { 
            ...validBarberData, 
            profile_image_url: url,
            portfolio_images: [url]
          }
          const result = barberProfileSchema.safeParse(data)
          expect(result.success).toBe(false)
        })
      })

      it('rejects too many portfolio images', () => {
        const tooManyImages = Array(21).fill('https://example.com/image.jpg')
        const data = { ...validBarberData, portfolio_images: tooManyImages }
        
        const result = barberProfileSchema.safeParse(data)
        expect(result.success).toBe(false)
        expect(result.error.errors.some(err => 
          err.message.includes('Maximum 20 portfolio images')
        )).toBe(true)
      })

      it('rejects too many specializations', () => {
        const tooManySpecs = Array(11).fill('Haircut')
        const data = { ...validBarberData, specializations: tooManySpecs }
        
        const result = barberProfileSchema.safeParse(data)
        expect(result.success).toBe(false)
        expect(result.error.errors.some(err => 
          err.message.includes('Maximum 10 specializations')
        )).toBe(true)
      })

      it('rejects invalid service data', () => {
        const invalidServices = [
          { name: '', price: 30, duration: 45 }, // Empty name
          { name: 'a'.repeat(51), price: 30, duration: 45 }, // Name too long
          { name: 'Haircut', price: -10, duration: 45 }, // Negative price
          { name: 'Haircut', price: 1001, duration: 45 }, // Price too high
          { name: 'Haircut', price: 30, duration: 2 }, // Duration too short
          { name: 'Haircut', price: 30, duration: 500 } // Duration too long
        ]

        invalidServices.forEach(service => {
          const data = { ...validBarberData, services_offered: [service] }
          const result = barberProfileSchema.safeParse(data)
          expect(result.success).toBe(false)
        })
      })

      it('rejects invalid pricing display options', () => {
        const data = { ...validBarberData, pricing_display: 'invalid' }
        const result = barberProfileSchema.safeParse(data)
        expect(result.success).toBe(false)
      })

      it('rejects invalid booking settings', () => {
        const invalidSettings = [
          { booking_buffer_minutes: -1 }, // Negative buffer
          { booking_buffer_minutes: 121 }, // Buffer too long
          { max_bookings_per_day: 0 }, // Zero bookings
          { max_bookings_per_day: 51 } // Too many bookings
        ]

        invalidSettings.forEach(settings => {
          const data = { ...validBarberData, ...settings }
          const result = barberProfileSchema.safeParse(data)
          expect(result.success).toBe(false)
        })
      })

      it('rejects invalid custom booking URL', () => {
        const invalidUrls = [
          'a', // Too short
          'a'.repeat(31), // Too long
          'john doe', // Contains space
          'john.doe', // Contains dot
          'JOHN-DOE', // Contains uppercase
          'john_doe', // Contains underscore
          'john@doe' // Contains special char
        ]

        invalidUrls.forEach(url => {
          const data = { ...validBarberData, custom_booking_url: url }
          const result = barberProfileSchema.safeParse(data)
          expect(result.success).toBe(false)
        })
      })

      it('rejects invalid business hours', () => {
        const invalidHours = {
          monday: { start: '17:00', end: '09:00', available: true } // Start after end
        }

        const data = { ...validBarberData, preferred_hours: invalidHours }
        const result = barberProfileSchema.safeParse(data)
        expect(result.success).toBe(false)
      })
    })

    describe('Edge Cases', () => {
      it('handles empty arrays correctly', () => {
        const data = {
          ...validBarberData,
          portfolio_images: [],
          specializations: [],
          services_offered: []
        }
        
        const result = barberProfileSchema.safeParse(data)
        expect(result.success).toBe(true)
      })

      it('handles optional fields as undefined', () => {
        const data = {
          full_name: 'John Doe',
          bio: undefined,
          phone: undefined,
          instagram_handle: undefined,
          profile_image_url: undefined,
          custom_booking_url: undefined
        }
        
        const result = barberProfileSchema.safeParse(data)
        expect(result.success).toBe(true)
      })

      it('validates social links with mixed formats', () => {
        const data = {
          ...validBarberData,
          social_links: {
            instagram: '@johndoe',
            facebook: 'https://facebook.com/johndoe',
            tiktok: '', // Empty
            website: 'https://johndoe.com'
          }
        }
        
        const result = barberProfileSchema.safeParse(data)
        expect(result.success).toBe(true)
      })

      it('handles business hours with unavailable days', () => {
        const businessHours = {
          monday: { start: '09:00', end: '17:00', available: false },
          tuesday: { start: '09:00', end: '17:00', available: true },
          // ... other days
        }

        const data = { ...validBarberData, preferred_hours: businessHours }
        const result = barberProfileSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Barbershop Website Schema', () => {
    const validBarbershopData = {
      business_name: 'The Modern Barbershop',
      description: 'Premier barbershop offering traditional and modern cuts',
      address: '123 Main Street, City, State 12345',
      phone: '+1234567890',
      email: 'info@modernbarbershop.com',
      website: 'https://modernbarbershop.com',
      logo_url: 'https://example.com/logo.png',
      brand_color: '#1a1a1a',
      theme: 'modern',
      gallery_images: [
        'https://example.com/gallery1.jpg',
        'https://example.com/gallery2.jpg'
      ],
      business_hours: {
        monday: { start: '09:00', end: '18:00', available: true },
        tuesday: { start: '09:00', end: '18:00', available: true },
        wednesday: { start: '09:00', end: '18:00', available: true },
        thursday: { start: '09:00', end: '18:00', available: true },
        friday: { start: '09:00', end: '19:00', available: true },
        saturday: { start: '08:00', end: '17:00', available: true },
        sunday: { start: '10:00', end: '16:00', available: false }
      },
      featured_services: [
        { name: 'Classic Cut', price: 35, duration: 60 },
        { name: 'Beard Trim', price: 20, duration: 30 }
      ],
      meta_title: 'The Modern Barbershop - Professional Cuts & Styling',
      meta_description: 'Experience the finest in traditional and modern barbering at The Modern Barbershop. Book your appointment today.',
      keywords: ['barber', 'haircut', 'styling', 'beard', 'trim'],
      social_links: {
        instagram: 'https://instagram.com/modernbarbershop',
        facebook: 'https://facebook.com/modernbarbershop',
        website: 'https://modernbarbershop.com'
      },
      online_booking_enabled: true,
      reviews_enabled: true,
      gallery_enabled: true,
      contact_form_enabled: true,
      custom_css: '.header { background-color: #1a1a1a; }',
      custom_domain: 'booking.modernbarbershop.com'
    }

    describe('Valid Data Cases', () => {
      it('validates complete barbershop data', () => {
        const result = barbershopWebsiteSchema.safeParse(validBarbershopData)
        expect(result.success).toBe(true)
      })

      it('validates minimal required data', () => {
        const minimalData = {
          business_name: 'Simple Cuts'
        }
        
        const result = barbershopWebsiteSchema.safeParse(minimalData)
        expect(result.success).toBe(true)
        expect(result.data.business_name).toBe('Simple Cuts')
        expect(result.data.theme).toBe('modern')
        expect(result.data.online_booking_enabled).toBe(true)
        expect(result.data.brand_color).toBe('#000000')
      })

      it('validates different theme options', () => {
        const themes = ['modern', 'classic', 'luxury', 'minimal']
        
        themes.forEach(theme => {
          const data = { ...validBarbershopData, theme }
          const result = barbershopWebsiteSchema.safeParse(data)
          expect(result.success).toBe(true)
          expect(result.data.theme).toBe(theme)
        })
      })

      it('validates color formats', () => {
        const validColors = [
          '#000000', // Full hex
          '#fff', // Short hex
          '#1a2b3c', // Mixed case handled
          '#ABC123' // Uppercase
        ]

        validColors.forEach(color => {
          const data = { ...validBarbershopData, brand_color: color }
          const result = barbershopWebsiteSchema.safeParse(data)
          expect(result.success).toBe(true)
        })
      })

      it('validates SEO fields', () => {
        const seoData = {
          ...validBarbershopData,
          meta_title: 'A'.repeat(60), // Max length
          meta_description: 'B'.repeat(160), // Max length
          keywords: Array(20).fill('keyword') // Max keywords
        }
        
        const result = barbershopWebsiteSchema.safeParse(seoData)
        expect(result.success).toBe(true)
      })

      it('validates custom domain formats', () => {
        const validDomains = [
          'example.com',
          'subdomain.example.com', 
          'booking.barbershop.co.uk',
          'my-shop.example.org'
        ]

        validDomains.forEach(domain => {
          const data = { ...validBarbershopData, custom_domain: domain }
          const result = barbershopWebsiteSchema.safeParse(data)
          expect(result.success).toBe(true)
        })
      })
    })

    describe('Invalid Data Cases', () => {
      it('rejects invalid business names', () => {
        const invalidNames = [
          '', // Empty
          'A', // Too short
          'a'.repeat(101) // Too long
        ]

        invalidNames.forEach(name => {
          const data = { ...validBarbershopData, business_name: name }
          const result = barbershopWebsiteSchema.safeParse(data)
          expect(result.success).toBe(false)
        })
      })

      it('rejects invalid email addresses', () => {
        const invalidEmails = [
          'not-an-email',
          '@example.com',
          'user@',
          'user.example.com',
          'user@example',
          'user name@example.com' // Space in email
        ]

        invalidEmails.forEach(email => {
          const data = { ...validBarbershopData, email }
          const result = barbershopWebsiteSchema.safeParse(data)
          expect(result.success).toBe(false)
        })
      })

      it('rejects invalid color formats', () => {
        const invalidColors = [
          'black', // Color name
          'rgb(0,0,0)', // RGB format
          '#12345', // Invalid hex length
          '#1234567', // Too long
          '#GGG', // Invalid hex chars
          'not-a-color'
        ]

        invalidColors.forEach(color => {
          const data = { ...validBarbershopData, brand_color: color }
          const result = barbershopWebsiteSchema.safeParse(data)
          expect(result.success).toBe(false)
        })
      })

      it('rejects too many gallery images', () => {
        const tooManyImages = Array(51).fill('https://example.com/image.jpg')
        const data = { ...validBarbershopData, gallery_images: tooManyImages }
        
        const result = barbershopWebsiteSchema.safeParse(data)
        expect(result.success).toBe(false)
      })

      it('rejects SEO fields that are too long', () => {
        const invalidSEO = [
          { meta_title: 'a'.repeat(61) }, // Too long
          { meta_description: 'b'.repeat(161) }, // Too long
          { keywords: Array(21).fill('keyword') } // Too many
        ]

        invalidSEO.forEach(seoField => {
          const data = { ...validBarbershopData, ...seoField }
          const result = barbershopWebsiteSchema.safeParse(data)
          expect(result.success).toBe(false)
        })
      })

      it('rejects invalid custom domains', () => {
        const invalidDomains = [
          'not-a-domain',
          'example',
          '.example.com',
          'example..com',
          'example.c',
          'example.toolongoftld'
        ]

        invalidDomains.forEach(domain => {
          const data = { ...validBarbershopData, custom_domain: domain }
          const result = barbershopWebsiteSchema.safeParse(data)
          expect(result.success).toBe(false)
        })
      })

      it('rejects custom CSS that is too long', () => {
        const data = {
          ...validBarbershopData,
          custom_css: 'a'.repeat(5001)
        }
        
        const result = barbershopWebsiteSchema.safeParse(data)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Enterprise Website Schema', () => {
    const validEnterpriseData = {
      organization_name: 'Premier Barber Chain',
      description: 'Leading barbershop franchise with locations nationwide',
      headquarters_address: '456 Corporate Blvd, Business City, State 67890',
      logo_url: 'https://example.com/enterprise-logo.png',
      brand_colors: {
        primary: '#1a1a1a',
        secondary: '#666666',
        accent: '#0066cc'
      },
      theme: 'corporate',
      locations: [
        {
          name: 'Downtown Location',
          address: '123 Main St, City, State',
          phone: '+1234567890',
          manager: 'John Manager',
          business_hours: {
            monday: { start: '09:00', end: '18:00', available: true },
            tuesday: { start: '09:00', end: '18:00', available: true },
            wednesday: { start: '09:00', end: '18:00', available: true },
            thursday: { start: '09:00', end: '18:00', available: true },
            friday: { start: '09:00', end: '19:00', available: true },
            saturday: { start: '08:00', end: '17:00', available: true },
            sunday: { start: '10:00', end: '16:00', available: false }
          }
        },
        {
          name: 'Mall Location',
          address: '789 Shopping Center, City, State',
          phone: '+1987654321',
          manager: 'Jane Manager'
        }
      ],
      multi_location_booking: true,
      centralized_analytics: true,
      staff_management: true,
      custom_reporting: true,
      meta_title: 'Premier Barber Chain - Professional Styling Nationwide',
      meta_description: 'Experience consistent quality at any of our Premier Barber Chain locations. Book online today.',
      custom_domain: 'booking.premierbarbershops.com',
      white_label_enabled: false,
      social_links: {
        instagram: 'https://instagram.com/premierbarbershops',
        facebook: 'https://facebook.com/premierbarbershops',
        website: 'https://premierbarbershops.com'
      }
    }

    describe('Valid Data Cases', () => {
      it('validates complete enterprise data', () => {
        const result = enterpriseWebsiteSchema.safeParse(validEnterpriseData)
        expect(result.success).toBe(true)
      })

      it('validates minimal enterprise data', () => {
        const minimalData = {
          organization_name: 'Simple Chain'
        }
        
        const result = enterpriseWebsiteSchema.safeParse(minimalData)
        expect(result.success).toBe(true)
        expect(result.data.organization_name).toBe('Simple Chain')
        expect(result.data.theme).toBe('corporate')
        expect(result.data.multi_location_booking).toBe(true)
        expect(result.data.white_label_enabled).toBe(false)
      })

      it('validates different enterprise themes', () => {
        const themes = ['corporate', 'modern', 'luxury', 'minimal']
        
        themes.forEach(theme => {
          const data = { ...validEnterpriseData, theme }
          const result = enterpriseWebsiteSchema.safeParse(data)
          expect(result.success).toBe(true)
        })
      })

      it('validates brand color combinations', () => {
        const colorCombos = [
          { primary: '#000000', secondary: '#666666', accent: '#ff0000' },
          { primary: '#fff', secondary: '#ccc', accent: '#00f' }, // Short format
          { primary: '#1A2B3C', secondary: '#4D5E6F', accent: '#7890AB' } // Mixed case
        ]

        colorCombos.forEach(brand_colors => {
          const data = { ...validEnterpriseData, brand_colors }
          const result = enterpriseWebsiteSchema.safeParse(data)
          expect(result.success).toBe(true)
        })
      })

      it('validates locations with varying data completeness', () => {
        const locations = [
          { // Complete location data
            name: 'Full Location',
            address: '123 Complete St',
            phone: '+1234567890',
            manager: 'Full Manager',
            business_hours: {
              monday: { start: '09:00', end: '17:00', available: true }
            }
          },
          { // Minimal location data
            name: 'Minimal Location',
            address: '456 Basic Ave'
          }
        ]

        const data = { ...validEnterpriseData, locations }
        const result = enterpriseWebsiteSchema.safeParse(data)
        expect(result.success).toBe(true)
      })

      it('validates up to maximum locations', () => {
        const maxLocations = Array(100).fill({
          name: 'Location',
          address: '123 Main St'
        }).map((loc, index) => ({
          ...loc,
          name: `Location ${index + 1}`
        }))

        const data = { ...validEnterpriseData, locations: maxLocations }
        const result = enterpriseWebsiteSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    describe('Invalid Data Cases', () => {
      it('rejects invalid organization names', () => {
        const invalidNames = [
          '', // Empty
          'A', // Too short
          'a'.repeat(101) // Too long
        ]

        invalidNames.forEach(name => {
          const data = { ...validEnterpriseData, organization_name: name }
          const result = enterpriseWebsiteSchema.safeParse(data)
          expect(result.success).toBe(false)
        })
      })

      it('rejects invalid brand colors', () => {
        const invalidBrandColors = [
          { primary: 'invalid', secondary: '#666666', accent: '#0066cc' },
          { primary: '#000000', secondary: 'rgb(102,102,102)', accent: '#0066cc' },
          { primary: '#000000', secondary: '#666666', accent: 'blue' }
        ]

        invalidBrandColors.forEach(brand_colors => {
          const data = { ...validEnterpriseData, brand_colors }
          const result = enterpriseWebsiteSchema.safeParse(data)
          expect(result.success).toBe(false)
        })
      })

      it('rejects too many locations', () => {
        const tooManyLocations = Array(101).fill({
          name: 'Location',
          address: '123 Main St'
        })

        const data = { ...validEnterpriseData, locations: tooManyLocations }
        const result = enterpriseWebsiteSchema.safeParse(data)
        expect(result.success).toBe(false)
      })

      it('rejects locations with missing required fields', () => {
        const invalidLocations = [
          { address: '123 Main St' }, // Missing name
          { name: 'Test Location' }, // Missing address
          { name: '', address: '123 Main St' }, // Empty name
          { name: 'Test', address: '' } // Empty address
        ]

        invalidLocations.forEach(location => {
          const data = { ...validEnterpriseData, locations: [location] }
          const result = enterpriseWebsiteSchema.safeParse(data)
          expect(result.success).toBe(false)
        })
      })

      it('rejects description that is too long', () => {
        const data = {
          ...validEnterpriseData,
          description: 'a'.repeat(2001)
        }
        
        const result = enterpriseWebsiteSchema.safeParse(data)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Validation Helper Functions', () => {
    describe('validateForm function', () => {
      it('returns success for valid data', () => {
        const validData = { full_name: 'John Doe' }
        const result = validateForm(barberProfileSchema, validData)
        
        expect(result.success).toBe(true)
        expect(result.data).toBeTruthy()
        expect(result.errors).toEqual({})
      })

      it('returns errors for invalid data', () => {
        const invalidData = { full_name: '' } // Empty name
        const result = validateForm(barberProfileSchema, invalidData)
        
        expect(result.success).toBe(false)
        expect(result.data).toBe(null)
        expect(result.errors).toHaveProperty('full_name')
        expect(result.errors.full_name).toContain('at least 2 characters')
      })

      it('handles nested field errors correctly', () => {
        const invalidData = {
          full_name: 'John Doe',
          social_links: {
            instagram: 'invalid-url',
            facebook: 'also-invalid'
          }
        }
        const result = validateForm(barberProfileSchema, invalidData)
        
        expect(result.success).toBe(false)
        expect(result.errors).toHaveProperty('social_links.instagram')
        expect(result.errors).toHaveProperty('social_links.facebook')
      })

      it('handles schema validation errors gracefully', () => {
        const result = validateForm(null, { test: 'data' })
        
        expect(result.success).toBe(false)
        expect(result.errors).toHaveProperty('general')
        expect(result.errors.general).toBe('Validation failed')
      })

      it('formats error paths correctly', () => {
        const invalidData = {
          full_name: 'John Doe',
          services_offered: [
            { name: '', price: -10, duration: 0 } // Multiple errors
          ]
        }
        const result = validateForm(barberProfileSchema, invalidData)
        
        expect(result.success).toBe(false)
        expect(result.errors).toHaveProperty('services_offered.0.name')
        expect(result.errors).toHaveProperty('services_offered.0.price')
        expect(result.errors).toHaveProperty('services_offered.0.duration')
      })
    })

    describe('validateField function', () => {
      const testData = {
        full_name: 'John Doe',
        bio: 'Professional barber',
        social_links: {
          instagram: '@johndoe'
        }
      }

      it('validates individual fields successfully', () => {
        const result = validateField(barberProfileSchema, testData, 'full_name')
        
        expect(result.success).toBe(true)
        expect(result.data).toBe('John Doe')
        expect(result.error).toBe(null)
      })

      it('validates nested fields', () => {
        const result = validateField(barberProfileSchema, testData, 'social_links.instagram')
        
        expect(result.success).toBe(true)
        expect(result.data).toBe('@johndoe')
      })

      it('returns error for invalid field values', () => {
        const invalidData = { ...testData, full_name: '' }
        const result = validateField(barberProfileSchema, invalidData, 'full_name')
        
        expect(result.success).toBe(false)
        expect(result.data).toBe(null)
        expect(result.error).toContain('at least 2 characters')
      })

      it('handles non-existent field paths', () => {
        const result = validateField(barberProfileSchema, testData, 'nonexistent.field')
        
        expect(result.success).toBe(false)
        expect(result.error).toBe('Field not found in schema')
      })

      it('handles validation errors gracefully', () => {
        const result = validateField(null, testData, 'full_name')
        
        expect(result.success).toBe(false)
        expect(result.error).toBe('Field validation failed')
      })
    })
  })

  describe('Schema Export Verification', () => {
    it('exports all schemas correctly', () => {
      expect(schemas).toHaveProperty('barberProfile')
      expect(schemas).toHaveProperty('barbershopWebsite')
      expect(schemas).toHaveProperty('enterpriseWebsite')
      
      expect(schemas.barberProfile).toBe(barberProfileSchema)
      expect(schemas.barbershopWebsite).toBe(barbershopWebsiteSchema)
      expect(schemas.enterpriseWebsite).toBe(enterpriseWebsiteSchema)
    })

    it('has properly typed schema functions', () => {
      expect(typeof barberProfileSchema.safeParse).toBe('function')
      expect(typeof barbershopWebsiteSchema.safeParse).toBe('function')
      expect(typeof enterpriseWebsiteSchema.safeParse).toBe('function')
    })
  })

  describe('Integration and Real-world Scenarios', () => {
    it('handles form submission workflow', () => {
      const formData = {
        full_name: 'John Doe',
        bio: 'Expert barber with 10+ years experience',
        phone: '+1234567890',
        instagram_handle: '@johndoebarber',
        years_experience: 12,
        services_offered: [
          { name: 'Haircut', price: 35, duration: 45 },
          { name: 'Beard Trim', price: 20, duration: 25 }
        ]
      }

      // Validate form
      const formValidation = validateForm(barberProfileSchema, formData)
      expect(formValidation.success).toBe(true)

      // Validate individual fields
      const nameValidation = validateField(barberProfileSchema, formData, 'full_name')
      expect(nameValidation.success).toBe(true)

      const experienceValidation = validateField(barberProfileSchema, formData, 'years_experience')
      expect(experienceValidation.success).toBe(true)
    })

    it('handles progressive form completion', () => {
      // Start with minimal data
      let formData = { full_name: 'Jane Smith' }
      let result = validateForm(barberProfileSchema, formData)
      expect(result.success).toBe(true)

      // Add bio
      formData = { ...formData, bio: 'Professional stylist' }
      result = validateForm(barberProfileSchema, formData)
      expect(result.success).toBe(true)

      // Add phone
      formData = { ...formData, phone: '+1987654321' }
      result = validateForm(barberProfileSchema, formData)
      expect(result.success).toBe(true)

      // Add services
      formData = {
        ...formData,
        services_offered: [
          { name: 'Cut & Style', price: 40, duration: 60 }
        ]
      }
      result = validateForm(barberProfileSchema, formData)
      expect(result.success).toBe(true)
    })

    it('handles data migration scenarios', () => {
      // Old format data
      const legacyData = {
        name: 'John Doe', // Old field name
        description: 'Barber', // Old field name
        phone_number: '+1234567890', // Old field name
        experience: 5 // Old field name
      }

      // Map to new format
      const migratedData = {
        full_name: legacyData.name,
        bio: legacyData.description,
        phone: legacyData.phone_number,
        years_experience: legacyData.experience
      }

      const result = validateForm(barberProfileSchema, migratedData)
      expect(result.success).toBe(true)
    })

    it('handles API response validation', () => {
      // Simulated API response
      const apiResponse = {
        full_name: 'John Doe',
        bio: 'Professional barber',
        phone: '+1234567890',
        instagram_handle: '@johndoe',
        years_experience: 8,
        profile_image_url: 'https://api.example.com/images/profile.jpg',
        portfolio_images: [
          'https://api.example.com/images/work1.jpg',
          'https://api.example.com/images/work2.jpg'
        ],
        services_offered: [
          { name: 'Haircut', price: 30, duration: 45 }
        ],
        created_at: '2023-01-01T00:00:00Z', // Extra field not in schema
        updated_at: '2023-12-01T00:00:00Z' // Extra field not in schema
      }

      const result = validateForm(barberProfileSchema, apiResponse)
      expect(result.success).toBe(true)
      // Schema should ignore extra fields not defined in schema
    })
  })
})
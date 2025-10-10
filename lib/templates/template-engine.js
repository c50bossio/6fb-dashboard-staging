'use client'

import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

// Template Categories aligned with Six Figure Barber methodology
export const TEMPLATE_CATEGORIES = {
  CLASSIC_BARBERSHOP: {
    id: 'classic_barbershop',
    name: 'Classic Barbershop',
    description: 'Traditional barbershop aesthetics with premium positioning',
    positioning: 'Heritage craftsmanship meets modern excellence'
  },
  MODERN_SALON: {
    id: 'modern_salon',
    name: 'Modern Salon',
    description: 'Contemporary design for progressive barbering businesses',
    positioning: 'Cutting-edge style and technique'
  },
  PREMIUM_SPA: {
    id: 'premium_spa',
    name: 'Premium Spa',
    description: 'Luxury spa-inspired templates for high-end services',
    positioning: 'Ultimate grooming experience and relaxation'
  },
  URBAN_CUTS: {
    id: 'urban_cuts',
    name: 'Urban Cuts',
    description: 'Street-smart design for urban barbershops',
    positioning: 'Fresh, dynamic, and trend-setting'
  },
  EXECUTIVE_GROOMING: {
    id: 'executive_grooming',
    name: 'Executive Grooming',
    description: 'Professional templates for executive clientele',
    positioning: 'Business professional grooming excellence'
  },
  ARTISTIC_STUDIO: {
    id: 'artistic_studio',
    name: 'Artistic Studio',
    description: 'Creative templates for artistic barbers',
    positioning: 'Hair artistry and creative expression'
  }
}

// Success Metrics for A/B Testing
export const SUCCESS_METRICS = {
  BOOKING_CONVERSION: 'booking_conversion',
  CONTACT_FORM_SUBMISSION: 'contact_form_submission',
  PHONE_CALLS: 'phone_calls',
  SOCIAL_MEDIA_CLICKS: 'social_media_clicks',
  SERVICE_PAGE_VIEWS: 'service_page_views',
  TIME_ON_SITE: 'time_on_site',
  RETURN_VISITOR_RATE: 'return_visitor_rate'
}

// 12+ Professional Templates following Six Figure Barber Methodology
export const PREMIUM_TEMPLATES = {
  // Classic Barbershop Templates
  HERITAGE_MASTER: {
    id: 'heritage_master',
    name: 'Heritage Master',
    description: 'Classic barbershop with heritage branding and premium positioning',
    category: TEMPLATE_CATEGORIES.CLASSIC_BARBERSHOP.id,
    colorScheme: {
      primary: '#1a1a1a',
      secondary: '#8B4513',
      accent: '#DAA520',
      background: '#F5F5DC',
      text: '#2C2C2C'
    },
    typography: {
      headingFont: 'Playfair Display',
      bodyFont: 'Source Sans Pro',
      accentFont: 'Cinzel'
    },
    features: {
      premiumBranding: true,
      testimonialSection: true,
      serviceShowcase: true,
      masterBarberProfiles: true,
      heritageStory: true,
      appointmentBooking: true,
      socialProof: true,
      contactForm: true
    },
    sixFigureAlignment: {
      positioning: 'Master Craftsman Heritage',
      valueProposition: 'Generations of barbering excellence passed down through traditional techniques',
      targetClient: 'Discerning gentlemen who value quality and tradition',
      pricingStrategy: 'Premium heritage pricing with master barber premium',
      revenueOptimization: 'Focus on master services and heritage experience packages',
      clientRetention: 'Emphasis on tradition, consistency, and master-level service'
    },
    layout: {
      hero: 'fullscreen_video',
      navigation: 'classic_horizontal',
      sections: ['hero', 'about', 'services', 'masters', 'heritage', 'testimonials', 'contact'],
      footer: 'comprehensive'
    },
    analytics: {
      conversionRate: 0.18,
      usageCount: 1247,
      popularityScore: 0.92,
      averageRevenue: 145
    }
  },

  GENTLEMAN_CLUB: {
    id: 'gentleman_club',
    name: 'Gentleman Club',
    description: 'Exclusive club-inspired design for premium barbering services',
    category: TEMPLATE_CATEGORIES.CLASSIC_BARBERSHOP.id,
    colorScheme: {
      primary: '#2C1810',
      secondary: '#8B0000',
      accent: '#CD853F',
      background: '#FFF8DC',
      text: '#4A4A4A'
    },
    typography: {
      headingFont: 'Crimson Text',
      bodyFont: 'Lato',
      accentFont: 'Old Standard TT'
    },
    features: {
      membershipProgram: true,
      exclusiveServices: true,
      gentlemenLounge: true,
      cigarBar: true,
      privateBooking: true,
      conciergeService: true,
      loyaltyProgram: true,
      vipExperience: true
    },
    sixFigureAlignment: {
      positioning: 'Exclusive Gentleman\'s Experience',
      valueProposition: 'Private club atmosphere with world-class grooming services',
      targetClient: 'High-net-worth individuals seeking exclusive experiences',
      pricingStrategy: 'Ultra-premium membership and service pricing',
      revenueOptimization: 'Membership fees, exclusive packages, and premium add-ons',
      clientRetention: 'Exclusive membership benefits and VIP treatment'
    },
    layout: {
      hero: 'parallax_luxury',
      navigation: 'elegant_sidebar',
      sections: ['hero', 'membership', 'services', 'lounge', 'masters', 'booking', 'contact'],
      footer: 'minimal_elegant'
    },
    analytics: {
      conversionRate: 0.22,
      usageCount: 892,
      popularityScore: 0.88,
      averageRevenue: 275
    }
  },

  // Modern Salon Templates
  MINIMALIST_PRO: {
    id: 'minimalist_pro',
    name: 'Minimalist Pro',
    description: 'Clean, modern design focusing on professional excellence',
    category: TEMPLATE_CATEGORIES.MODERN_SALON.id,
    colorScheme: {
      primary: '#000000',
      secondary: '#4A90E2',
      accent: '#50C878',
      background: '#FFFFFF',
      text: '#333333'
    },
    typography: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
      accentFont: 'Space Grotesk'
    },
    features: {
      cleanDesign: true,
      mobileOptimized: true,
      fastLoading: true,
      modernBooking: true,
      serviceCalculator: true,
      socialIntegration: true,
      blogSection: true,
      seoOptimized: true
    },
    sixFigureAlignment: {
      positioning: 'Modern Professional Excellence',
      valueProposition: 'Precision cutting and contemporary styling with technical expertise',
      targetClient: 'Modern professionals who appreciate clean aesthetics and efficiency',
      pricingStrategy: 'Professional service pricing with technical skill premiums',
      revenueOptimization: 'Efficiency-based booking and modern service packages',
      clientRetention: 'Consistent quality and modern convenience'
    },
    layout: {
      hero: 'split_screen',
      navigation: 'minimal_horizontal',
      sections: ['hero', 'services', 'booking', 'portfolio', 'about', 'contact'],
      footer: 'modern_compact'
    },
    analytics: {
      conversionRate: 0.24,
      usageCount: 1856,
      popularityScore: 0.95,
      averageRevenue: 95
    }
  },

  TECH_FORWARD: {
    id: 'tech_forward',
    name: 'Tech Forward',
    description: 'Technology-focused template with smart booking and digital features',
    category: TEMPLATE_CATEGORIES.MODERN_SALON.id,
    colorScheme: {
      primary: '#1E3A8A',
      secondary: '#10B981',
      accent: '#F59E0B',
      background: '#F8FAFC',
      text: '#1F2937'
    },
    typography: {
      headingFont: 'Poppins',
      bodyFont: 'Inter',
      accentFont: 'JetBrains Mono'
    },
    features: {
      smartBooking: true,
      aiRecommendations: true,
      digitalWallet: true,
      appointmentReminders: true,
      virtualConsultation: true,
      appIntegration: true,
      chatBot: true,
      analytics: true
    },
    sixFigureAlignment: {
      positioning: 'Technology-Enhanced Barbering',
      valueProposition: 'Cutting-edge technology meets traditional barbering excellence',
      targetClient: 'Tech-savvy professionals who value innovation and convenience',
      pricingStrategy: 'Technology premium with smart service bundling',
      revenueOptimization: 'Automated upselling and intelligent service recommendations',
      clientRetention: 'Seamless digital experience and predictive service needs'
    },
    layout: {
      hero: 'interactive_demo',
      navigation: 'smart_sticky',
      sections: ['hero', 'technology', 'services', 'booking', 'app', 'testimonials', 'contact'],
      footer: 'tech_comprehensive'
    },
    analytics: {
      conversionRate: 0.28,
      usageCount: 743,
      popularityScore: 0.87,
      averageRevenue: 125
    }
  },

  // Premium Spa Templates
  LUXURY_RETREAT: {
    id: 'luxury_retreat',
    name: 'Luxury Retreat',
    description: 'High-end spa experience with luxury positioning and premium services',
    category: TEMPLATE_CATEGORIES.PREMIUM_SPA.id,
    colorScheme: {
      primary: '#2D3748',
      secondary: '#B794F6',
      accent: '#ED8936',
      background: '#F7FAFC',
      text: '#4A5568'
    },
    typography: {
      headingFont: 'Cormorant Garamond',
      bodyFont: 'Source Sans Pro',
      accentFont: 'Dancing Script'
    },
    features: {
      luxuryExperience: true,
      spaServices: true,
      packageDeals: true,
      giftCards: true,
      membershipTiers: true,
      relaxationArea: true,
      premiumProducts: true,
      concierge: true
    },
    sixFigureAlignment: {
      positioning: 'Ultimate Luxury Grooming Experience',
      valueProposition: 'Spa-level relaxation with expert barbering in a luxury environment',
      targetClient: 'Affluent clients seeking premium grooming experiences',
      pricingStrategy: 'Luxury spa pricing with experience-based packages',
      revenueOptimization: 'High-margin packages, memberships, and premium add-ons',
      clientRetention: 'Luxury experience and comprehensive service packages'
    },
    layout: {
      hero: 'luxury_carousel',
      navigation: 'elegant_overlay',
      sections: ['hero', 'experience', 'services', 'packages', 'amenities', 'booking', 'contact'],
      footer: 'luxury_detailed'
    },
    analytics: {
      conversionRate: 0.19,
      usageCount: 564,
      popularityScore: 0.91,
      averageRevenue: 185
    }
  },

  WELLNESS_SPA: {
    id: 'wellness_spa',
    name: 'Wellness Spa',
    description: 'Holistic wellness approach with therapeutic services and calm aesthetics',
    category: TEMPLATE_CATEGORIES.PREMIUM_SPA.id,
    colorScheme: {
      primary: '#2F855A',
      secondary: '#4FD1C7',
      accent: '#F6AD55',
      background: '#F0FFF4',
      text: '#2D3748'
    },
    typography: {
      headingFont: 'Libre Baskerville',
      bodyFont: 'Open Sans',
      accentFont: 'Great Vibes'
    },
    features: {
      holisticServices: true,
      wellnessPrograms: true,
      therapeuticTreatments: true,
      naturalProducts: true,
      mindfulnessArea: true,
      healthConsultation: true,
      customTherapy: true,
      wellnessTracking: true
    },
    sixFigureAlignment: {
      positioning: 'Holistic Wellness and Grooming',
      valueProposition: 'Complete wellness journey combining grooming with therapeutic benefits',
      targetClient: 'Health-conscious individuals seeking holistic grooming experiences',
      pricingStrategy: 'Wellness premium with therapeutic service bundles',
      revenueOptimization: 'Multi-session programs and wellness package subscriptions',
      clientRetention: 'Ongoing wellness relationships and program continuity'
    },
    layout: {
      hero: 'nature_inspired',
      navigation: 'organic_flow',
      sections: ['hero', 'wellness', 'services', 'programs', 'natural', 'booking', 'resources', 'contact'],
      footer: 'wellness_resources'
    },
    analytics: {
      conversionRate: 0.21,
      usageCount: 428,
      popularityScore: 0.85,
      averageRevenue: 155
    }
  },

  // Urban Cuts Templates
  STREET_STYLE: {
    id: 'street_style',
    name: 'Street Style',
    description: 'Urban-inspired design with bold graphics and contemporary edge',
    category: TEMPLATE_CATEGORIES.URBAN_CUTS.id,
    colorScheme: {
      primary: '#1A202C',
      secondary: '#E53E3E',
      accent: '#FBD38D',
      background: '#F7FAFC',
      text: '#2D3748'
    },
    typography: {
      headingFont: 'Oswald',
      bodyFont: 'Roboto',
      accentFont: 'Bangers'
    },
    features: {
      boldGraphics: true,
      streetArt: true,
      musicIntegration: true,
      socialWall: true,
      eventBooking: true,
      communityBoard: true,
      influencerPartners: true,
      streetwear: true
    },
    sixFigureAlignment: {
      positioning: 'Urban Culture and Style Authority',
      valueProposition: 'Street-smart styling with cultural authenticity and trend expertise',
      targetClient: 'Young urban professionals and culture enthusiasts',
      pricingStrategy: 'Trend-based pricing with cultural style premiums',
      revenueOptimization: 'Limited edition cuts, culture events, and brand collaborations',
      clientRetention: 'Cultural community engagement and trend leadership'
    },
    layout: {
      hero: 'dynamic_video',
      navigation: 'urban_mobile',
      sections: ['hero', 'culture', 'services', 'community', 'events', 'booking', 'contact'],
      footer: 'social_heavy'
    },
    analytics: {
      conversionRate: 0.26,
      usageCount: 892,
      popularityScore: 0.89,
      averageRevenue: 85
    }
  },

  FRESH_CUTS: {
    id: 'fresh_cuts',
    name: 'Fresh Cuts',
    description: 'Vibrant and energetic design for trendy urban barbershops',
    category: TEMPLATE_CATEGORIES.URBAN_CUTS.id,
    colorScheme: {
      primary: '#065F46',
      secondary: '#DC2626',
      accent: '#F59E0B',
      background: '#ECFDF5',
      text: '#111827'
    },
    typography: {
      headingFont: 'Bebas Neue',
      bodyFont: 'Nunito Sans',
      accentFont: 'Righteous'
    },
    features: {
      vibrantDesign: true,
      freshStyles: true,
      quickBooking: true,
      walkInQueue: true,
      styleGallery: true,
      trendingCuts: true,
      youthPrograms: true,
      groupBookings: true
    },
    sixFigureAlignment: {
      positioning: 'Fresh Trends and Dynamic Style',
      valueProposition: 'Cutting-edge trends with energetic atmosphere and fast service',
      targetClient: 'Style-conscious youth and trend-focused professionals',
      pricingStrategy: 'Dynamic pricing based on demand and trend popularity',
      revenueOptimization: 'High-volume efficiency with premium trend services',
      clientRetention: 'Trend leadership and community engagement'
    },
    layout: {
      hero: 'energetic_animation',
      navigation: 'dynamic_scroll',
      sections: ['hero', 'trends', 'services', 'gallery', 'booking', 'community', 'contact'],
      footer: 'vibrant_social'
    },
    analytics: {
      conversionRate: 0.31,
      usageCount: 1342,
      popularityScore: 0.93,
      averageRevenue: 75
    }
  },

  // Executive Grooming Templates
  BUSINESS_CLASS: {
    id: 'business_class',
    name: 'Business Class',
    description: 'Professional template designed for executive clientele and corporate services',
    category: TEMPLATE_CATEGORIES.EXECUTIVE_GROOMING.id,
    colorScheme: {
      primary: '#1E3A8A',
      secondary: '#374151',
      accent: '#D97706',
      background: '#F9FAFB',
      text: '#111827'
    },
    typography: {
      headingFont: 'Merriweather',
      bodyFont: 'Source Sans Pro',
      accentFont: 'Lora'
    },
    features: {
      executiveServices: true,
      corporatePackages: true,
      businessHours: true,
      expressServices: true,
      corporateAccounts: true,
      executiveLounge: true,
      businessPartnerships: true,
      invoicing: true
    },
    sixFigureAlignment: {
      positioning: 'Executive Grooming Excellence',
      valueProposition: 'Professional grooming services tailored for business leaders',
      targetClient: 'C-level executives and senior business professionals',
      pricingStrategy: 'Executive premium with time-efficient service packages',
      revenueOptimization: 'Corporate accounts, retainer packages, and executive memberships',
      clientRetention: 'Professional consistency and executive-level service'
    },
    layout: {
      hero: 'professional_split',
      navigation: 'business_horizontal',
      sections: ['hero', 'executive', 'services', 'corporate', 'team', 'booking', 'contact'],
      footer: 'professional_detailed'
    },
    analytics: {
      conversionRate: 0.16,
      usageCount: 675,
      popularityScore: 0.84,
      averageRevenue: 195
    }
  },

  CORPORATE_ELITE: {
    id: 'corporate_elite',
    name: 'Corporate Elite',
    description: 'Ultra-professional design for high-end corporate grooming services',
    category: TEMPLATE_CATEGORIES.EXECUTIVE_GROOMING.id,
    colorScheme: {
      primary: '#0F172A',
      secondary: '#475569',
      accent: '#0EA5E9',
      background: '#F8FAFC',
      text: '#1E293B'
    },
    typography: {
      headingFont: 'Playfair Display',
      bodyFont: 'Inter',
      accentFont: 'Crimson Text'
    },
    features: {
      eliteServices: true,
      boardroomReady: true,
      executiveMembership: true,
      conciergeGrooming: true,
      corporateEvents: true,
      imageConsulting: true,
      wardrobeAdvice: true,
      networkingEvents: true
    },
    sixFigureAlignment: {
      positioning: 'Corporate Elite Image Management',
      valueProposition: 'Complete image consulting and grooming for corporate leaders',
      targetClient: 'Top-tier executives and board members',
      pricingStrategy: 'Ultra-premium with comprehensive image management packages',
      revenueOptimization: 'High-value retainers, image consulting, and elite memberships',
      clientRetention: 'Comprehensive image management and elite network benefits'
    },
    layout: {
      hero: 'elite_showcase',
      navigation: 'executive_sidebar',
      sections: ['hero', 'elite', 'services', 'consulting', 'network', 'membership', 'contact'],
      footer: 'corporate_comprehensive'
    },
    analytics: {
      conversionRate: 0.13,
      usageCount: 298,
      popularityScore: 0.87,
      averageRevenue: 325
    }
  },

  // Artistic Studio Templates
  CREATIVE_STUDIO: {
    id: 'creative_studio',
    name: 'Creative Studio',
    description: 'Artistic template showcasing creative hair artistry and unique designs',
    category: TEMPLATE_CATEGORIES.ARTISTIC_STUDIO.id,
    colorScheme: {
      primary: '#7C2D12',
      secondary: '#DB2777',
      accent: '#F59E0B',
      background: '#FEF3C7',
      text: '#78350F'
    },
    typography: {
      headingFont: 'Abril Fatface',
      bodyFont: 'Nunito',
      accentFont: 'Pacifico'
    },
    features: {
      artisticPortfolio: true,
      customDesigns: true,
      colorSpecialist: true,
      artistCollaboration: true,
      creativeConsultation: true,
      artGallery: true,
      workshopEvents: true,
      artistBio: true
    },
    sixFigureAlignment: {
      positioning: 'Hair Artistry and Creative Expression',
      valueProposition: 'Unique artistic vision bringing creative hair concepts to life',
      targetClient: 'Creative individuals seeking artistic expression and unique styles',
      pricingStrategy: 'Artistic premium with custom creation surcharges',
      revenueOptimization: 'Custom art pieces, artistic consultation, and creative workshops',
      clientRetention: 'Artistic relationships and creative journey partnerships'
    },
    layout: {
      hero: 'artistic_gallery',
      navigation: 'creative_flow',
      sections: ['hero', 'artistry', 'portfolio', 'services', 'artist', 'workshops', 'booking', 'contact'],
      footer: 'artistic_showcase'
    },
    analytics: {
      conversionRate: 0.22,
      usageCount: 456,
      popularityScore: 0.82,
      averageRevenue: 135
    }
  },

  AVANT_GARDE: {
    id: 'avant_garde',
    name: 'Avant Garde',
    description: 'Cutting-edge artistic template for experimental and fashion-forward barbering',
    category: TEMPLATE_CATEGORIES.ARTISTIC_STUDIO.id,
    colorScheme: {
      primary: '#4C1D95',
      secondary: '#BE185D',
      accent: '#059669',
      background: '#FAF5FF',
      text: '#581C87'
    },
    typography: {
      headingFont: 'Orbitron',
      bodyFont: 'Space Grotesk',
      accentFont: 'Audiowide'
    },
    features: {
      experimentalDesigns: true,
      fashionForward: true,
      conceptualArt: true,
      runwayReady: true,
      fashionWeekPrep: true,
      editorialWork: true,
      avantGardePortfolio: true,
      fashionPartnerships: true
    },
    sixFigureAlignment: {
      positioning: 'Avant-Garde Fashion and Hair Art',
      valueProposition: 'Experimental artistry pushing boundaries of hair design and fashion',
      targetClient: 'Fashion industry professionals and artistic risk-takers',
      pricingStrategy: 'Experimental art pricing with fashion industry premiums',
      revenueOptimization: 'Fashion collaborations, editorial work, and experimental sessions',
      clientRetention: 'Artistic evolution and fashion industry networking'
    },
    layout: {
      hero: 'experimental_showcase',
      navigation: 'avant_garde_flow',
      sections: ['hero', 'experimental', 'fashion', 'portfolio', 'collaborations', 'booking', 'contact'],
      footer: 'fashion_network'
    },
    analytics: {
      conversionRate: 0.18,
      usageCount: 234,
      popularityScore: 0.79,
      averageRevenue: 165
    }
  }
}

// Template Engine Class
class TemplateEngine {
  constructor() {
    this.supabase = createClient()
    this.templates = PREMIUM_TEMPLATES
    this.categories = TEMPLATE_CATEGORIES
  }

  // Get all templates with analytics data
  async getTemplatesWithAnalytics() {
    try {
      const { data: analyticsData, error } = await this.supabase
        .from('template_analytics')
        .select('*')
      
      if (error) {
        console.error('Error loading analytics:', error)
      }

      // Merge templates with analytics data
      return Object.values(this.templates).map(template => ({
        ...template,
        analytics: {
          ...template.analytics,
          ...(analyticsData?.find(a => a.template_id === template.id) || {})
        }
      }))
    } catch (error) {
      console.error('Error getting templates with analytics:', error)
      return Object.values(this.templates)
    }
  }

  // Get personalized recommendations for a user
  async getRecommendations(userId) {
    try {
      // Get user's profile and preferences
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('role, preferences, business_type, target_clients')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error loading user profile:', error)
        return this.getDefaultRecommendations()
      }

      // AI-powered recommendation logic based on Six Figure Barber methodology
      const recommendations = this.calculateRecommendations(profile)
      
      return recommendations
    } catch (error) {
      console.error('Error getting recommendations:', error)
      return this.getDefaultRecommendations()
    }
  }

  // Calculate recommendations based on user profile
  calculateRecommendations(profile) {
    const templates = Object.values(this.templates)
    const scoredTemplates = templates.map(template => ({
      ...template,
      recommendationScore: this.calculateRecommendationScore(template, profile)
    }))

    return scoredTemplates
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 6)
  }

  // Calculate recommendation score using Six Figure Barber methodology
  calculateRecommendationScore(template, profile) {
    let score = 0

    // Role-based scoring
    if (profile.role === 'ENTERPRISE_OWNER' && template.category === 'executive_grooming') {
      score += 30
    } else if (profile.role === 'SHOP_OWNER' && template.category === 'classic_barbershop') {
      score += 25
    } else if (profile.role === 'BARBER' && template.category === 'artistic_studio') {
      score += 20
    }

    // Business type alignment
    if (profile.business_type === 'luxury' && template.category === 'premium_spa') {
      score += 25
    } else if (profile.business_type === 'modern' && template.category === 'modern_salon') {
      score += 20
    } else if (profile.business_type === 'traditional' && template.category === 'classic_barbershop') {
      score += 20
    }

    // Target client alignment
    if (profile.target_clients?.includes('executives') && template.category === 'executive_grooming') {
      score += 20
    } else if (profile.target_clients?.includes('young_professionals') && template.category === 'urban_cuts') {
      score += 15
    }

    // Performance metrics
    score += (template.analytics.conversionRate * 50) // Up to 50 points for high conversion
    score += Math.min(template.analytics.popularityScore * 20, 20) // Up to 20 points for popularity

    // Six Figure Barber methodology alignment
    if (template.sixFigureAlignment.positioning.includes('Premium') || 
        template.sixFigureAlignment.positioning.includes('Excellence')) {
      score += 15
    }

    return score
  }

  // Get default recommendations when user data is not available
  getDefaultRecommendations() {
    const topPerformers = Object.values(this.templates)
      .sort((a, b) => (b.analytics.conversionRate + b.analytics.popularityScore) - 
                     (a.analytics.conversionRate + a.analytics.popularityScore))
      .slice(0, 3)

    return topPerformers
  }

  // Apply template to user's customization settings
  async applyTemplate(userId, templateId) {
    try {
      const template = this.templates[templateId]
      if (!template) {
        return { success: false, error: 'Template not found' }
      }

      // Convert template to customization settings
      const customizationSettings = this.convertTemplateToSettings(template)

      // Save to database
      const { error: updateError } = await this.supabase
        .from('profiles')
        .update({
          customization_settings: customizationSettings,
          template_id: templateId,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Error saving template:', updateError)
        return { success: false, error: 'Failed to save template settings' }
      }

      // Track template usage analytics
      await this.trackTemplateUsage(templateId, userId)

      return { 
        success: true, 
        settings: customizationSettings,
        template: template
      }
    } catch (error) {
      console.error('Error applying template:', error)
      return { success: false, error: 'Failed to apply template' }
    }
  }

  // Convert template to customization settings format
  convertTemplateToSettings(template) {
    return {
      // Color scheme
      colors: template.colorScheme,
      
      // Typography
      fonts: template.typography,
      
      // Layout configuration
      layout: template.layout,
      
      // Feature toggles
      features: template.features,
      
      // Six Figure Barber methodology settings
      sixFigureSettings: {
        positioning: template.sixFigureAlignment.positioning,
        valueProposition: template.sixFigureAlignment.valueProposition,
        targetClient: template.sixFigureAlignment.targetClient,
        pricingStrategy: template.sixFigureAlignment.pricingStrategy
      },
      
      // Template metadata
      templateId: template.id,
      templateName: template.name,
      category: template.category,
      appliedAt: new Date().toISOString()
    }
  }

  // Track template usage for analytics
  async trackTemplateUsage(templateId, userId) {
    try {
      const { error } = await this.supabase
        .from('template_usage')
        .insert({
          template_id: templateId,
          user_id: userId,
          applied_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error tracking template usage:', error)
      }
    } catch (error) {
      console.error('Error tracking template usage:', error)
    }
  }

  // Get template by ID
  getTemplate(templateId) {
    return this.templates[templateId] || null
  }

  // Get templates by category
  getTemplatesByCategory(categoryId) {
    return Object.values(this.templates).filter(template => template.category === categoryId)
  }

  // Search templates
  searchTemplates(query) {
    const lowerQuery = query.toLowerCase()
    return Object.values(this.templates).filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.sixFigureAlignment.positioning.toLowerCase().includes(lowerQuery) ||
      template.sixFigureAlignment.valueProposition.toLowerCase().includes(lowerQuery)
    )
  }

  // Export template configuration
  exportTemplate(templateId) {
    const template = this.getTemplate(templateId)
    if (!template) return null

    return {
      ...template,
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0'
    }
  }

  // Import custom template
  async importTemplate(userId, templateData) {
    try {
      // Validate template structure
      if (!this.validateTemplateStructure(templateData)) {
        return { success: false, error: 'Invalid template structure' }
      }

      // Generate unique ID for custom template
      const customId = `custom_${Date.now()}_${userId.substring(0, 8)}`
      
      const customTemplate = {
        ...templateData,
        id: customId,
        isCustom: true,
        createdBy: userId,
        createdAt: new Date().toISOString()
      }

      // Save custom template
      const { error } = await this.supabase
        .from('custom_templates')
        .insert(customTemplate)

      if (error) {
        console.error('Error saving custom template:', error)
        return { success: false, error: 'Failed to save custom template' }
      }

      return { success: true, templateId: customId }
    } catch (error) {
      console.error('Error importing template:', error)
      return { success: false, error: 'Failed to import template' }
    }
  }

  // Validate template structure
  validateTemplateStructure(template) {
    const requiredFields = [
      'name', 'description', 'category', 'colorScheme', 
      'typography', 'features', 'sixFigureAlignment', 'layout'
    ]

    return requiredFields.every(field => 
      template.hasOwnProperty(field) && template[field] !== null && template[field] !== undefined
    )
  }
}

// Export singleton instance
export const templateEngine = new TemplateEngine()

// A/B Testing Integration
export const TEST_TYPES = {
  COLOR_SCHEME: 'color_scheme',
  LAYOUT_STRUCTURE: 'layout_structure', 
  TYPOGRAPHY: 'typography',
  CONTENT_POSITIONING: 'content_positioning',
  CALL_TO_ACTION: 'call_to_action',
  PRICING_DISPLAY: 'pricing_display',
  SERVICE_PRESENTATION: 'service_presentation',
  BOOKING_FLOW: 'booking_flow'
}

// Template Import/Export utilities
export const TemplateUtils = {
  // Generate shareable template link
  generateShareLink: (templateId) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/templates/shared/${templateId}`
  },

  // Calculate template compatibility score
  calculateCompatibilityScore: (template1, template2) => {
    let score = 0
    
    // Category compatibility
    if (template1.category === template2.category) score += 30
    
    // Color scheme similarity
    const colorSimilarity = TemplateUtils.calculateColorSimilarity(
      template1.colorScheme, template2.colorScheme
    )
    score += colorSimilarity * 25
    
    // Feature overlap
    const featureOverlap = TemplateUtils.calculateFeatureOverlap(
      template1.features, template2.features
    )
    score += featureOverlap * 25
    
    // Six Figure alignment similarity  
    if (template1.sixFigureAlignment.positioning === template2.sixFigureAlignment.positioning) {
      score += 20
    }
    
    return Math.min(score, 100)
  },

  // Calculate color scheme similarity
  calculateColorSimilarity: (colors1, colors2) => {
    // Simplified color similarity calculation
    // In a real implementation, you'd use proper color distance algorithms
    const keys = ['primary', 'secondary', 'accent']
    let similarity = 0
    
    keys.forEach(key => {
      if (colors1[key] === colors2[key]) {
        similarity += 1
      }
    })
    
    return similarity / keys.length
  },

  // Calculate feature overlap percentage
  calculateFeatureOverlap: (features1, features2) => {
    const keys1 = Object.keys(features1)
    const keys2 = Object.keys(features2)
    const allKeys = new Set([...keys1, ...keys2])
    
    let overlap = 0
    allKeys.forEach(key => {
      if (features1[key] === features2[key]) {
        overlap += 1
      }
    })
    
    return overlap / allKeys.size
  }
}
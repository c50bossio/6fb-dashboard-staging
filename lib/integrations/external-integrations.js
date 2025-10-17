/**
 * External Integrations System for 6FB AI Agent System
 * Handles Canva, Google My Business, and other third-party integrations
 * with Six Figure Barber methodology alignment
 */

import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

// Integration Types
export const INTEGRATION_TYPES = {
  CANVA: 'canva',
  GOOGLE_MY_BUSINESS: 'google_my_business',
  FIGMA: 'figma',
  ADOBE_CREATIVE: 'adobe_creative',
  SOCIAL_MEDIA: 'social_media',
  MARKETING_TOOLS: 'marketing_tools'
}

// Integration Status
export const INTEGRATION_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  PENDING: 'pending',
  SYNCING: 'syncing'
}

class ExternalIntegrationsManager {
  constructor() {
    this.supabase = createClient()
    this.integrations = new Map()
    this.webhookHandlers = new Map()
  }

  /**
   * Initialize integration connections
   */
  async initialize(userId) {
    try {
      const { data: connections } = await this.supabase
        .from('external_integrations')
        .select('*')
        .eq('user_id', userId)

      if (connections) {
        connections.forEach(connection => {
          this.integrations.set(connection.integration_type, {
            ...connection,
            handler: this.getIntegrationHandler(connection.integration_type)
          })
        })
      }

      return { success: true, integrations: connections || [] }
    } catch (error) {
      console.error('Error initializing integrations:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get integration handler by type
   */
  getIntegrationHandler(integrationType) {
    switch (integrationType) {
      case INTEGRATION_TYPES.CANVA:
        return new CanvaIntegration()
      case INTEGRATION_TYPES.GOOGLE_MY_BUSINESS:
        return new GoogleMyBusinessIntegration()
      case INTEGRATION_TYPES.FIGMA:
        return new FigmaIntegration()
      case INTEGRATION_TYPES.ADOBE_CREATIVE:
        return new AdobeCreativeIntegration()
      default:
        return new BaseIntegration()
    }
  }

  /**
   * Connect to external service
   */
  async connectIntegration(userId, integrationType, credentials, config = {}) {
    try {
      const handler = this.getIntegrationHandler(integrationType)
      
      // Test connection
      const testResult = await handler.testConnection(credentials)
      if (!testResult.success) {
        return { success: false, error: 'Connection test failed: ' + testResult.error }
      }

      // Store integration
      const { data, error } = await this.supabase
        .from('external_integrations')
        .upsert({
          user_id: userId,
          integration_type: integrationType,
          status: INTEGRATION_STATUS.CONNECTED,
          credentials: this.encryptCredentials(credentials),
          config,
          last_sync: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Cache integration
      this.integrations.set(integrationType, {
        ...data,
        handler
      })

      // Initialize sync
      await this.performInitialSync(userId, integrationType)

      return { success: true, integration: data }
    } catch (error) {
      console.error('Error connecting integration:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Disconnect integration
   */
  async disconnectIntegration(userId, integrationType) {
    try {
      const { error } = await this.supabase
        .from('external_integrations')
        .update({
          status: INTEGRATION_STATUS.DISCONNECTED,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('integration_type', integrationType)

      if (error) throw error

      this.integrations.delete(integrationType)

      return { success: true }
    } catch (error) {
      console.error('Error disconnecting integration:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Sync data from external integration
   */
  async syncIntegration(userId, integrationType) {
    try {
      const integration = this.integrations.get(integrationType)
      if (!integration || integration.status !== INTEGRATION_STATUS.CONNECTED) {
        return { success: false, error: 'Integration not connected' }
      }

      // Update status to syncing
      await this.updateIntegrationStatus(userId, integrationType, INTEGRATION_STATUS.SYNCING)

      // Perform sync
      const syncResult = await integration.handler.sync(
        this.decryptCredentials(integration.credentials),
        integration.config
      )

      if (syncResult.success) {
        // Store synced data
        await this.storeSyncedData(userId, integrationType, syncResult.data)
        
        // Update last sync time
        await this.supabase
          .from('external_integrations')
          .update({
            status: INTEGRATION_STATUS.CONNECTED,
            last_sync: new Date().toISOString(),
            sync_count: (integration.sync_count || 0) + 1
          })
          .eq('user_id', userId)
          .eq('integration_type', integrationType)
      } else {
        await this.updateIntegrationStatus(userId, integrationType, INTEGRATION_STATUS.ERROR)
      }

      return syncResult
    } catch (error) {
      console.error('Error syncing integration:', error)
      await this.updateIntegrationStatus(userId, integrationType, INTEGRATION_STATUS.ERROR)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get available templates from external service
   */
  async getExternalTemplates(userId, integrationType, filters = {}) {
    try {
      const integration = this.integrations.get(integrationType)
      if (!integration) {
        return { success: false, error: 'Integration not found' }
      }

      const credentials = this.decryptCredentials(integration.credentials)
      return await integration.handler.getTemplates(credentials, filters)
    } catch (error) {
      console.error('Error getting external templates:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Import design from external service
   */
  async importDesign(userId, integrationType, designId, importOptions = {}) {
    try {
      const integration = this.integrations.get(integrationType)
      if (!integration) {
        return { success: false, error: 'Integration not found' }
      }

      const credentials = this.decryptCredentials(integration.credentials)
      const importResult = await integration.handler.importDesign(
        credentials,
        designId,
        importOptions
      )

      if (importResult.success) {
        // Store imported design
        await this.storeImportedDesign(userId, integrationType, importResult.design)
        
        // Track usage
        await this.trackIntegrationUsage(userId, integrationType, 'import_design')
      }

      return importResult
    } catch (error) {
      console.error('Error importing design:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Export design to external service
   */
  async exportDesign(userId, integrationType, designData, exportOptions = {}) {
    try {
      const integration = this.integrations.get(integrationType)
      if (!integration) {
        return { success: false, error: 'Integration not found' }
      }

      const credentials = this.decryptCredentials(integration.credentials)
      const exportResult = await integration.handler.exportDesign(
        credentials,
        designData,
        exportOptions
      )

      if (exportResult.success) {
        // Track usage
        await this.trackIntegrationUsage(userId, integrationType, 'export_design')
      }

      return exportResult
    } catch (error) {
      console.error('Error exporting design:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Generate social media preview
   */
  async generateSocialPreview(userId, designData, platforms = ['instagram', 'facebook']) {
    try {
      const previews = {}
      
      for (const platform of platforms) {
        const dimensions = this.getSocialMediaDimensions(platform)
        const preview = await this.renderPreview(designData, dimensions)
        previews[platform] = preview
      }

      return { success: true, previews }
    } catch (error) {
      console.error('Error generating social previews:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get social media dimensions
   */
  getSocialMediaDimensions(platform) {
    const dimensions = {
      instagram: {
        post: { width: 1080, height: 1080 },
        story: { width: 1080, height: 1920 },
        reel: { width: 1080, height: 1920 }
      },
      facebook: {
        post: { width: 1200, height: 630 },
        cover: { width: 1640, height: 859 },
        event: { width: 1920, height: 1080 }
      },
      twitter: {
        post: { width: 1200, height: 675 },
        header: { width: 1500, height: 500 }
      },
      linkedin: {
        post: { width: 1200, height: 627 },
        cover: { width: 1584, height: 396 }
      }
    }

    return dimensions[platform] || dimensions.instagram
  }

  /**
   * Perform initial sync after connection
   */
  async performInitialSync(userId, integrationType) {
    try {
      // Get integration-specific initial sync data
      const integration = this.integrations.get(integrationType)
      if (!integration) return

      const credentials = this.decryptCredentials(integration.credentials)
      const initialData = await integration.handler.getInitialSyncData(credentials)

      if (initialData.success) {
        await this.storeSyncedData(userId, integrationType, initialData.data)
      }
    } catch (error) {
      console.error('Error performing initial sync:', error)
    }
  }

  /**
   * Store synced data from integration
   */
  async storeSyncedData(userId, integrationType, data) {
    try {
      await this.supabase
        .from('integration_sync_data')
        .upsert({
          user_id: userId,
          integration_type: integrationType,
          data,
          synced_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error storing synced data:', error)
    }
  }

  /**
   * Store imported design
   */
  async storeImportedDesign(userId, integrationType, design) {
    try {
      await this.supabase
        .from('imported_designs')
        .insert({
          user_id: userId,
          integration_type: integrationType,
          external_id: design.id,
          name: design.name,
          data: design,
          imported_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error storing imported design:', error)
    }
  }

  /**
   * Track integration usage
   */
  async trackIntegrationUsage(userId, integrationType, action) {
    try {
      await this.supabase
        .from('integration_usage')
        .insert({
          user_id: userId,
          integration_type: integrationType,
          action,
          timestamp: new Date().toISOString()
        })
    } catch (error) {
      console.error('Error tracking integration usage:', error)
    }
  }

  /**
   * Update integration status
   */
  async updateIntegrationStatus(userId, integrationType, status) {
    try {
      await this.supabase
        .from('external_integrations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('integration_type', integrationType)
    } catch (error) {
      console.error('Error updating integration status:', error)
    }
  }

  /**
   * Encrypt credentials (simplified - use proper encryption in production)
   */
  encryptCredentials(credentials) {
    // In production, use proper encryption
    return btoa(JSON.stringify(credentials))
  }

  /**
   * Decrypt credentials (simplified - use proper decryption in production)
   */
  decryptCredentials(encryptedCredentials) {
    // In production, use proper decryption
    try {
      return JSON.parse(atob(encryptedCredentials))
    } catch (error) {
      console.error('Error decrypting credentials:', error)
      return {}
    }
  }

  /**
   * Render preview for social media
   */
  async renderPreview(designData, dimensions) {
    // This would integrate with a rendering service
    // For now, return mock preview data
    return {
      url: '/api/preview/' + Math.random().toString(36),
      width: dimensions.width || dimensions.post?.width,
      height: dimensions.height || dimensions.post?.height,
      format: 'png'
    }
  }
}

// Base integration class
class BaseIntegration {
  async testConnection(credentials) {
    return { success: true }
  }

  async sync(credentials, config) {
    return { success: true, data: {} }
  }

  async getTemplates(credentials, filters) {
    return { success: true, templates: [] }
  }

  async importDesign(credentials, designId, options) {
    return { success: false, error: 'Import not implemented' }
  }

  async exportDesign(credentials, designData, options) {
    return { success: false, error: 'Export not implemented' }
  }

  async getInitialSyncData(credentials) {
    return { success: true, data: {} }
  }
}

// Canva Integration
class CanvaIntegration extends BaseIntegration {
  constructor() {
    super()
    this.apiBase = 'https://api.canva.com/v1'
  }

  async testConnection(credentials) {
    try {
      const response = await fetch(`${this.apiBase}/me`, {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`
        }
      })

      if (!response.ok) {
        return { success: false, error: 'Invalid Canva credentials' }
      }

      const userData = await response.json()
      return { success: true, user: userData }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async getTemplates(credentials, filters = {}) {
    try {
      const params = new URLSearchParams({
        query: filters.search || 'barbershop',
        category: filters.category || 'business',
        ...filters
      })

      const response = await fetch(`${this.apiBase}/designs/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch Canva templates')
      }

      const data = await response.json()
      const sixFigureAlignedTemplates = this.filterSixFigureTemplates(data.designs || [])

      return { 
        success: true, 
        templates: sixFigureAlignedTemplates.map(this.transformCanvaTemplate)
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async importDesign(credentials, designId, options = {}) {
    try {
      // Get design data from Canva
      const response = await fetch(`${this.apiBase}/designs/${designId}`, {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch Canva design')
      }

      const design = await response.json()

      // Transform Canva design to our format
      const transformedDesign = await this.transformCanvaDesignForImport(design, options)

      return { success: true, design: transformedDesign }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async exportDesign(credentials, designData, options = {}) {
    try {
      // Create design in Canva from our format
      const canvaDesignData = this.transformToCanvaFormat(designData)

      const response = await fetch(`${this.apiBase}/designs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(canvaDesignData)
      })

      if (!response.ok) {
        throw new Error('Failed to create Canva design')
      }

      const createdDesign = await response.json()
      
      return { 
        success: true, 
        designUrl: `https://www.canva.com/design/${createdDesign.id}/edit`,
        designId: createdDesign.id
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Filter templates based on Six Figure Barber methodology
   */
  filterSixFigureTemplates(templates) {
    return templates.filter(template => {
      const name = template.name?.toLowerCase() || ''
      const tags = template.tags?.join(' ').toLowerCase() || ''
      
      // Look for professional, premium, luxury keywords
      const professionalKeywords = [
        'professional', 'premium', 'luxury', 'executive', 
        'elegant', 'sophisticated', 'high-end', 'quality'
      ]
      
      const hasProKeywords = professionalKeywords.some(keyword => 
        name.includes(keyword) || tags.includes(keyword)
      )
      
      // Exclude overly casual or cheap-looking templates
      const casualKeywords = ['cheap', 'budget', 'basic', 'simple']
      const hasCasualKeywords = casualKeywords.some(keyword => 
        name.includes(keyword) || tags.includes(keyword)
      )
      
      return hasProKeywords && !hasCasualKeywords
    })
  }

  /**
   * Transform Canva template to our format
   */
  transformCanvaTemplate(template) {
    return {
      id: template.id,
      name: template.name || 'Untitled Template',
      description: template.description || 'Professional barbershop template',
      thumbnail: template.thumbnail?.url || '',
      category: this.mapCanvaCategory(template.category),
      sixFigureAlignment: {
        positioning: this.extractPositioning(template),
        suitableFor: this.extractSuitability(template),
        priceRange: 'premium'
      },
      source: 'canva',
      externalId: template.id
    }
  }

  /**
   * Transform Canva design for import
   */
  async transformCanvaDesignForImport(design, options) {
    return {
      id: design.id,
      name: design.name,
      elements: design.elements || [],
      colors: this.extractColors(design),
      fonts: this.extractFonts(design),
      layout: this.extractLayout(design),
      assets: design.assets || [],
      metadata: {
        source: 'canva',
        importDate: new Date().toISOString(),
        originalUrl: design.urls?.view_url
      }
    }
  }

  /**
   * Transform our design format to Canva format
   */
  transformToCanvaFormat(designData) {
    return {
      name: designData.name || 'Barbershop Design',
      width: designData.dimensions?.width || 1080,
      height: designData.dimensions?.height || 1080,
      elements: designData.elements?.map(this.transformElementToCanva) || [],
      background: designData.background || { color: '#FFFFFF' }
    }
  }

  transformElementToCanva(element) {
    return {
      type: element.type,
      position: element.position,
      dimensions: element.dimensions,
      properties: element.properties
    }
  }

  mapCanvaCategory(category) {
    const categoryMap = {
      'business': 'professional',
      'marketing': 'modern',
      'luxury': 'premium',
      'creative': 'urban'
    }
    return categoryMap[category] || 'modern'
  }

  extractPositioning(template) {
    const name = template.name?.toLowerCase() || ''
    if (name.includes('luxury') || name.includes('premium')) return 'Premium Service Provider'
    if (name.includes('professional')) return 'Professional Expert'
    if (name.includes('creative') || name.includes('artistic')) return 'Creative Specialist'
    return 'Modern Professional'
  }

  extractSuitability(template) {
    const tags = template.tags?.join(' ').toLowerCase() || ''
    const suitableFor = []
    
    if (tags.includes('corporate')) suitableFor.push('Corporate clients')
    if (tags.includes('luxury')) suitableFor.push('High-end clientele')
    if (tags.includes('creative')) suitableFor.push('Creative professionals')
    
    return suitableFor.length > 0 ? suitableFor : ['General professional clients']
  }

  extractColors(design) {
    // Extract color palette from Canva design
    const colors = []
    if (design.elements) {
      design.elements.forEach(element => {
        if (element.color) colors.push(element.color)
        if (element.fill) colors.push(element.fill)
      })
    }
    return [...new Set(colors)] // Remove duplicates
  }

  extractFonts(design) {
    const fonts = []
    if (design.elements) {
      design.elements.forEach(element => {
        if (element.font) fonts.push(element.font)
      })
    }
    return [...new Set(fonts)]
  }

  extractLayout(design) {
    return {
      width: design.width || 1080,
      height: design.height || 1080,
      orientation: (design.width > design.height) ? 'landscape' : 'portrait'
    }
  }
}

// Google My Business Integration
class GoogleMyBusinessIntegration extends BaseIntegration {
  constructor() {
    super()
    this.apiBase = 'https://mybusiness.googleapis.com/v4'
  }

  async testConnection(credentials) {
    try {
      const response = await fetch(`${this.apiBase}/accounts`, {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`
        }
      })

      if (!response.ok) {
        return { success: false, error: 'Invalid Google My Business credentials' }
      }

      const data = await response.json()
      return { success: true, accounts: data.accounts || [] }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async sync(credentials, config) {
    try {
      const businessData = await this.getBusinessProfile(credentials, config.locationId)
      const reviews = await this.getReviews(credentials, config.locationId)
      const insights = await this.getInsights(credentials, config.locationId)

      return {
        success: true,
        data: {
          profile: businessData,
          reviews,
          insights,
          lastSync: new Date().toISOString()
        }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async getBusinessProfile(credentials, locationId) {
    const response = await fetch(`${this.apiBase}/accounts/${locationId}`, {
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch business profile')
    }

    return await response.json()
  }

  async getReviews(credentials, locationId) {
    const response = await fetch(`${this.apiBase}/accounts/${locationId}/reviews`, {
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch reviews')
    }

    const data = await response.json()
    return data.reviews || []
  }

  async getInsights(credentials, locationId) {
    const response = await fetch(`${this.apiBase}/accounts/${locationId}/insights`, {
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch insights')
    }

    return await response.json()
  }

  async updateBusinessInfo(credentials, locationId, updates) {
    const response = await fetch(`${this.apiBase}/accounts/${locationId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })

    if (!response.ok) {
      throw new Error('Failed to update business info')
    }

    return await response.json()
  }
}

// Figma Integration
class FigmaIntegration extends BaseIntegration {
  constructor() {
    super()
    this.apiBase = 'https://api.figma.com/v1'
  }

  async testConnection(credentials) {
    try {
      const response = await fetch(`${this.apiBase}/me`, {
        headers: {
          'X-Figma-Token': credentials.accessToken
        }
      })

      if (!response.ok) {
        return { success: false, error: 'Invalid Figma credentials' }
      }

      const userData = await response.json()
      return { success: true, user: userData }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async getTemplates(credentials, filters = {}) {
    try {
      // Get user's team files
      const response = await fetch(`${this.apiBase}/teams/${credentials.teamId}/projects`, {
        headers: {
          'X-Figma-Token': credentials.accessToken
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch Figma projects')
      }

      const data = await response.json()
      // Filter for barbershop/business templates
      const relevantProjects = data.projects?.filter(project => 
        project.name.toLowerCase().includes('barbershop') ||
        project.name.toLowerCase().includes('business') ||
        project.name.toLowerCase().includes('salon')
      ) || []

      return { success: true, templates: relevantProjects }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

// Adobe Creative Integration
class AdobeCreativeIntegration extends BaseIntegration {
  constructor() {
    super()
    this.apiBase = 'https://cc-api-creative-sdk.adobe.io'
  }

  async testConnection(credentials) {
    try {
      const response = await fetch(`${this.apiBase}/v1/user`, {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`,
          'X-API-Key': credentials.clientId
        }
      })

      if (!response.ok) {
        return { success: false, error: 'Invalid Adobe credentials' }
      }

      const userData = await response.json()
      return { success: true, user: userData }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

// Export singleton instance
export const externalIntegrationsManager = new ExternalIntegrationsManager()
export default externalIntegrationsManager
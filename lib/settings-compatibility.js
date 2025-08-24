/**
 * Settings Compatibility Layer
 * 
 * Provides backward compatibility during the settings deduplication migration.
 * Ensures existing API endpoints and components continue working while gradually
 * transitioning to the new normalized schema.
 * 
 * This layer implements:
 * - Dual-read strategy (new schema first, fallback to old)
 * - Settings inheritance resolution (user → org → system)
 * - Compatibility mapping for legacy field names
 * - Transparent migration for existing code
 */

import { createClient } from '@/lib/supabase/client'

class SettingsCompatibilityLayer {
  constructor() {
    this.supabase = createClient()
    this.cache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5 minutes
  }

  /**
   * Get effective settings for a user/organization with proper inheritance
   * This is the main entry point for all settings queries
   */
  async getEffectiveSettings(userId, organizationId = null, category = null) {
    try {
      const cacheKey = `${userId}-${organizationId || 'null'}-${category || 'all'}`
      
      // Check cache first
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data
      }

      // Try new schema first (after migration)
      let effectiveSettings = await this.getFromNewSchema(userId, organizationId, category)
      
      // Fallback to old schema (during transition)
      if (!effectiveSettings || Object.keys(effectiveSettings).length === 0) {
        effectiveSettings = await this.getFromLegacySchema(userId, organizationId, category)
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: effectiveSettings,
        timestamp: Date.now()
      })

      return effectiveSettings
    } catch (error) {
      console.error('Settings compatibility layer error:', error)
      // Fallback to legacy schema on any error
      return await this.getFromLegacySchema(userId, organizationId, category)
    }
  }

  /**
   * Get settings from new normalized schema with inheritance
   */
  async getFromNewSchema(userId, organizationId = null, category = null) {
    try {
      const { data, error } = await this.supabase.rpc('get_effective_settings', {
        p_user_id: userId,
        p_organization_id: organizationId,
        p_category: category
      })

      if (error) {
        console.warn('New schema query failed:', error.message)
        return null
      }

      return data || {}
    } catch (error) {
      console.warn('New schema not available:', error.message)
      return null
    }
  }

  /**
   * Get settings from legacy schema (backward compatibility)
   */
  async getFromLegacySchema(userId, organizationId = null, category = null) {
    const settings = {}

    try {
      // Get user profile settings
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profile) {
        // Map legacy profile fields to new structure
        if (!category || category === 'notifications') {
          settings.notifications = {
            ...profile.notification_preferences,
            email_enabled: profile.email_notifications ?? true,
            sms_enabled: profile.sms_notifications ?? false,
            marketing_enabled: profile.marketing_notifications ?? false
          }
        }

        if (!category || category === 'appearance') {
          settings.appearance = {
            ...profile.appearance_settings,
            theme: profile.theme || 'professional',
            primary_color: profile.primary_color || '#6B7280'
          }
        }

        // Determine organization ID from profile
        const shopId = organizationId || profile.shop_id || profile.barbershop_id
        
        if (shopId) {
          // Get barbershop settings
          const { data: barbershop } = await this.supabase
            .from('barbershops')
            .select('*')
            .eq('id', shopId)
            .single()

          if (barbershop) {
            // Map legacy barbershop fields to new structure
            if (!category || category === 'business_info') {
              settings.business_info = {
                name: barbershop.name,
                description: barbershop.description,
                email: barbershop.email,
                phone: barbershop.phone,
                website: barbershop.website,
                address: {
                  street: barbershop.address,
                  city: barbershop.city,
                  state: barbershop.state,
                  zip_code: barbershop.zip_code,
                  country: barbershop.country || 'US'
                }
              }
            }

            if (!category || category === 'notifications') {
              settings.notifications = {
                ...settings.notifications,
                ...barbershop.notification_settings,
                business_notifications: barbershop.business_notifications ?? true
              }
            }

            if (!category || category === 'booking_preferences') {
              settings.booking_preferences = {
                ...barbershop.booking_settings,
                require_phone: barbershop.require_phone ?? true,
                allow_walk_ins: barbershop.allow_walk_ins ?? true,
                cancellation_policy: barbershop.cancellation_policy || '24_hours',
                booking_window_days: barbershop.booking_window_days || 30
              }
            }

            if (!category || category === 'integrations') {
              settings.integrations = {
                ...barbershop.integration_settings,
                google_calendar: barbershop.google_calendar_enabled ?? false,
                stripe_connect: barbershop.stripe_connect_enabled ?? false,
                sendgrid: barbershop.email_service_enabled ?? false
              }
            }
          }
        }
      }

      return settings
    } catch (error) {
      console.error('Legacy schema query failed:', error)
      return {}
    }
  }

  /**
   * Update settings with proper targeting (user vs organization level)
   */
  async updateSettings(userId, category, newSettings, organizationId = null) {
    try {
      // Try new schema first
      const newSchemaSuccess = await this.updateNewSchema(userId, category, newSettings, organizationId)
      
      if (newSchemaSuccess) {
        // Clear cache
        this.clearUserCache(userId)
        return { success: true, method: 'new_schema' }
      }

      // Fallback to legacy schema
      const legacySuccess = await this.updateLegacySchema(userId, category, newSettings, organizationId)
      
      if (legacySuccess) {
        this.clearUserCache(userId)
        return { success: true, method: 'legacy_schema' }
      }

      throw new Error('Both new and legacy schema updates failed')
    } catch (error) {
      console.error('Settings update failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Update settings in new normalized schema
   */
  async updateNewSchema(userId, category, newSettings, organizationId = null) {
    try {
      // Determine the appropriate context level
      const contextType = organizationId ? 'organization' : 'user'
      const contextId = organizationId || userId

      const { error } = await this.supabase
        .from('settings_hierarchy')
        .upsert({
          context_type: contextType,
          context_id: contextId,
          category: category,
          settings: newSettings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'context_type,context_id,category'
        })

      if (error) {
        console.warn('New schema update failed:', error.message)
        return false
      }

      return true
    } catch (error) {
      console.warn('New schema not available for updates:', error.message)
      return false
    }
  }

  /**
   * Update settings in legacy schema
   */
  async updateLegacySchema(userId, category, newSettings, organizationId = null) {
    try {
      let updateTarget = 'profiles'
      let updateData = {}
      let whereClause = { id: userId }

      // Route updates to appropriate legacy tables
      switch (category) {
        case 'notifications':
          updateData = {
            notification_preferences: newSettings,
            email_notifications: newSettings.email_enabled,
            sms_notifications: newSettings.sms_enabled,
            marketing_notifications: newSettings.marketing_enabled
          }
          break

        case 'appearance':
          updateData = {
            appearance_settings: newSettings,
            theme: newSettings.theme,
            primary_color: newSettings.primary_color
          }
          break

        case 'business_info':
          if (organizationId) {
            updateTarget = 'barbershops'
            whereClause = { id: organizationId }
            updateData = {
              name: newSettings.name,
              description: newSettings.description,
              email: newSettings.email,
              phone: newSettings.phone,
              website: newSettings.website,
              address: newSettings.address?.street,
              city: newSettings.address?.city,
              state: newSettings.address?.state,
              zip_code: newSettings.address?.zip_code,
              country: newSettings.address?.country
            }
          }
          break

        case 'booking_preferences':
          if (organizationId) {
            updateTarget = 'barbershops'
            whereClause = { id: organizationId }
            updateData = {
              booking_settings: newSettings,
              require_phone: newSettings.require_phone,
              allow_walk_ins: newSettings.allow_walk_ins,
              cancellation_policy: newSettings.cancellation_policy,
              booking_window_days: newSettings.booking_window_days
            }
          }
          break

        case 'integrations':
          if (organizationId) {
            updateTarget = 'barbershops'
            whereClause = { id: organizationId }
            updateData = {
              integration_settings: newSettings,
              google_calendar_enabled: newSettings.google_calendar,
              stripe_connect_enabled: newSettings.stripe_connect,
              email_service_enabled: newSettings.sendgrid
            }
          }
          break

        default:
          console.warn(`Unknown settings category: ${category}`)
          return false
      }

      if (Object.keys(updateData).length === 0) {
        return false
      }

      const { error } = await this.supabase
        .from(updateTarget)
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .match(whereClause)

      if (error) {
        console.error('Legacy schema update failed:', error.message)
        return false
      }

      return true
    } catch (error) {
      console.error('Legacy schema update error:', error)
      return false
    }
  }

  /**
   * Get organization information with backward compatibility
   */
  async getOrganizationInfo(organizationId) {
    try {
      // Try new schema first
      const { data: org, error: orgError } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single()

      if (org && !orgError) {
        // Transform new schema to expected format
        return {
          id: org.id,
          name: org.name,
          email: org.contact_info?.email,
          phone: org.contact_info?.phone,
          website: org.contact_info?.website,
          address: org.address?.street,
          city: org.address?.city,
          state: org.address?.state,
          zip_code: org.address?.zip_code,
          country: org.address?.country,
          description: org.settings?.description,
          business_hours: org.business_hours,
          settings: org.settings,
          is_active: org.is_active,
          created_at: org.created_at,
          updated_at: org.updated_at
        }
      }

      // Fallback to legacy barbershops table
      const { data: barbershop, error: barbershopError } = await this.supabase
        .from('barbershops')
        .select('*')
        .eq('id', organizationId)
        .single()

      if (barbershopError) {
        throw barbershopError
      }

      return barbershop
    } catch (error) {
      console.error('Organization info retrieval failed:', error)
      return null
    }
  }

  /**
   * Check if new schema is available and populated
   */
  async isNewSchemaAvailable() {
    try {
      const { count, error } = await this.supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })

      return !error && count > 0
    } catch (error) {
      return false
    }
  }

  /**
   * Clear cache for a specific user
   */
  clearUserCache(userId) {
    const keysToDelete = []
    for (const [key] of this.cache) {
      if (key.startsWith(`${userId}-`)) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.cache.clear()
  }
}

// Singleton instance
const settingsCompatibility = new SettingsCompatibilityLayer()

/**
 * Convenience functions for common use cases
 */

/**
 * Get user's notification preferences with inheritance
 */
export async function getUserNotificationSettings(userId, organizationId = null) {
  const settings = await settingsCompatibility.getEffectiveSettings(userId, organizationId, 'notifications')
  return settings.notifications || {}
}

/**
 * Get organization's business information
 */
export async function getBusinessInformation(userId, organizationId = null) {
  if (!organizationId) {
    // Get user's primary organization
    const settings = await settingsCompatibility.getEffectiveSettings(userId)
    organizationId = settings.organization_id
  }
  
  return await settingsCompatibility.getOrganizationInfo(organizationId)
}

/**
 * Get booking preferences with proper inheritance
 */
export async function getBookingPreferences(userId, organizationId = null) {
  const settings = await settingsCompatibility.getEffectiveSettings(userId, organizationId, 'booking_preferences')
  return settings.booking_preferences || {}
}

/**
 * Get integration settings
 */
export async function getIntegrationSettings(userId, organizationId = null) {
  const settings = await settingsCompatibility.getEffectiveSettings(userId, organizationId, 'integrations')
  return settings.integrations || {}
}

/**
 * Update user notification preferences
 */
export async function updateUserNotificationSettings(userId, newSettings, organizationId = null) {
  return await settingsCompatibility.updateSettings(userId, 'notifications', newSettings, organizationId)
}

/**
 * Update business information
 */
export async function updateBusinessInformation(userId, newInfo, organizationId) {
  return await settingsCompatibility.updateSettings(userId, 'business_info', newInfo, organizationId)
}

/**
 * Update booking preferences
 */
export async function updateBookingPreferences(userId, newPreferences, organizationId) {
  return await settingsCompatibility.updateSettings(userId, 'booking_preferences', newPreferences, organizationId)
}

/**
 * Update integration settings
 */
export async function updateIntegrationSettings(userId, newSettings, organizationId) {
  return await settingsCompatibility.updateSettings(userId, 'integrations', newSettings, organizationId)
}

/**
 * Check migration status
 */
export async function getMigrationStatus() {
  const isNewSchemaAvailable = await settingsCompatibility.isNewSchemaAvailable()
  
  return {
    new_schema_available: isNewSchemaAvailable,
    compatibility_layer_active: true,
    recommended_action: isNewSchemaAvailable 
      ? 'Gradually migrate UI components to use new schema'
      : 'Run settings migration when ready'
  }
}

export default settingsCompatibility